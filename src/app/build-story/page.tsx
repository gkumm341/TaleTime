'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Moon,
  Stars,
  Wand2,
  Heart,
  Laugh,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { StoryGenerationResponse, WizardInput } from '../../../types/story-builder';
import { Sidebar } from '@/components/Sidebar';

const OWL_MESSAGES = [
  'Hoo-hoo… welcome, little storyteller. Let’s make something cozy.',
  'Lovely choice. Your story is beginning to glow…',
  'Ollie is listening carefully… tell me more.',
  'Wonderful! One more step and your adventure will be ready.',
];

const AGE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const LENGTH_OPTIONS: WizardInput['story_length_minutes'][] = [5, 10, 15];

const SETTING_OPTIONS = [
  'Enchanted Forest',
  'Cloud Castle',
  'Cozy Village',
  'Moonlit Beach',
  'Snowy Mountain',
  'Secret Garden',
  'Underwater Kingdom',
  'Friendly Space Station',
];

const CHARACTER_TYPES = ['Child', 'Fox', 'Bear', 'Rabbit', 'Dragon', 'Owl', 'Cat', 'Robot'];

const CHARACTER_TRAITS = [
  'Brave',
  'Curious',
  'Kind',
  'Funny',
  'Gentle',
  'Creative',
  'Helpful',
  'Patient',
];

const GOAL_OPTIONS = [
  'Find a missing star',
  'Help a friend feel better',
  'Deliver a special gift',
  'Solve a tiny mystery',
  'Learn to try again',
  'Work together as a team',
];

const TONE_OPTIONS: WizardInput['tone'][] = ['Cozy Bedtime', 'Funny', 'Adventure', 'Mystery-lite', 'Magical'];
const ENDING_OPTIONS: WizardInput['ending_style'][] = ['Happy', 'Heartwarming', 'Silly', 'Triumphant'];

const INITIAL_INPUT: WizardInput = {
  target_age: 6,
  story_length_minutes: 10,
  setting: '',
  main_character_name: '',
  main_character_type: '',
  main_character_traits: [],
  supporting_character: '',
  goal_or_problem: '',
  tone: 'Cozy Bedtime',
  special_item_or_magic: '',
  ending_style: 'Happy',
};

type StepId =
  | 'target_age'
  | 'story_length_minutes'
  | 'setting'
  | 'main_character_name'
  | 'main_character_type'
  | 'main_character_traits'
  | 'supporting_character'
  | 'goal_or_problem'
  | 'tone'
  | 'special_item_or_magic'
  | 'ending_style';

const STEPS: StepId[] = [
  'target_age',
  'story_length_minutes',
  'setting',
  'main_character_name',
  'main_character_type',
  'main_character_traits',
  'supporting_character',
  'goal_or_problem',
  'tone',
  'special_item_or_magic',
  'ending_style',
];

const STEP_TITLES: Record<StepId, string> = {
  target_age: 'Who is this story for?',
  story_length_minutes: 'How long should it be?',
  setting: 'Where does your story happen?',
  main_character_name: 'What is your hero’s name?',
  main_character_type: 'What kind of character are they?',
  main_character_traits: 'Choose 2–3 personality traits',
  supporting_character: 'Optional friend or helper?',
  goal_or_problem: 'What should your hero do?',
  tone: 'Pick your story style',
  special_item_or_magic: 'Optional special item or magic?',
  ending_style: 'How should it end?',
};

