import type { StoryOutput, WizardInput } from '../../types/story-builder';

const SAFE_REJECTION_MESSAGE = 'Let’s keep our story kind and original!';

function sanitizeText(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function sanitizeInput(input: WizardInput): WizardInput {
  return {
    target_age: Math.min(13, Math.max(3, Math.round(input.target_age))),
    story_length_minutes: input.story_length_minutes,
    setting: sanitizeText(input.setting),
    main_character_name: sanitizeText(input.main_character_name),
    main_character_type: sanitizeText(input.main_character_type),
    main_character_traits: input.main_character_traits
      .map((trait) => sanitizeText(trait).slice(0, 40))
      .filter(Boolean)
      .slice(0, 3),
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

  let hash = 5381;
  for (let i = 0; i < canonical.length; i += 1) {
    hash = (hash * 33) ^ canonical.charCodeAt(i);
  }
  return `local-${(hash >>> 0).toString(16)}`;
}

export type LocalStoryBuildResult =
  | { ok: true; cacheKey: string; story: StoryOutput }
  | { ok: false; error: string };

export function buildLocalStory(rawInput: WizardInput): LocalStoryBuildResult {
  const input = sanitizeInput(rawInput);

  if (input.main_character_traits.length < 2) {
    return { ok: false, error: 'Please choose at least 2 character traits.' };
  }

  if (containsUnsafeContent(input)) {
    return { ok: false, error: SAFE_REJECTION_MESSAGE };
  }

  const hero = {
    name: input.main_character_name,
    type: input.main_character_type,
    traits: input.main_character_traits,
  };

  const wordTarget = input.story_length_minutes === 5 ? 800 : input.story_length_minutes === 10 ? 1600 : 2400;

  const baseParagraphs = [
    `Welcome to ${input.setting}. The adventure begins gently.`,
    `${hero.name} was a ${hero.type} who was ${hero.traits.join(', ')}.`,
    `One day, ${input.goal_or_problem}.`,
    input.special_item_or_magic
      ? `Luckily, there was something special: ${input.special_item_or_magic}.`
      : 'Luckily, there was a small clue nearby.',
    'Step by step, they tried safe and kind solutions.',
    input.ending_style === 'Happy'
      ? 'In the end, everything turned out happily.'
      : input.ending_style === 'Heartwarming'
      ? 'In the end, kindness made all the difference.'
      : input.ending_style === 'Silly'
      ? 'In the end, everyone laughed together.'
      : 'In the end, they felt proud and brave.',
    'And so the adventure ended softly.',
  ];

  while (baseParagraphs.join(' ').split(/\s+/).length < wordTarget) {
    baseParagraphs.splice(
      baseParagraphs.length - 2,
      0,
      'Along the way, something gentle and surprising happened, but it was handled with courage and care.'
    );
  }

  const story: StoryOutput = {
    version: 1,
    title: `${hero.name}'s Adventure in ${input.setting}`.slice(0, 100),
    target_age: input.target_age,
    story_length_minutes: input.story_length_minutes,
    tone: input.tone,
    setting: input.setting,
    characters: [hero],
    story: {
      paragraphs: baseParagraphs.slice(0, 20),
    },
  };

  return {
    ok: true,
    cacheKey: createCacheKey(input),
    story,
  };
}