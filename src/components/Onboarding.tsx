import { useRef, useState, type ReactNode } from 'react'
import {
  PROGRAM_FILES,
  joinProgram,
  programTooLong,
  readProgramFiles,
  requestPlan,
  toRecords,
  type ProgramFile,
} from '../lib/aiPlan'
import { parseBackup } from '../lib/backup'
import { MAX_NOTES_CHARS, MAX_PROGRAM_CHARS, QUESTIONS, type GeneratedPlan, type Preferences } from '../lib/planSchema'
import { PRESETS } from '../lib/presets'
import type { Entry, Group, Tracker } from '../lib/types'
import { useTurnstile } from '../lib/turnstile'
import type { UnitSystem } from '../lib/units'
import { ArrowIcon } from './icons'
import { Button, ErrorNote, Label, Tag } from './ui'

type Records = { groups: Group[]; trackers: Tracker[] }
type Step = 'choose' | 'import' | 'quiz' | 'preview'

/**
 * Builds a starting plan with AI from a pasted or dropped program, a short
 * quiz, free-form notes, or any mix. Only ever shown on an empty plan — a new
 * one means clearing the old first — so using a plan never has anything to
 * replace or merge with.
 */
export function Onboarding({
  system,
  onUse,
  onRestore,
  onClose,
}: {
  system: UnitSystem
  /** Writes the generated plan as the whole plan. */
  onUse: (records: Records) => Promise<void>
  /** Swaps in a backup whole — plan and logged history. */
  onRestore: (data: Records & { entries: Entry[] }) => Promise<void>
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>('choose')
  const [source, setSource] = useState<'import' | 'quiz'>('import')
  const [pasted, setPasted] = useState('')
  const [files, setFiles] = useState<ProgramFile[]>([])
  const [preferences, setPreferences] = useState<Preferences>({})
  const [notes, setNotes] = useState('')
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const challenge = useRef<HTMLDivElement>(null)
  const human = useTurnstile(challenge)

  const program = source === 'import' ? joinProgram(pasted, files) : ''
  const answered = Object.values(preferences).some(Boolean)
  const canGenerate = Boolean(program || notes.trim() || (source === 'quiz' && answered))

  const open = (next: 'import' | 'quiz') => {
    setSource(next)
    setStep(next)
    setError(null)
  }

  const addFiles = async (chosen: Iterable<File>) => {
    const { read, skipped } = await readProgramFiles(chosen)
    setFiles((prev) => [...prev, ...read])
    setError(skipped.length ? `Too large to be a program: ${skipped.join(', ')}` : null)
  }

  /** Nothing to replace on an empty plan, so no confirmation. Same checks as the menu's import. */
  const restoreBackup = async (chosen: File) => {
    const result = parseBackup(await chosen.text())
    if ('error' in result) {
      setError(result.error)
      return
    }
    const { groups, trackers, entries } = result.data
    await onRestore({ groups, trackers, entries })
    onClose()
  }

  const generate = async () => {
    if (programTooLong(program)) {
      setError(
        `That program is ${program.length.toLocaleString()} characters; the limit is ${MAX_PROGRAM_CHARS.toLocaleString()}. Trim it to the plan itself and try again.`,
      )
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await requestPlan({
        program: program || undefined,
        preferences: source === 'quiz' ? preferences : undefined,
        notes: notes.trim() || undefined,
        units: system,
        turnstileToken: human.consume() ?? undefined,
      })
      if (toRecords(result).groups.length === 0) throw new Error('No plan came back. Add a little more detail and try again.')
      setPlan(result)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The plan builder failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const use = async () => {
    if (!plan) return
    await onUse(toRecords(plan))
    onClose()
  }

  const notesField = (label: string, placeholder: string, rows = 3) => (
    <label className="block">
      <Label>{label}</Label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={rows}
        maxLength={MAX_NOTES_CHARS}
        placeholder={placeholder}
        className="w-full border-2 border-ink bg-paper p-3 text-sm placeholder:text-ink/40"
      />
    </label>
  )

  const footer = (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}
      {human.failed && (
        <ErrorNote>Could not load the check that keeps bots out. Check your connection and reopen the builder.</ErrorNote>
      )}
      <Button
        variant="solid"
        size="lg"
        className="w-full"
        disabled={!canGenerate || loading || !human.ready}
        onClick={generate}
      >
        {loading ? 'Building your plan…' : human.ready ? 'Build my plan' : 'Checking you are human…'}
      </Button>
      <p className="text-xs text-ink/50">
        What you enter here is sent to OpenAI to write the plan, and is not stored. Your log never leaves this device.
      </p>
    </div>
  )

  return (
    <section className="space-y-6" aria-label="Build a plan">
      {step === 'choose' && (
        // Fills the space under the header — its height, the page's top and
        // bottom padding, and the gap before the Turnstile slot below — so the
        // choice sits mid-screen without making the page scroll.
        <div className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-[360px] flex-col justify-center gap-6 text-center">
          <div className="space-y-2">
            <StepTitle centered>
              Build your plan
            </StepTitle>
            <p className="text-sm text-ink/60">
              Bring the program you already follow, or answer a few questions and get one written for you.
            </p>
          </div>
          <div className="grid gap-3">
            <ChoiceCard title="I have a program" hint="Paste it, or drop a .txt, .csv or .json file" onClick={() => open('import')} />
            <ChoiceCard title="Build one for me" hint="Describe what you want, or tap a few options" onClick={() => open('quiz')} />
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <input
                ref={backupInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0]
                  e.target.value = ''
                  if (chosen) void restoreBackup(chosen)
                }}
              />
              <Button variant="link" onClick={() => backupInput.current?.click()}>
                I have an OpenLog backup
              </Button>
              <Button variant="link" onClick={onClose}>
                Start with an empty plan
              </Button>
          </div>
          {error && (
            <div className="flex justify-center">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </div>
      )}

      {step === 'import' && (
        <>
          <StepTitle onBack={() => setStep('choose')} disabled={loading}>
            Your program
          </StepTitle>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void addFiles(e.dataTransfer.files)
            }}
            className={`border-2 border-dashed p-4 text-center text-sm ${dragging ? 'border-ink bg-ink/5' : 'border-ink/50'}`}
          >
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={PROGRAM_FILES}
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files
                if (chosen) void addFiles(Array.from(chosen))
                // Cleared so choosing the same file twice still fires a change.
                e.target.value = ''
              }}
            />
            <p className="text-ink/60">Drop .txt, .csv or .json files here</p>
            <Button size="sm" className="mt-2" onClick={() => fileInput.current?.click()}>
              Choose files
            </Button>
          </div>

          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between border-2 border-ink px-3 py-2 text-sm">
                  <span className="truncate">{file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <label className="block">
            <Label>Or paste it</Label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              maxLength={MAX_PROGRAM_CHARS}
              rows={8}
              placeholder={'Monday — Push\nBench press 3x6-8\nIncline DB press 3x10\n…'}
              className="w-full border-2 border-ink bg-paper p-3 font-mono text-sm placeholder:text-ink/40"
            />
          </label>

          {notesField('Anything else? (optional)', 'Bad left shoulder. Add a Saturday run. Keep it under an hour.')}
          {footer}
        </>
      )}

      {step === 'quiz' && (
        <>
          <StepTitle onBack={() => setStep('choose')} disabled={loading}>
            About you
          </StepTitle>
          {notesField(
            'In your own words',
            'e.g. 3 days a week at home with dumbbells. Want to get stronger and lose a bit of fat. Bad left shoulder.',
            4,
          )}
          <p className="border-t-2 border-ink pt-4 text-sm text-ink/60">
            And/or pick what fits — skip anything you have covered above.
          </p>
          {QUESTIONS.map((question) => (
            <fieldset key={question.key}>
              <legend className="contents">
                <Label>{question.label}</Label>
              </legend>
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const picked = preferences[question.key] === option
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={picked}
                      onClick={() =>
                        setPreferences((prev) => ({ ...prev, [question.key]: picked ? undefined : option }))
                      }
                      // Not a Button variant: a picked chip keeps its fill on
                      // hover, so the state never reads as its opposite.
                      className={`h-8 border-2 px-2 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                        picked
                          ? 'border-accent-ink bg-accent text-accent-ink'
                          : 'border-ink text-ink hover:bg-ink/10'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
          {footer}
        </>
      )}

      {step === 'preview' && plan && (
        <>
          <div className="space-y-2">
            <StepTitle onBack={() => setStep(source)} disabled={loading}>
              Your plan
            </StepTitle>
            {plan.summary && <p className="text-sm text-ink/70">{plan.summary}</p>}
          </div>

          <div className="space-y-5">
            {plan.groups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <h3 className="border-b-2 border-ink pb-1 text-sm font-bold uppercase tracking-[0.12em]">{group.name}</h3>
                <ul className="divide-y divide-ink/15">
                  {group.trackers.map((tracker, index) => {
                    const [primary, ...alternatives] = tracker.variants
                    if (!primary) return null
                    return (
                      <li key={index} className="py-2 text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">{primary.name}</span>
                          {primary.tag && <Tag>{primary.tag}</Tag>}
                          <span className="ml-auto shrink-0 text-ink/60">{primary.target}</span>
                        </div>
                        <div className="text-xs text-ink/50">
                          {PRESETS[tracker.preset]?.label}
                          {alternatives.length > 0 && ` · or ${alternatives.map((v) => v.name).join(', ')}`}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button variant="solid" size="lg" className="w-full" onClick={use}>
              Use this plan
            </Button>
            {/* Back to what produced this plan, kept as it was, to change it
                and build again. */}
            <Button size="md" className="w-full" onClick={() => setStep(source)}>
              {source === 'import' ? 'Change my program' : 'Change my answers'}
            </Button>
          </div>
        </>
      )}

      {/* Kept outside the steps so the widget, and the token it has earned,
          survives moving between them. Empty unless a click is needed. */}
      <div ref={challenge} />
    </section>
  )
}

function StepTitle({
  children,
  onBack,
  disabled,
  centered,
}: {
  children: ReactNode
  onBack?: () => void
  disabled?: boolean
  /** Title centred on the page, with the back arrow pinned to the left edge so it does not pull the title off centre. */
  centered?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 ${centered ? 'relative min-h-9 justify-center' : ''}`}>
      {onBack && (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          disabled={disabled}
          className={`flex h-9 w-10 shrink-0 items-center justify-center border-2 border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-30 ${centered ? 'absolute left-0' : ''}`}
        >
          <ArrowIcon direction="left" size={18} />
        </button>
      )}
      <h2 className="text-xl font-bold uppercase tracking-[0.08em]">{children}</h2>
    </div>
  )
}

function ChoiceCard({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-2 border-ink p-4 transition-colors hover:bg-ink hover:text-paper"
    >
      <span className="block text-base font-bold uppercase tracking-wide">{title}</span>
      <span className="block text-sm opacity-60">{hint}</span>
    </button>
  )
}