function iconForTone(tone: WizardInput['tone']) {
  switch (tone) {
    case 'Cozy Bedtime':
      return <Moon className="h-4 w-4" />;
    case 'Funny':
      return <Laugh className="h-4 w-4" />;
    case 'Adventure':
      return <Compass className="h-4 w-4" />;
    case 'Mystery-lite':
      return <Stars className="h-4 w-4" />;
    case 'Magical':
      return <Wand2 className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

function iconForEnding(ending: WizardInput['ending_style']) {
  switch (ending) {
    case 'Heartwarming':
      return <Heart className="h-4 w-4" />;
    case 'Silly':
      return <Laugh className="h-4 w-4" />;
    case 'Triumphant':
      return <Sparkles className="h-4 w-4" />;
    case 'Happy':
    default:
      return <Stars className="h-4 w-4" />;
  }
}

function SelectableCard({
  label,
  selected,
  onClick,
  icon,
  hint,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group w-full rounded-tt border px-4 py-4 text-left transition-all',
        'bg-white/70 backdrop-blur-sm',
        selected
          ? 'border-tt-accent/70 bg-tt-accent/10 shadow-tt'
          : 'border-tt-border/40 hover:border-tt-accent/40 hover:bg-white/85',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            'mt-0.5 flex h-9 w-9 items-center justify-center rounded-tt border',
            selected
              ? 'border-tt-accent/60 bg-tt-accent/15 text-tt-accent'
              : 'border-tt-border/40 bg-white text-tt-muted group-hover:text-tt-primary',
          ].join(' ')}
          aria-hidden
        >
          {icon ?? <Sparkles className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-tt-primary">{label}</div>
          {hint ? <div className="mt-1 text-sm text-tt-muted">{hint}</div> : null}
        </div>

        <div
          className={[
            'mt-1 h-5 w-5 rounded-full border',
            selected ? 'border-tt-accent bg-tt-accent/20' : 'border-tt-border/40 bg-white',
          ].join(' ')}
          aria-hidden
        />
      </div>
    </button>
  );
}

function CozyInput({
  value,
  onChange,
  placeholder,
  maxLength = 200,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <div className="rounded-tt border border-tt-border/40 bg-white/70 px-4 py-3 backdrop-blur-sm">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        className="w-full bg-transparent text-base text-tt-primary placeholder:text-tt-muted/80 focus:outline-none"
        maxLength={maxLength}
      />
    </div>
  );
}

export default function BuildStoryPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [input, setInput] = useState<WizardInput>(INITIAL_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const canGoBack = stepIndex > 0 && !loading;

  const owlMessage = useMemo(() => OWL_MESSAGES[stepIndex % OWL_MESSAGES.length], [stepIndex]);
  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);

  const setField = useCallback(<K extends keyof WizardInput>(key: K, value: WizardInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'target_age':
        return input.target_age >= 3 && input.target_age <= 13;
      case 'story_length_minutes':
        return LENGTH_OPTIONS.includes(input.story_length_minutes);
      case 'setting':
        return input.setting.trim().length >= 2;
      case 'main_character_name':
        return input.main_character_name.trim().length >= 1;
      case 'main_character_type':
        return input.main_character_type.trim().length >= 2;
      case 'main_character_traits':
        return input.main_character_traits.length >= 2 && input.main_character_traits.length <= 3;
      case 'supporting_character':
        return true;
      case 'goal_or_problem':
        return input.goal_or_problem.trim().length >= 5;
      case 'tone':
        return TONE_OPTIONS.includes(input.tone);
      case 'special_item_or_magic':
        return true;
      case 'ending_style':
        return ENDING_OPTIONS.includes(input.ending_style);
      default:
        return false;
    }
  }, [input, step]);

  const onNext = useCallback(() => {
    if (!canContinue || loading) return;
    if (stepIndex < STEPS.length - 1) setStepIndex((prev) => prev + 1);
  }, [canContinue, loading, stepIndex]);

  const onBack = useCallback(() => {
    if (!canGoBack) return;
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, [canGoBack]);

  const toggleTrait = useCallback((trait: string) => {
    setInput((prev) => {
      const exists = prev.main_character_traits.includes(trait);
      if (exists) {
        return { ...prev, main_character_traits: prev.main_character_traits.filter((item) => item !== trait) };
      }
      if (prev.main_character_traits.length >= 3) {
        return prev;
      }
      return { ...prev, main_character_traits: [...prev.main_character_traits, trait] };
    });
    setError(null);
  }, []);

  const createStory = useCallback(async () => {
    if (!canContinue || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const raw = await response.text();
      let data: StoryGenerationResponse | null = null;
      try {
        data = JSON.parse(raw) as StoryGenerationResponse;
      } catch {
        data = null;
      }

      if (!response.ok || !data || !data.ok) {
        const fallback = raw.trim().slice(0, 240);
        const message =
          data && !data.ok ? data.error : fallback || `Request failed with status ${response.status}`;
        setError(message);
        setLoading(false);
        return;
      }

      const storageKey = `taletime-generated-story:${data.cacheKey}`;
      sessionStorage.setItem(storageKey, JSON.stringify(data.story));
      router.push(`/build-story/read?generated=${encodeURIComponent(data.cacheKey)}`);
    } catch {
      setError('Network issue. Please try again.');
      setLoading(false);
    }
  }, [canContinue, input, loading, router]);

  return (
    <main className="min-h-screen px-4 py-10">
      {/* Cozy background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tt-secondary/45 via-white to-tt-secondary/55" />
        <motion.div
          className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-tt-accent/10 blur-3xl"
          animate={{ y: [0, 10, 0], opacity: [0.6, 0.8, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-140px] right-[-140px] h-[520px] w-[520px] rounded-full bg-tt-tertiary/10 blur-3xl"
          animate={{ x: [0, -12, 0], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <Sidebar />

      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Owl bubble header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-tt border border-tt-border/30 bg-white/65 p-4 shadow-tt backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ y: [0, -4, 0], rotate: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
              className="text-4xl"
              aria-hidden
            >
              🦉
            </motion.div>

            <div className="flex-1">
              <div className="inline-block rounded-tt border border-tt-border/30 bg-white/80 px-4 py-3 text-sm font-medium text-tt-primary shadow-sm">
                {loading ? 'Hoo-hoo… writing your adventure…' : owlMessage}
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-tt-muted">
                  <span className="font-medium">{STEP_TITLES[step]}</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-tt-border/30">
                  <motion.div
                    className="h-2 rounded-full bg-tt-accent/60"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-tt-muted">
              <Sparkles className="h-4 w-4 text-tt-tertiary" />
              <span className="text-xs font-semibold">
                {stepIndex + 1}/{STEPS.length}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main card */}
        <Card className="border-tt-border/30 bg-white/70 shadow-tt backdrop-blur-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-tt-primary">
                {STEP_TITLES[step]}
              </h1>
              <p className="text-sm text-tt-muted">
                Choose what feels right — we’ll keep it cozy and fun.
              </p>
            </div>

            {/* Steps */}
            {step === 'target_age' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {AGE_OPTIONS.map((age) => (
                  <SelectableCard
                    key={age}
                    label={`Age ${age}`}
                    selected={input.target_age === age}
                    onClick={() => setField('target_age', age)}
                  />
                ))}
              </div>
            )}

            {step === 'story_length_minutes' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {LENGTH_OPTIONS.map((minutes) => (
                  <SelectableCard
                    key={minutes}
                    label={`${minutes} minutes`}
                    selected={input.story_length_minutes === minutes}
                    onClick={() => setField('story_length_minutes', minutes)}
                    icon={<Moon className="h-4 w-4" />}
                    hint={minutes === 5 ? 'Quick & sweet' : minutes === 10 ? 'Just right' : 'A longer adventure'}
                  />
                ))}
              </div>
            )}

            {step === 'setting' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SETTING_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option}
                    label={option}
                    selected={input.setting === option}
                    onClick={() => setField('setting', option)}
                    icon={<Stars className="h-4 w-4" />}
                  />
                ))}
              </div>
            )}

            {step === 'main_character_name' && (
              <CozyInput
                value={input.main_character_name}
                onChange={(v) => setField('main_character_name', v)}
                placeholder="Example: Luna"
              />
            )}

            {step === 'main_character_type' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CHARACTER_TYPES.map((type) => (
                  <SelectableCard
                    key={type}
                    label={type}
                    selected={input.main_character_type === type}
                    onClick={() => setField('main_character_type', type)}
                    icon={<Sparkles className="h-4 w-4" />}
                  />
                ))}
              </div>
            )}

            {step === 'main_character_traits' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-tt-muted">
                  <span className="font-medium">Pick {input.main_character_traits.length}/3</span>
                  <span className="text-xs">Choose at least 2</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CHARACTER_TRAITS.map((trait) => (
                    <SelectableCard
                      key={trait}
                      label={trait}
                      selected={input.main_character_traits.includes(trait)}
                      onClick={() => toggleTrait(trait)}
                      icon={<Heart className="h-4 w-4" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 'supporting_character' && (
              <CozyInput
                value={input.supporting_character || ''}
                onChange={(v) => setField('supporting_character', v)}
                placeholder="Optional: Miko the turtle"
              />
            )}

            {step === 'goal_or_problem' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {GOAL_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option}
                    label={option}
                    selected={input.goal_or_problem === option}
                    onClick={() => setField('goal_or_problem', option)}
                    icon={<Compass className="h-4 w-4" />}
                  />
                ))}
              </div>
            )}

            {step === 'tone' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TONE_OPTIONS.map((tone) => (
                  <SelectableCard
                    key={tone}
                    label={tone}
                    selected={input.tone === tone}
                    onClick={() => setField('tone', tone)}
                    icon={iconForTone(tone)}
                    hint={tone === 'Cozy Bedtime' ? 'Soft & calm' : tone === 'Funny' ? 'Giggles' : tone === 'Adventure' ? 'Exciting' : tone === 'Mystery-lite' ? 'Curious' : 'Sparkly'}
                  />
                ))}
              </div>
            )}

            {step === 'special_item_or_magic' && (
              <CozyInput
                value={input.special_item_or_magic || ''}
                onChange={(v) => setField('special_item_or_magic', v)}
                placeholder="Optional: a glowing feather"
              />
            )}

            {step === 'ending_style' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ENDING_OPTIONS.map((ending) => (
                  <SelectableCard
                    key={ending}
                    label={ending}
                    selected={input.ending_style === ending}
                    onClick={() => setField('ending_style', ending)}
                    icon={iconForEnding(ending)}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-tt border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Footer controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onBack} disabled={!canGoBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {stepIndex === STEPS.length - 1 ? (
                <Button type="button" onClick={createStory} disabled={!canContinue || loading}>
                  {loading ? (
                    <>
                      <motion.span
                        className="mr-2 inline-block"
                        animate={{ rotate: [0, 8, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        aria-hidden
                      >
                        ✨
                      </motion.span>
                      Creating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create My Story
                    </>
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={onNext} disabled={!canContinue || loading}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Cozy hint */}
            <div className="text-center text-xs text-tt-muted">
              Tip: Pick <span className="font-semibold">Cozy Bedtime</span> for a gentle story perfect before sleep.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
