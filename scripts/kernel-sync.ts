export {}

// Syncs the canonical business kernel from the blank template into this
// repo. Usage:
//   bun scripts/kernel-sync.ts                              (clone source.ref, copy)
//   bun scripts/kernel-sync.ts --local ../last-tanstack-start-template (dry-run / local dev)
//   bun scripts/kernel-sync.ts --manifest scripts/kernel-sync.json
// Exit 0 when the tree is in sync (or was brought in sync); exit 1 on any
// guard failure. This script never commits — the workflow decides PR vs push.

import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

type Manifest = {
  source: { repo: string; ref: string; dir: string }
  target: { dir: string }
  exclude: string[]
  allowDeletions: boolean
}

function usage(): never {
  console.error('Usage: bun scripts/kernel-sync.ts [--manifest <path>] [--local <path>] [--ref <ref>]')
  process.exit(2)
}

function argValue(args: string[], flag: string): string | null {
  const i = args.indexOf(flag)
  if (i === -1) return null
  const value = args[i + 1]
  if (!value || value.startsWith('--')) usage()
  return value as string
}

async function listFiles(dir: string, base: string = ''): Promise<string[]> {
  const entries = await readdir(join(dir, base), { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await listFiles(dir, rel)))
    else if (entry.isFile()) files.push(rel)
  }
  return files.sort()
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function cloneSource(repo: string, ref: string): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'kernel-sync-'))
  const proc = Bun.spawn(
    ['git', 'clone', '--depth', '1', '--branch', ref, '--filter=blob:none', '--sparse', repo, dir],
    {
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) {
    await rm(dir, { recursive: true, force: true })
    console.error(`Failed to clone ${repo}#${ref}:\n${stderr || stdout}`)
    process.exit(1)
  }
  // Sparse-checkout only the kernel dir: history is not needed, files are.
  const sparse = Bun.spawn(['git', '-C', dir, 'sparse-checkout', 'set', '--no-cone', 'src/server/'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [sOut, sErr, sCode] = await Promise.all([
    new Response(sparse.stdout).text(),
    new Response(sparse.stderr).text(),
    sparse.exited,
  ])
  if (sCode !== 0) {
    await rm(dir, { recursive: true, force: true })
    console.error(`Failed to sparse-checkout src/server/ in ${repo}#${ref}:\n${sErr || sOut}`)
    process.exit(1)
  }
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

const args = process.argv.slice(2)
const repoRoot = resolve(import.meta.dir, '..')
const manifestPath = resolve(repoRoot, argValue(args, '--manifest') ?? 'scripts/kernel-sync.json')
const localOverride = argValue(args, '--local')
const refOverride = argValue(args, '--ref')

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest
const ref = refOverride ?? manifest.source.ref
const excluded = new Set(manifest.exclude)

let sourceRoot: string
let cleanup: (() => Promise<void>) | null = null
if (localOverride) {
  sourceRoot = resolve(localOverride, manifest.source.dir)
  if (!(await fileExists(sourceRoot))) {
    console.error(`Local source dir does not exist: ${sourceRoot}`)
    process.exit(1)
  }
} else {
  const cloned = await cloneSource(manifest.source.repo, ref)
  sourceRoot = join(cloned.dir, manifest.source.dir)
  cleanup = cloned.cleanup
}

try {
  if (!(await fileExists(sourceRoot))) {
    console.error(`Source dir missing in ${manifest.source.repo}#${ref}: ${manifest.source.dir}`)
    process.exit(1)
  }
  const sourceFiles = await listFiles(sourceRoot)
  if (sourceFiles.length === 0) {
    console.error(`Source dir is empty (ref/path typo?): ${manifest.source.repo}#${ref} ${manifest.source.dir}`)
    process.exit(1)
  }

  const targetRoot = resolve(repoRoot, manifest.target.dir)
  const wanted = sourceFiles.filter((f) => !excluded.has(f))
  const skipped = sourceFiles.filter((f) => excluded.has(f))

  const added: string[] = []
  const modified: string[] = []
  for (const file of wanted) {
    const from = join(sourceRoot, file)
    const to = join(targetRoot, file)
    const existed = await fileExists(to)
    const before = existed ? await readFile(to, 'utf8') : null
    await mkdir(join(to, '..'), { recursive: true })
    await cp(from, to)
    const after = await readFile(to, 'utf8')
    if (!existed) added.push(file)
    else if (before !== after) modified.push(file)
  }

  // Files in target that no longer exist upstream (ignoring excluded ones).
  const targetFiles = new Set(await listFiles(targetRoot))
  const upstreamFiles = new Set(wanted)
  const stale = [...targetFiles].filter((f) => !upstreamFiles.has(f) && !excluded.has(f))
  if (stale.length > 0 && !manifest.allowDeletions) {
    console.error(
      `Upstream deleted these files, but allowDeletions is false — refusing to remove:\n${stale.map((f) => `  - ${f}`).join('\n')}`,
    )
    process.exit(1)
  }
  for (const file of stale) await rm(join(targetRoot, file))

  const lines = [
    `kernel sync ${manifest.source.repo}#${ref} ${manifest.source.dir} -> ${manifest.target.dir}`,
    `  added (${added.length}): ${added.join(', ') || '—'}`,
    `  modified (${modified.length}): ${modified.join(', ') || '—'}`,
    `  removed (${stale.length}): ${stale.join(', ') || '—'}`,
    `  skipped payload-only (${skipped.length}): ${skipped.join(', ') || '—'}`,
  ]
  // The summary goes to stdout only — the workflow captures it into the PR
  // body. Nothing extra is written into the target dir.
  console.log(lines.join('\n'))
} finally {
  await cleanup?.()
}
