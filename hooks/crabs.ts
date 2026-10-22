// The crab drawings: pixel grids, costumes and their CSS motion. Pure and
// dependency-free, so register.tsx draws with it and tools/render-costumes.mjs
// renders the README gallery from the same source.

// The crab's drawing grid is 30 units wide, props included.
export const CRAB_BOX = 30

export const TIER_COLOR: Record<string, string> = {
  fable: '#7F77DD',
  heavy: '#D85A30',
  careful: '#BA7517',
  medium: '#378ADD',
  light: '#1D9E75',
  other: '#888780',
}

// Each workflow profile's accent; `root` is the main session's crown.
export const PROFILE_COLOR: Record<string, string> = {
  root: '#D4A017',
  manager: '#7C5CD6',
  explorer: '#1AA6B7',
  implementer: '#E07B39',
  validator: '#3BA55C',
  critic: '#D64550',
  documenter: '#8D6E4A',
  tester: '#3C7DD9',
  researcher: '#A64CA6',
  debugger: '#8DB23A',
  analyst: '#5E6AD2',
  architect: '#24508F',
  auditor: '#16806A',
  navigator: '#E0588F',
  inspector: '#8E2F45',
}

// A tier's or a profile's accent; grey for anything else.
export const colorOf = (role: string): string =>
  Object.hasOwn(TIER_COLOR, role) ? (TIER_COLOR[role] ?? '#888780') : Object.hasOwn(PROFILE_COLOR, role) ? (PROFILE_COLOR[role] ?? '#888780') : '#888780'

// Pixel Clawd from DockCrab (Clawdy): a 24×18 crab on a 30×28 grid, one costume per profile.
// The body keeps the brand clay; the profile's color lives in the costume's accent.
export const CLAY = '#D97757'
export const INK = '#1F1E1D'

// `cls` puts a pixel in a named group: `bd` (the default) is the body and its
// costume, `la`/`lb` the leg pairs, anything else a prop with its own motion.
export type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

export const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

// `armCls` lets a raised claw travel with the prop it holds.
export const crabBody = (f: Fill, armFront = 0, armCls?: string): void => {
  f(7, 10, 16, 12, CLAY)
  f(3, 14, 4, 4, CLAY)
  f(23, 14 + armFront, 4, 4, CLAY, armCls)
  f(9, 12, 2, 2, INK)
  f(19, 12, 2, 2, INK)
  f(7, 22, 2, 4, CLAY, 'la')
  f(17, 22, 2, 4, CLAY, 'la')
  f(11, 22, 2, 4, CLAY, 'lb')
  f(21, 22, 2, 4, CLAY, 'lb')
}

// Pure CSS, run by the compositor: no redraws. Periods divide one second, so the
// once-a-second redraw of a running row restarts them in phase. Every crab walks;
// each costume adds its prop's own motion on top.
export const CRAB_CSS = `<style>
.run .la{animation:st .5s steps(1) infinite}.run .lb{animation:st .5s steps(1) infinite -.25s}
.run .bd{animation:bob .5s steps(1) infinite -.125s}
.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
@keyframes blink{50%{opacity:.15}}
.c-root.run .gem{animation:blink 1s steps(1) infinite}
.c-manager.run .baton{transform-origin:50% 100%;animation:conduct .5s ease-in-out infinite}
@keyframes conduct{50%{transform:rotate(-30deg)}}
.c-explorer.run .lan{transform-origin:50% 0;animation:swing 1s ease-in-out infinite}
@keyframes swing{25%{transform:rotate(12deg)}75%{transform:rotate(-12deg)}}
.c-implementer.run .ham{transform-origin:50% 100%;animation:hammer .5s ease-in infinite}
@keyframes hammer{50%{transform:rotate(-40deg)}}
.c-validator.run .ck{animation:blink .5s steps(1) infinite}
.c-critic.run .mono{animation:blink 1s steps(1) infinite -.5s}
.c-documenter.run .quill{transform-origin:0 100%;animation:write .5s ease-in-out infinite}
@keyframes write{50%{transform:rotate(15deg)}}
.c-tester.run .bub{animation:rise .5s steps(2) infinite}
@keyframes rise{100%{transform:translateY(-2px);opacity:0}}
.c-researcher.run .pg{transform-origin:0 50%;animation:leaf 1s ease-in-out infinite}
@keyframes leaf{50%{transform:scaleX(-1)}}
.c-debugger.run .net{transform-origin:50% 100%;animation:sweep .5s ease-in-out infinite}
.c-debugger.run .bug{animation:buzz .25s steps(1) infinite}
@keyframes sweep{50%{transform:rotate(-25deg)}}@keyframes buzz{50%{transform:translate(1px,-1px)}}
.c-analyst.run .bars{transform-origin:50% 100%;animation:grow 1s ease-in-out infinite}
@keyframes grow{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}
.c-architect.run .sq{transform-origin:0 100%;animation:measure 1s ease-in-out infinite}
@keyframes measure{50%{transform:rotate(-15deg)}}
.c-auditor.run .glint{animation:blink .5s steps(1) infinite}
.c-navigator.run .cur{animation:click .5s steps(1) infinite}
.c-navigator.run .link{animation:blink .5s steps(1) infinite -.25s}
@keyframes click{50%{transform:translate(1px,1px)}}
.c-inspector.run .flash{animation:blink 1s steps(1) infinite}
.c-inspector.run .note{animation:rise 1s steps(4) infinite}
@media (prefers-reduced-motion: reduce){.run,.run g{animation:none!important}}
</style>`

