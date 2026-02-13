import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { userGeneratedStories } from '@/db/schema';
import type {
  StoryGenerationResponse,
  StoryOutput,
  WizardInput,
} from '../../../../types/story-builder';

export const runtime = 'nodejs';

const SAFE_REJECTION_MESSAGE = 'Let’s keep our story kind and original!';
const OPENAI_TIMEOUT_MS = 30000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const requestBuckets = new Map<string, RateLimitBucket>();
let userGeneratedStoriesTableReady = false;

const wizardInputSchema = z.object({
  target_age: z.number().int().min(3).max(13),
  story_length_minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  setting: z.string().min(2).max(200),
  main_character_name: z.string().min(1).max(200),
  main_character_type: z.string().min(2).max(200),
  main_character_traits: z.array(z.string().min(2).max(40)).min(2).max(3),
  supporting_character: z.string().max(200).optional().or(z.literal('')),
  goal_or_problem: z.string().min(5).max(200),
  tone: z.enum(['Cozy Bedtime', 'Funny', 'Adventure', 'Mystery-lite', 'Magical']),
  special_item_or_magic: z.string().max(200).optional().or(z.literal('')),
  ending_style: z.enum(['Happy', 'Heartwarming', 'Silly', 'Triumphant']),
});

const storyOutputSchema = z.object({
  version: z.literal(1),
  title: z.string().min(3).max(120),
  target_age: z.number().int().min(3).max(13),
  story_length_minutes: z.number().int().min(5).max(20),
  tone: z.string().min(2).max(60),
  setting: z.string().min(2).max(200),
  characters: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        type: z.string().min(2).max(80),
        traits: z.array(z.string().min(2).max(40)).min(1).max(5),
      })
    )
    .min(1)
    .max(5),
  story: z.object({
    paragraphs: z.array(z.string().min(20).max(1400)).min(3).max(20),
  }),
});

const outputJsonSchema = {
  name: 'taletime_story_output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      version: { type: 'integer', const: 1 },
      title: { type: 'string', minLength: 3, maxLength: 120 },
      target_age: { type: 'integer', minimum: 3, maximum: 13 },
      story_length_minutes: { type: 'integer', minimum: 5, maximum: 20 },
      tone: { type: 'string', minLength: 2, maxLength: 60 },
      setting: { type: 'string', minLength: 2, maxLength: 200 },
      characters: {
        type: 'array',
        minItems: 1,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 80 },
            type: { type: 'string', minLength: 2, maxLength: 80 },
            traits: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: { type: 'string', minLength: 2, maxLength: 40 },
            },
          },
          required: ['name', 'type', 'traits'],
        },
      },
      story: {
        type: 'object',
        additionalProperties: false,
        properties: {
          paragraphs: {
            type: 'array',
            minItems: 3,
            maxItems: 20,
            items: { type: 'string', minLength: 20, maxLength: 1400 },
          },
        },
        required: ['paragraphs'],
      },
    },
    required: [
      'version',
      'title',
      'target_age',
      'story_length_minutes',
      'tone',
      'setting',
      'characters',
      'story',
    ],
  },
};

