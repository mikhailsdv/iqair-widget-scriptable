// Packs src/iqair-aqi.js into a .scriptable file that the Scriptable app can import.
import { readFileSync, writeFileSync } from "node:fs"

const src = new URL("../src/iqair-aqi.js", import.meta.url)
const out = new URL("../iqair-aqi.scriptable", import.meta.url)

const script = readFileSync(src, "utf8")
const meta = Object.fromEntries(
  [...script.matchAll(/icon-(color|glyph):\s*([\w-]+)/g)].map(m => [m[1], m[2]])
)

const pkg = {
  always_run_in_app: false,
  icon: { color: meta.color ?? "deep-green", glyph: meta.glyph ?? "leaf" },
  name: "IQAir AQI",
  script,
  share_sheet_inputs: [],
}

writeFileSync(out, JSON.stringify(pkg, null, 2) + "\n")
console.log(`Wrote ${out.pathname}`)
