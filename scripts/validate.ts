// Standalone validator for registry YAML entries.
//
// Lives inside the public ato/aviato-plugins repo so contributors can run it
// without checking out the entire ato.software monorepo. Schema is duplicated
// from packages/infra/infra/marketplace-types.ts — keep them in sync. CI in
// the monorepo also generates a JSON Schema file from the canonical source
// and diffs it against schema/registry-entry.json checked into the registry
// repo, so drift is caught at build time.

import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

const SlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
const ScopedIdSchema = z.string().regex(/^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/)
const TierSchema = z.enum(['official', 'verified', 'community'])

const RegistryEntrySchema = z.object({
  id: ScopedIdSchema,
  publisher: SlugSchema,
  name: SlugSchema,
  tier: TierSchema,
  featured: z.boolean().optional(),
  featuredRank: z.number().int().optional(),
  maintainers: z.array(z.string()).optional(),
  source: z.object({
    type: z.literal('github'),
    owner: z.string(),
    repo: z.string(),
    assetPattern: z.string().optional(),
    branch: z.string().optional(),
    tagPrefix: z.string().optional(),
    manifestPath: z.string().optional(),
  }),
  overrides: z.object({
    displayName: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    screenshots: z.array(z.string().url()).optional(),
    keywords: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
  }).optional(),
})

const PLUGINS_DIR = 'plugins'

async function* walk (dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) yield full
  }
}

async function main () {
  let errors = 0
  let count = 0
  for await (const file of walk(PLUGINS_DIR)) {
    count++
    const rel = relative('.', file)
    let parsed: unknown
    try {
      parsed = parseYaml(readFileSync(file, 'utf-8'))
    } catch (err) {
      console.error(`✗ ${rel}: invalid yaml — ${(err as Error).message}`)
      errors++
      continue
    }
    const result = RegistryEntrySchema.safeParse(parsed)
    if (!result.success) {
      console.error(`✗ ${rel}:`)
      for (const issue of result.error.issues) {
        console.error(`  · ${issue.path.join('.')}: ${issue.message}`)
      }
      errors++
      continue
    }

    // Cross-checks: publisher slug matches directory; name matches filename.
    const segments = file.split('/')
    const publisherDir = segments[1] // plugins/@foo/...
    const filename = segments[2]?.replace(/\.ya?ml$/i, '')
    if (publisherDir !== `@${result.data.publisher}`) {
      console.error(`✗ ${rel}: publisher "${result.data.publisher}" must live under "${publisherDir}"`)
      errors++
    }
    if (filename !== result.data.name) {
      console.error(`✗ ${rel}: name "${result.data.name}" must match filename`)
      errors++
    }
    if (result.data.id !== `@${result.data.publisher}/${result.data.name}`) {
      console.error(`✗ ${rel}: id must be @${result.data.publisher}/${result.data.name}`)
      errors++
    }

    if (errors === 0) console.log(`✓ ${rel}`)
  }

  console.log(`\nValidated ${count} entries, ${errors} error(s)`)
  if (errors > 0) process.exit(1)
}

void main()