function sanitizeText(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function sanitizeInput(input: z.infer<typeof wizardInputSchema>): WizardInput {
  return {
    target_age: input.target_age,
    story_length_minutes: input.story_length_minutes,
    setting: sanitizeText(input.setting),
    main_character_name: sanitizeText(input.main_character_name),
    main_character_type: sanitizeText(input.main_character_type),
    main_character_traits: input.main_character_traits.map((trait) =>
      sanitizeText(trait).slice(0, 40)
    ),
    supporting_character: input.supporting_character ? sanitizeText(input.supporting_character) : undefined,
    goal_or_problem: sanitizeText(input.goal_or_problem),
    tone: input.tone,
    special_item_or_magic: input.special_item_or_magic ? sanitizeText(input.special_item_or_magic) : undefined,
    ending_style: input.ending_style,
  };
}

function containsUnsafeContent(input: WizardInput): boolean {
  const corpus = [
    input.setting,
    input.main_character_name,
    input.main_character_type,
    ...input.main_character_traits,
    input.supporting_character || '',
    input.goal_or_problem,
    input.special_item_or_magic || '',
  ]
    .join(' ')
    .toLowerCase();

  const piiPatterns = [
    /\b\d{3}[-.\s]?\d{2,3}[-.\s]?\d{4}\b/i,
    /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i,
    /\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|lane|ln\.?|drive|dr\.?)\b/i,
  ];

  const unsafePatterns = [
    /\b(kill|murder|blood|gore|torture|weapon|gun|knife|suicide|abuse)\b/i,
    /\b(sex|sexy|nude|naked|porn|romantic night|fetish)\b/i,
    /\b(disney|marvel|pokemon|harry potter|spider[- ]?man|elsa|batman|superman|star wars)\b/i,
  ];

  return [...piiPatterns, ...unsafePatterns].some((pattern) => pattern.test(corpus));
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const sessionId = request.cookies.get('session')?.value ?? request.cookies.get('session_id')?.value;
  return sessionId || forwardedFor || realIp || 'unknown-client';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const current = requestBuckets.get(clientId);

  if (!current || now > current.resetAt) {
    requestBuckets.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  requestBuckets.set(clientId, current);
  return current.count > RATE_LIMIT_MAX;
}

function cleanExpiredRateLimitBuckets(): void {
  const now = Date.now();
  for (const [key, value] of requestBuckets.entries()) {
    if (value.resetAt <= now) {
      requestBuckets.delete(key);
    }
  }
}

function createCacheKey(input: WizardInput): string {
  const canonical = JSON.stringify({
    target_age: input.target_age,
    story_length_minutes: input.story_length_minutes,
    setting: input.setting,
    main_character_name: input.main_character_name,
    main_character_type: input.main_character_type,
    main_character_traits: input.main_character_traits,
    supporting_character: input.supporting_character || '',
    goal_or_problem: input.goal_or_problem,
    tone: input.tone,
    special_item_or_magic: input.special_item_or_magic || '',
    ending_style: input.ending_style,
  });

  return createHash('sha256').update(canonical).digest('hex');
}

async function callOpenAI(input: WizardInput): Promise<StoryOutput> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_SECRET_KEY;
  if (!apiKey) {
    throw new Error('OpenAI is not configured. Add OPENAI_API_KEY to .env.local and restart yarn dev.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'You are Ollie the Owl, a kind bedtime story wizard for kids. Produce safe, original, age-appropriate stories only.',
          },
          {
            role: 'developer',
            content:
              'Return only strict JSON matching the provided schema. No markdown, no code blocks, no prose outside JSON. Keep language warm and child-safe. Avoid copyrighted characters and avoid personal data.',
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: outputJsonSchema,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `OpenAI error: ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty content.');
    }

    const parsed = JSON.parse(content);
    return storyOutputSchema.parse(parsed);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Story generation timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function failureResponse(status: number, error: string) {
  return NextResponse.json<StoryGenerationResponse>(
    {
      ok: false,
      error,
    },
    { status }
  );
}

async function ensureUserGeneratedStoriesTable(): Promise<void> {
  if (userGeneratedStoriesTableReady) return;

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user_generated_stories (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      cache_key text NOT NULL,
      metadata_json text NOT NULL,
      story_json text NOT NULL,
      created_at integer NOT NULL
    )
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS user_generated_stories_cache_key_unique
    ON user_generated_stories (cache_key)
  `);

  userGeneratedStoriesTableReady = true;
}

export async function POST(request: NextRequest) {
  cleanExpiredRateLimitBuckets();

  const clientId = getClientIdentifier(request);
  if (isRateLimited(clientId)) {
    return failureResponse(429, 'Too many requests. Please try again in a minute.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failureResponse(400, 'Invalid JSON request body.');
  }

  const parsedInput = wizardInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return failureResponse(400, 'Invalid story options.');
  }

  const sanitizedInput = sanitizeInput(parsedInput.data);

  if (containsUnsafeContent(sanitizedInput)) {
    return failureResponse(400, SAFE_REJECTION_MESSAGE);
  }

  const cacheKey = createCacheKey(sanitizedInput);

  // ---------------------------------------
  // MOCK MODE (Free testing without OpenAI)
  // Enable with:
  //   MOCK_STORY_BUILDER=true
  // in .env.local
  // ---------------------------------------
  const useMock =
    process.env.MOCK_STORY_BUILDER === 'true' ||
    (process.env.NODE_ENV === 'development' &&
      !process.env.OPENAI_API_KEY &&
      !process.env.OPENAI_KEY &&
      !process.env.OPENAI_SECRET_KEY);

  if (useMock) {
    const hero = {
      name: sanitizedInput.main_character_name,
      type: sanitizedInput.main_character_type,
      traits: sanitizedInput.main_character_traits,
    };

    const wordTarget =
      sanitizedInput.story_length_minutes === 5
        ? 800
        : sanitizedInput.story_length_minutes === 10
        ? 1600
        : 2400;

    const baseParagraphs = [
      `Welcome to ${sanitizedInput.setting}. The adventure begins gently.`,
      `${hero.name} was a ${hero.type} who was ${hero.traits.join(', ')}.`,
      `One day, ${sanitizedInput.goal_or_problem}.`,
      sanitizedInput.special_item_or_magic
        ? `Luckily, there was something special: ${sanitizedInput.special_item_or_magic}.`
        : `Luckily, there was a small clue nearby.`,
      `Step by step, they tried safe and kind solutions.`,
      sanitizedInput.ending_style === 'Happy'
        ? `In the end, everything turned out happily.`
        : sanitizedInput.ending_style === 'Heartwarming'
        ? `In the end, kindness made all the difference.`
        : sanitizedInput.ending_style === 'Silly'
        ? `In the end, everyone laughed together.`
        : `In the end, they felt proud and brave.`,
      `And so the adventure ended softly.`,
    ].filter(Boolean);

    while (baseParagraphs.join(' ').split(/\s+/).length < wordTarget) {
      baseParagraphs.splice(
        baseParagraphs.length - 2,
        0,
        `Along the way, something gentle and surprising happened, but it was handled with courage and care.`
      );
    }

    const mockStory: StoryOutput = {
      version: 1,
      title: `${hero.name}'s Adventure in ${sanitizedInput.setting}`.slice(0, 100),
      target_age: sanitizedInput.target_age,
      story_length_minutes: sanitizedInput.story_length_minutes,
      tone: sanitizedInput.tone,
      setting: sanitizedInput.setting,
      characters: [hero],
      story: {
        paragraphs: baseParagraphs.slice(0, 20),
      },
    };

    return NextResponse.json<StoryGenerationResponse>({
      ok: true,
      fromCache: false,
      cacheKey,
      story: mockStory,
    });
  }

  try {
    await ensureUserGeneratedStoriesTable();

    const cachedRows = await db
      .select({
        storyJson: userGeneratedStories.storyJson,
      })
      .from(userGeneratedStories)
      .where(eq(userGeneratedStories.cacheKey, cacheKey))
      .limit(1);

    if (cachedRows.length > 0) {
      try {
        const cachedStory = storyOutputSchema.parse(JSON.parse(cachedRows[0].storyJson));
        return NextResponse.json<StoryGenerationResponse>({
          ok: true,
          fromCache: true,
          cacheKey,
          story: cachedStory,
        });
      } catch {
        // If cache is corrupted, regenerate and overwrite.
      }
    }

    const story = await callOpenAI(sanitizedInput);

    await db
      .insert(userGeneratedStories)
      .values({
        cacheKey,
        metadataJson: JSON.stringify(sanitizedInput),
        storyJson: JSON.stringify(story),
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: userGeneratedStories.cacheKey,
        set: {
          metadataJson: JSON.stringify(sanitizedInput),
          storyJson: JSON.stringify(story),
          createdAt: Date.now(),
        },
      });

    return NextResponse.json<StoryGenerationResponse>({
      ok: true,
      fromCache: false,
      cacheKey,
      story,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate story.';
    return failureResponse(500, message);
  }
}

export async function GET() {
  return failureResponse(405, 'Method Not Allowed');
}
