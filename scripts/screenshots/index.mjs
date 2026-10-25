// Renders the README screenshots from mock data:
// 1. runs the real widget script with Scriptable mocks (stubs.mjs) for every scenario,
// 2. lays the recorded widgets out in an HTML page (renderer.js),
// 3. captures each page with headless Chrome into docs/screenshots.
// The result is a close approximation, not a pixel-exact iOS rendering.
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "../..")
const outDir = path.join(root, "docs/screenshots")
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "iqair-screens-"))

const CHROME = process.env.CHROME_PATH ||
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium", "chromium-browser"]
    .find(p => spawnSync(p, ["--version"], { stdio: "ignore" }).status === 0)
if (!CHROME) {
  console.error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.")
  process.exit(1)
}

const WALLPAPER = "linear-gradient(150deg, #2E3A6E 0%, #5B4A8B 55%, #8A5A86 100%)"
const BASE = {
  lang: "en", locale: "en_KZ", theme: "color", city: "Almaty",
  aqi: 87, prevAqi: null, main: "p2", temp: 11.4, hum: 60, wind: 4.2,
}

const PAGES = [
  {
    name: "levels",
    rows: [{ items: [23, 72, [128, 104], 176, 240, 320].map(a => {
      const [aqi, prevAqi] = [a].flat()
      return { family: "small", aqi, prevAqi }
    }) }],
  },
  {
    name: "themes",
    rows: [["color", "Colorful"], ["light", "Light"], ["dark", "Dark"]].map(([theme, label]) => ({
      label,
      items: ["small", "medium"].map(family => ({ family, theme, aqi: 87, prevAqi: 95 })),
    })),
  },
  {
    name: "sizes",
    rows: [{ items: [
      { column: [{ family: "small", aqi: 42 }, { family: "medium", aqi: 42 }] },
      { family: "large", aqi: 42 },
    ] }],
  },
  {
    name: "lockscreen",
    type: "lock",
    date: "Sun 25",
    inline: { family: "accessoryInline", aqi: 87, prevAqi: 80 },
    widgets: [
      { family: "accessoryRectangular", aqi: 87, prevAqi: 80 },
      { family: "accessoryCircular", aqi: 42 },
      { family: "accessoryCircular", aqi: 162, prevAqi: 150 },
    ],
  },
  {
    name: "languages",
    rows: [
      [["en", "en_US", "New York", 38, null, "English"], ["ru", "ru_RU", "Moscow", 64, 58, "Русский"], ["zh", "zh_CN", "Beijing", 156, null, "中文"]],
      [["ja", "ja_JP", "Tokyo", 45, null, "日本語"], ["es", "es_ES", "Madrid", 112, 120, "Español"], ["de", "de_DE", "Berlin", 31, null, "Deutsch"]],
      [["fr", "fr_FR", "Paris", 78, null, "Français"], ["pt", "pt_BR", "São Paulo", 95, null, "Português"], ["kk", "kk_KZ", "Almaty", 178, 160, "Қазақша"]],
    ].map(row => ({
      items: row.map(([lang, locale, city, aqi, prevAqi, caption]) =>
        ({ family: "small", lang, locale, city, aqi, prevAqi, caption })),
    })),
  },
]

// The script uses top-level await, so run it as an ES module
const script = path.join(tmp, "widget.mjs")
fs.copyFileSync(path.join(root, "src/iqair-aqi.js"), script)

let runs = 0
function renderTree(item) {
  const { caption, ...scenario } = item
  const out = path.join(tmp, `tree-${runs++}.json`)
  const res = spawnSync(process.execPath, ["--import", path.join(here, "stubs.mjs"), script], {
    env: { ...process.env, SCENARIO: JSON.stringify({ ...BASE, ...scenario }), OUT: out },
    encoding: "utf8",
  })
  if (res.status !== 0 || !fs.existsSync(out)) {
    throw new Error(`Widget script failed for ${JSON.stringify(item)}\n${res.stderr}`)
  }
  return { ...item, tree: JSON.parse(fs.readFileSync(out, "utf8")) }
}

const withTree = item => item.column ? { column: item.column.map(withTree) } : renderTree(item)

function chrome(args) {
  return execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    `--user-data-dir=${path.join(tmp, "chrome")}`, "--virtual-time-budget=3000", ...args,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 })
}

fs.mkdirSync(outDir, { recursive: true })
const renderer = fs.readFileSync(path.join(here, "renderer.js"), "utf8")

for (const page of PAGES) {
  const data = page.type === "lock"
    ? { ...page, inline: withTree(page.inline), widgets: page.widgets.map(withTree) }
    : { ...page, rows: page.rows.map(r => ({ ...r, items: r.items.map(withTree) })) }
  const html = path.join(tmp, `${page.name}.html`)
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8">
<style>html, body { margin: 0; background: transparent; } body { display: inline-block; }</style>
<body>
<script>const PAGE = ${JSON.stringify({ ...data, wallpaper: WALLPAPER })}</script>
<script>${renderer}</script>`)

  // First pass measures the page, second one captures it at exactly that size
  const url = `file://${html}`
  const size = chrome(["--dump-dom", url]).match(/data-size="(\d+)x(\d+)"/)
  if (!size) throw new Error(`Couldn't measure ${page.name}, page kept in ${tmp}`)
  const png = path.join(outDir, `${page.name}.png`)
  chrome([`--window-size=${size[1]},${size[2]}`, "--force-device-scale-factor=2",
    "--default-background-color=00000000", `--screenshot=${png}`, url])
  console.log(`Wrote ${path.relative(root, png)}`)
}

fs.rmSync(tmp, { recursive: true, force: true })
