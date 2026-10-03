import { MAX_PROGRAM_CHARS, type GeneratedPlan, type PlanRequest } from './planSchema'
import { PRESETS } from './presets'
import type { Group, Tracker, Variant } from './types'
import { uid } from './utils'

/** Files the drop zone takes. Everything is read as text — the model does the parsing. */
export const PROGRAM_FILES = '.txt,.csv,.tsv,.json,.md,text/plain,text/csv,application/json'

export type ProgramFile = { name: string; text: string }

/** Far beyond any program, so an accidental video or export dump is refused unread. */
const MAX_FILE_BYTES = 256 * 1024

export async function readProgramFiles(
  files: Iterable<File>,
): Promise<{ read: ProgramFile[]; skipped: string[] }> {
  const list = [...files]
  const fits = list.filter((file) => file.size <= MAX_FILE_BYTES)
  const read = await Promise.all(fits.map(async (file) => ({ name: file.name, text: await file.text() })))
  return { read, skipped: list.filter((file) => file.size > MAX_FILE_BYTES).map((file) => file.name) }
}

/** Pasted text and dropped files as one block, each file under its own name. */
export function joinProgram(pasted: string, files: ProgramFile[]): string {
  return [pasted.trim(), ...files.map((f) => `--- ${f.name} ---\n${f.text.trim()}`)]
    .filter(Boolean)
    .join('\n\n')
}

export function programTooLong(program: string): boolean {
  return program.length > MAX_PROGRAM_CHARS
}

export async function requestPlan(body: PlanRequest): Promise<GeneratedPlan> {
  let response: Response
  try {
    response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('No connection. The plan builder needs the internet; the rest of the app does not.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error ?? 'The plan builder failed. Try again.')
  return data as GeneratedPlan
}

/**
 * Turns a generated plan into records, ordered from 0 since it becomes the
 * whole plan. The model is schema-constrained, but names are still trimmed and
 * anything empty is dropped rather than written.
 */
export function toRecords(plan: GeneratedPlan): { groups: Group[]; trackers: Tracker[] } {
  const groups: Group[] = []
  const trackers: Tracker[] = []

  for (const generated of plan.groups) {
    const name = generated.name.trim()
    const variantLists = generated.trackers
      .filter((t) => t.preset in PRESETS)
      .map((t) => ({ preset: t.preset, variants: cleanVariants(t.variants) }))
      .filter((t) => t.variants.length > 0)

    if (!name || variantLists.length === 0) continue

    const groupId = uid()
    groups.push({ id: groupId, name, order: groups.length })
    variantLists.forEach(({ preset, variants }, order) => {
      trackers.push({ id: uid(), groupId, order, preset, variants: variants as Tracker['variants'] })
    })
  }

  return { groups, trackers }
}

function cleanVariants(variants: GeneratedPlan['groups'][number]['trackers'][number]['variants']): Variant[] {
  return variants
    .map((v) => ({ id: uid(), name: v.name.trim(), target: v.target.trim(), tag: v.tag.trim() }))
    .filter((v) => v.name)
}
