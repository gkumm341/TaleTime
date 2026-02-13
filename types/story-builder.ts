export const STORY_LENGTH_OPTIONS = [5, 10, 15] as const;
export const TONE_OPTIONS = ['Cozy Bedtime', 'Funny', 'Adventure', 'Mystery-lite', 'Magical'] as const;
export const ENDING_STYLE_OPTIONS = ['Happy', 'Heartwarming', 'Silly', 'Triumphant'] as const;

export interface WizardInput {
  target_age: number;
  story_length_minutes: (typeof STORY_LENGTH_OPTIONS)[number];
  setting: string;
  main_character_name: string;
  main_character_type: string;
  main_character_traits: string[];
  supporting_character?: string;
  goal_or_problem: string;
  tone: (typeof TONE_OPTIONS)[number];
  special_item_or_magic?: string;
  ending_style: (typeof ENDING_STYLE_OPTIONS)[number];
}

export interface StoryCharacter {
  name: string;
  type: string;
  traits: string[];
}

export interface StoryOutput {
  version: 1;
  title: string;
  target_age: number;
  story_length_minutes: number;
  tone: string;
  setting: string;
  characters: StoryCharacter[];
  story: {
    paragraphs: string[];
  };
}

export interface StoryGenerationSuccessResponse {
  ok: true;
  fromCache: boolean;
  cacheKey: string;
  story: StoryOutput;
}

export interface StoryGenerationErrorResponse {
  ok: false;
  error: string;
}

export type StoryGenerationResponse = StoryGenerationSuccessResponse | StoryGenerationErrorResponse;
