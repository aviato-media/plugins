# Contributing a plugin to the Aviato marketplace

The Aviato marketplace is a curated registry. Plugin code lives in your
own repository on GitHub and is distributed via your GitHub releases.
This repo is the index that tells Aviato users your plugin exists.

## How submission works

1. Fork this repo.
2. Add a curation entry at `plugins/@<your-publisher>/<plugin-name>.yaml`.
3. Open a PR. CI validates your entry against the schema.
4. An Ato maintainer reviews tier eligibility and merges.
5. On merge, the marketplace catalog is updated within seconds and the
   poller fetches your latest GitHub release within 30 minutes.

## Tiers

| Tier | Who can publish | Eligibility |
|---|---|---|
| `official` | Ato team only | Maintained directly by Ato |
| `verified` | Reviewed third parties | Stable releases, active maintenance, security review on request |
| `community` | Anyone | Self-submitted; basic schema validation |

Most third-party plugins start at `community`. To request `verified`,
add a comment in the PR linking to your release history.

## Publisher namespace rules

The first PR that introduces a `@<publisher>/` directory **claims that
namespace** for the GitHub user who opens it. Subsequent edits to plugins
under that namespace require either:

- the original claimant, or
- a GitHub login listed in the entry's `maintainers:` field.

This is enforced by the marketplace API on the sync webhook — not just
GitHub CODEOWNERS — so renaming files or rewriting history won't bypass
the rule.

## Plugin distribution

The marketplace does **not** host your plugin code. Releases come from your
GitHub repo via GitHub Releases.

For each release tag (semver, e.g. `v1.2.3`):

1. Tag the commit and push.
2. Create a GitHub Release for that tag.
3. Optionally attach a tarball asset matching `assetPattern` from your
   curation entry (e.g. `aviato-plugin-foo-1.2.3.tar.gz`). If no asset
   matches, the marketplace falls back to the source tarball that GitHub
   auto-generates.
4. Ensure your release commit contains a `plugin.json` at the repo root
   that matches the strict Aviato manifest schema (see the Aviato dev
   docs).

The poller fetches each release within 30 minutes, validates the
`plugin.json`, computes a SHA-256 of the tarball, and stores the version
record. Aviato users will see the new version in their plugin manager
on the next refresh.

## Schema

The full schema is in `scripts/validate.ts`. Minimum viable entry:

```yaml
id: "@your-handle/your-plugin"
publisher: your-handle
name: your-plugin
tier: community
source:
  type: github
  owner: your-handle
  repo: your-plugin-repo
```
