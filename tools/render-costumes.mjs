// Renders one animated SVG per costume in hooks/crabs.ts into media/costumes/,
// the README's costume gallery. Node 22.18+ (type stripping) imports the .ts directly.
//
//   node tools/render-costumes.mjs          write the SVGs
//   node tools/render-costumes.mjs --check  exit 1 when a file is missing, stale or extra
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { COSTUMES, CRAB_BOX, CRAB_CSS, crab } from '../hooks/crabs.ts'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'media', 'costumes')
const SCALE = 4
// Room around the 30×28 grid for props that rise or float above it.
const PAD_X = 2
const PAD_TOP = 4
const PAD_BOTTOM = 2
const W = (CRAB_BOX + PAD_X * 2) * SCALE
const H = (28 + PAD_TOP + PAD_BOTTOM) * SCALE

const render = key =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${key} crab">
<title>${key} crab</title>
${CRAB_CSS}
${crab(PAD_X * SCALE, PAD_TOP * SCALE, key, false, true, SCALE)}
</svg>
`

const wanted = new Map(Object.keys(COSTUMES).map(key => [`${key}.svg`, render(key)]))
const present = (() => {
  try {
    return readdirSync(OUT).filter(name => name.endsWith('.svg'))
  } catch {
    return []
  }
})()

if (process.argv.includes('--check')) {
  const problems = [
    ...[...wanted].filter(([name, svg]) => {
      try {
        return readFileSync(join(OUT, name), 'utf8').replace(/\r\n/g, '\n') !== svg
      } catch {
        return true
      }
    }).map(([name]) => `missing or stale: media/costumes/${name}`),
    ...present.filter(name => !wanted.has(name)).map(name => `no such costume: media/costumes/${name}`),
  ]
  for (const p of problems) console.error(p)
  if (problems.length) {
    console.error('Run `node tools/render-costumes.mjs` and commit the result.')
    process.exit(1)
  }
  console.log(`ok: ${wanted.size} costume SVGs match hooks/crabs.ts`)
} else {
  mkdirSync(OUT, { recursive: true })
  for (const [name, svg] of wanted) writeFileSync(join(OUT, name), svg)
  console.log(`wrote ${wanted.size} SVGs to media/costumes/`)
}
