// Reads a list of changed yaml file paths from stdin (one per line) and
// emits a sync payload `{ entries: RegistryEntry[] }` on stdout. Used by
// the sync workflow to build the body it POSTs to the marketplace API.
//
// Validation is intentionally light here — the API re-validates with the
// canonical Zod schema. We just parse, package, and write.

import { existsSync, readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

const lines = readFileSync(0, 'utf-8').trim().split('\n').filter(Boolean)
const entries: unknown[] = []
for (const path of lines) {
  // Skip files that were deleted in the merge.
  if (!existsSync(path)) {
    continue
  }

  try {
    entries.push(parseYaml(readFileSync(path, 'utf-8')))
  } catch (err) {
    console.error(`build-payload: skipping ${path}: ${(err as Error).message}`)
  }
}

process.stdout.write(JSON.stringify({ entries }))