export const COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Root: the main session, crowned; the jewels and the sparkle blink.
  root: (f, t) => {
    crabBody(f)
    stamp(f, 9, 4, ['g....gg....g', 'gg..gggg..gg', 'gggggggggggg', 'gggggggggggg', 'gggggggggggg', 'dddddddddddd'], { g: t, d: '#A67C00' })
    f(10, 7, 1, 1, '#D64550', 'gem'); f(14, 7, 2, 1, '#3C7DD9', 'gem'); f(19, 7, 1, 1, '#D64550', 'gem')
    f(25, 3, 1, 3, '#FFF4C2', 'gem'); f(24, 4, 3, 1, '#FFF4C2', 'gem')
  },
  // Manager: headset with a mic boom; the baton conducts the crew.
  manager: (f, t) => {
    crabBody(f, -2)
    stamp(f, 6, 5, ['...kkkkkkkkkkkk...', '.kk............kk.', 'k................k'], { k: '#3A3A3C' })
    f(5, 8, 2, 4, t); f(23, 8, 2, 4, t)
    f(6, 12, 1, 2, '#3A3A3C'); f(7, 14, 3, 1, '#3A3A3C'); f(10, 14, 1, 1, t)
    f(26, 3, 1, 9, '#F4F3EE', 'baton'); f(26, 2, 1, 1, t, 'baton')
  },
  // Explorer: pith helmet; the lantern swings from the raised claw.
  explorer: (f, t) => {
    crabBody(f, -4)
    stamp(f, 6, 4, ['......kkkkkk......', '....kkkkkkkkkk....', '...kkkkkkkkkkkk...', '...kkkkkkkkkkkk...', '...tttttttttttt...', 'bbbbbbbbbbbbbbbbbb'], { k: '#D9C38C', t, b: '#BFA76A' })
    f(26, 1, 1, 1, '#3A3A3C', 'lan'); f(25, 2, 3, 1, '#3A3A3C', 'lan'); f(25, 3, 3, 3, '#FFD25A', 'lan')
    f(26, 4, 1, 1, '#FFF4C2', 'lan'); f(25, 6, 3, 1, '#3A3A3C', 'lan'); f(26, 7, 1, 3, '#3A3A3C', 'lan')
  },
  // Implementer: bandana and a claw hammer that strikes.
  implementer: (f, t) => {
    crabBody(f)
    stamp(f, 7, 6, ['....tttttttt....', '..tttttttttttt..', '.tttwttttttwttt.', 'tttttttttttttttt'], { t, w: '#F8F6F1' })
    f(5, 8, 2, 1, t); f(4, 9, 2, 1, t)
    f(25, 5, 1, 9, '#8B5A2B', 'ham'); f(23, 2, 5, 3, '#6E7178', 'ham'); f(23, 2, 1, 1, '#A9ADB5', 'ham')
  },
  // Validator: visor cap and a clipboard whose check mark blinks.
  validator: (f, t) => {
    crabBody(f, -4)
    stamp(f, 7, 6, ['...tttttttttt...', '..tttttttttttt..', '.tttttttttttttt.'], { t })
    f(3, 9, 20, 1, '#2C7A44')
    stamp(f, 24, 1, ['..kk..', 'bbbbbb', 'bwwwwb', 'bwwwwb', 'bwwwwb', 'bwwwwb', 'bwwwwb', 'bbbbbb'], { k: '#8E929A', b: '#7A4A26', w: '#F8F6F1' })
    f(25, 9, 2, 1, '#7A4A26')
    f(28, 3, 1, 1, t, 'ck'); f(27, 4, 1, 1, t, 'ck'); f(25, 4, 1, 1, t, 'ck'); f(26, 5, 1, 1, t, 'ck')
  },
  // Critic: beret and a gold monocle whose lens glints.
  critic: (f, t) => {
    crabBody(f)
    stamp(f, 8, 5, ['......dd......', '...tttttttt...', '.tttttttttttt.', 'tttttttttttttt', '.tttttttttttt.'], { t, d: '#7A1F27' })
    stamp(f, 17, 10, ['.gggg.', 'g....g', 'g....g', 'g....g', '.gggg.'], { g: '#C9A227' })
    f(18, 11, 4, 3, 'rgba(169,214,245,.45)'); f(22, 15, 1, 3, '#C9A227'); f(21, 18, 1, 1, '#C9A227')
    f(18, 11, 1, 1, '#fff', 'mono')
  },
  // Documenter: a scroll in one claw and a quill that writes in the other.
  documenter: (f, t) => {
    crabBody(f, -4)
    stamp(f, 24, 1, ['....w', '...ww', '..wwg', '.wwg.', 'wwg..', 'w....'], { w: '#F4F3EE', g: '#C9C5BA' }, 'quill')
    f(24, 7, 1, 3, INK, 'quill')
    stamp(f, 0, 18, ['rrrrrr', '.pppp.', '.plll.', '.pppp.', '.plll.', 'rrrrrr'], { r: '#C9A66B', p: '#EBD9A8', l: t })
  },
  // Tester: lab goggles and a flask that bubbles.
  tester: (f, t) => {
    crabBody(f, -4)
    f(7, 12, 16, 1, '#55514C'); f(8, 11, 4, 4, '#3A3A3C'); f(18, 11, 4, 4, '#3A3A3C')
    f(9, 12, 2, 2, 'rgba(169,214,245,.9)'); f(19, 12, 2, 2, 'rgba(169,214,245,.9)')
    stamp(f, 23, 2, ['..gg..', '..gg..', '.gaag.', 'gaaaag', 'gllllg', 'gllllg', '.gggg.'], { g: '#C9CCD2', a: 'rgba(169,214,245,.35)', l: t })
    f(25, 0, 1, 1, '#FFFFFF', 'bub'); f(26, 1, 1, 1, '#E6E8EE', 'bub')
  },
  // Researcher: mortarboard with a tassel; the open book's page flips.
  researcher: (f, t) => {
    crabBody(f, -4)
    f(10, 5, 10, 1, '#2B2B2E'); f(7, 6, 15, 1, '#2B2B2E'); f(9, 7, 12, 3, '#3A3A3C'); f(14, 5, 2, 1, t)
    f(7, 7, 1, 3, t); f(6, 10, 2, 2, t)
    stamp(f, 24, 4, ['www', 'gg.', 'www', 'gg.', 'www'], { w: '#F4F3EE', g: '#C9C5BA' })
    f(23, 9, 7, 1, t); f(23, 5, 1, 4, t)
    stamp(f, 27, 4, ['www', '.gg', 'www', '.gg', 'www'], { w: '#FFFFFF', g: '#C9C5BA' }, 'pg')
  },
  // Debugger: a bug net that swings at the ladybird buzzing by.
  debugger: (f, t) => {
    crabBody(f)
    stamp(f, 22, 0, ['..rrr..', '.rmmmr.', 'rmmmmmr', 'rmmmmmr', '.rmmmr.', '..rrr..'], { r: t, m: 'rgba(244,243,238,.55)' }, 'net')
    f(25, 6, 1, 8, '#8B5A2B', 'net')
    stamp(f, 1, 6, ['k.k', '.r.', 'rkr', '.r.'], { k: INK, r: '#D64550' }, 'bug')
  },
  // Analyst: a tie and a chart board whose bars rise.
  analyst: (f, t) => {
    crabBody(f, -4)
    f(14, 16, 2, 1, t); f(14, 17, 2, 3, t); f(14, 20, 1, 1, t)
    stamp(f, 22, 0, ['kkkkkkkk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kkkkkkkk'], { k: '#55514C', w: '#F8F6F1' })
    f(23, 6, 1, 3, t, 'bars'); f(25, 4, 1, 5, t, 'bars'); f(27, 2, 1, 7, t, 'bars')
  },
  // Architect: a blueprint roll under one claw; the set square measures in the other.
  architect: (f, t) => {
    crabBody(f, -4)
    stamp(f, 0, 11, ['lttttttt', 'ltwtwtwt', 'lttttttt'], { l: '#BFD4F2', t, w: '#BFD4F2' })
    stamp(f, 23, 4, ['y.....', 'yy....', 'y.y...', 'y..y..', 'y...y.', 'yyyyyy'], { y: '#F2B134' }, 'sq')
  },
  // Auditor: a shield with a padlock whose shackle glints.
  auditor: (f, t) => {
    crabBody(f)
    stamp(f, 0, 9, ['sssssss', 'sttttts', 'sttttts', 'sttttts', 'sttttts', '.sttts.', '.sttts.', '..sts..', '...s...'], { s: '#C9CCD2', t })
    stamp(f, 2, 10, ['.g.', 'g.g', 'yyy', 'yky'], { g: '#E6E8EE', y: '#F5C542', k: INK })
    f(2, 11, 1, 1, '#FFFFFF', 'glint')
  },
  // Navigator: a browser window whose cursor clicks a link.
  navigator: (f, t) => {
    crabBody(f, -4)
    stamp(f, 21, 1, ['ttttttttt', 'tRtYtGttt', 'twwwwwwwt', 'twwwwwwwt', 'twwwwwwwt', 'twwwwwwwt', 'twwwwwwwt', 'twwwwwwwt', 'ttttttttt'], { t, w: '#F8F6F1', R: '#FF5F57', Y: '#FEBC2E', G: '#28C840' })
    f(23, 4, 5, 1, '#C9CCD2'); f(23, 6, 3, 1, t, 'link')
    stamp(f, 25, 5, ['k..', 'kk.', 'kkk', '.k.'], { k: INK }, 'cur')
  },
  // Inspector: headphones and a camera on its chest; the flash fires, a note rises.
  inspector: (f, t) => {
    crabBody(f)
    f(10, 5, 10, 1, t); f(8, 6, 2, 1, t); f(20, 6, 2, 1, t); f(7, 7, 1, 2, t); f(22, 7, 1, 2, t)
    f(4, 9, 3, 5, '#3A3A3C'); f(23, 9, 3, 5, '#3A3A3C'); f(5, 10, 1, 3, t); f(24, 10, 1, 3, t)
    stamp(f, 11, 16, ['kkkkkkkk', 'kkkggkkk', 'kkgllgkk', 'kkgllgkk', 'kkkggkkk'], { k: '#3A3A3C', g: t, l: 'rgba(169,214,245,.85)' })
    f(12, 15, 2, 1, '#FFF4C2', 'flash')
    stamp(f, 26, 3, ['..kk', '..k.', '..k.', 'kkk.', 'kk..'], { k: t }, 'note')
  },
  other: f => crabBody(f),
}

export const CRAB_SCALE = 1.1

// Body and props nest inside `bd` so a prop rides the bob and adds its own motion;
// legs stay outside it and step on their own. `mirror` flips the crab inside its
// own box (x .. x + CRAB_BOX * scale) so it faces left.
export const crab = (x: number, y: number, costume: string, dim = false, isWalking = false, scale = CRAB_SCALE, mirror = false): string => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (cx, cy, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  const draw = COSTUMES[costume] ?? ((g: Fill) => crabBody(g))
  draw(f, colorOf(costume))
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  const body = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  const place = mirror ? `translate(${x + CRAB_BOX * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g transform="${place}" opacity="${dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${costume}${isWalking ? ' run' : ''}">${body}${group('la')}${group('lb')}</g></g>`
}
