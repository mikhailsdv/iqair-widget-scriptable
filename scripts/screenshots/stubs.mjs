// Scriptable API mocks for rendering screenshots outside iOS.
// The widget script runs unchanged. Instead of drawing, these mocks record the widget
// tree and DrawContext commands, and Script.setWidget writes them as JSON to $OUT.
// The scenario (family, language, AQI, theme…) comes from $SCENARIO.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const sc = JSON.parse(process.env.SCENARIO)
const docs = fs.mkdtempSync(path.join(os.tmpdir(), "iqair-shot-"))

// Theme setting and a previous reading (for the trend arrow), as the script stores them
fs.writeFileSync(path.join(docs, "iqair-aqi-settings.json"), JSON.stringify({ theme: sc.theme }))
if (sc.prevAqi != null) {
  fs.writeFileSync(path.join(docs, "iqair-aqi-cache-auto.json"),
    JSON.stringify({ data: { ts: "previous", aqi: sc.prevAqi }, prevAqi: null, fetchedAt: 0 }))
}

globalThis.Device = { language: () => sc.lang, locale: () => sc.locale }
globalThis.args = { widgetParameter: "" }
globalThis.config = { runsInWidget: true, widgetFamily: sc.family }
globalThis.Keychain = { contains: () => true, get: () => "mock", set() {}, remove() {} }
globalThis.Script = {
  setWidget: w => fs.writeFileSync(process.env.OUT, JSON.stringify(w)),
  complete() {},
}

globalThis.FileManager = {
  local: () => ({
    documentsDirectory: () => docs,
    joinPath: (a, b) => path.join(a, b),
    fileExists: p => fs.existsSync(p),
    readString: p => fs.readFileSync(p, "utf8"),
    writeString: (p, s) => fs.writeFileSync(p, s),
  }),
}

globalThis.Request = class {
  async loadJSON() {
    return {
      status: "success",
      data: {
        city: sc.city, state: "Mock", country: "Mock",
        current: {
          pollution: { ts: "2026-10-25T18:00:00.000Z", aqius: sc.aqi, mainus: sc.main },
          weather: { tp: sc.temp, hu: sc.hum, ws: sc.wind },
        },
      },
    }
  }
}

globalThis.Location = {
  setAccuracyToThreeKilometers() {},
  current: async () => ({ latitude: 43.2389, longitude: 76.8897 }),
}
globalThis.Timer = {
  schedule(ms, repeats, fn) {
    const t = setTimeout(fn, ms)
    t.unref()
    return { invalidate: () => clearTimeout(t) }
  },
}

// Fixed UTC time so every screenshot shows the same reading time. Node falls back to
// 12-hour time for locales like en_KZ, so pick the clock by region instead
const H12_REGIONS = ["US", "CA", "AU", "IN", "PH"]
globalThis.DateFormatter = class {
  useNoDateStyle() {}
  useShortTimeStyle() {}
  string(d) {
    const h12 = H12_REGIONS.includes(sc.locale.split("_").pop())
    return d.toLocaleTimeString(sc.locale.replace(/_/g, "-"),
      { hour: "numeric", minute: "2-digit", hourCycle: h12 ? "h12" : "h23", timeZone: "UTC" })
  }
}

globalThis.Color = class Color {
  constructor(hex, alpha = 1) { this.hex = hex; this.alpha = alpha }
  static white() { return new Color("#FFFFFF") }
  static black() { return new Color("#000000") }
  static dynamic(light, dark) { return { dynamic: [light, dark] } }
}
globalThis.Font = new Proxy({}, { get: (_, name) => size => ({ name, size }) })
globalThis.LinearGradient = class { constructor() { this.colors = []; this.locations = [] } }
globalThis.Size = class { constructor(width, height) { Object.assign(this, { width, height }) } }
globalThis.Point = class { constructor(x, y) { Object.assign(this, { x, y }) } }
globalThis.Rect = class { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }) } }

globalThis.SFSymbol = {
  named: symbol => ({ applyFont() {}, image: { symbol } }),
}

globalThis.Path = class {
  constructor() { this.cmds = [] }
  addLines(points) { this.cmds.push(["lines", points]) }
  addRoundedRect(rect, cw, ch) { this.cmds.push(["roundedRect", rect, cw, ch]) }
  closeSubpath() { this.cmds.push(["close"]) }
}

globalThis.DrawContext = class {
  constructor() { this.ops = [] }
  addPath(p) { this.path = p }
  setFillColor(c) { this.fill = c }
  setTextColor(c) { this.text = c }
  setFont(f) { this.font = f }
  setTextAlignedCenter() { this.align = "center" }
  fillPath() { this.ops.push({ op: "fill", cmds: this.path.cmds, color: this.fill }) }
  drawTextInRect(text, rect) {
    this.ops.push({ op: "text", text, rect, font: this.font, color: this.text, align: this.align })
  }
  getImage() { return { draw: { size: this.size, ops: this.ops } } }
}

function container(type) {
  const n = { type, children: [] }
  const add = child => (n.children.push(child), child)
  return Object.assign(n, {
    addText: text => add(textNode(text)),
    addStack: () => add(container("stack")),
    addImage: image => add(imageNode(image)),
    addSpacer: length => { n.children.push({ type: "spacer", length: length ?? null }) },
    setPadding: (top, leading, bottom, trailing) => { n.padding = [top, leading, bottom, trailing] },
    useDefaultPadding: () => { delete n.padding },
    layoutHorizontally: () => { n.layout = "h" },
    layoutVertically: () => { n.layout = "v" },
    topAlignContent: () => { n.align = "start" },
    centerAlignContent: () => { n.align = "center" },
    bottomAlignContent: () => { n.align = "end" },
  })
}

function textNode(text) {
  const n = { type: "text", text }
  return Object.assign(n, {
    leftAlignText: () => { n.textAlign = "left" },
    centerAlignText: () => { n.textAlign = "center" },
    rightAlignText: () => { n.textAlign = "right" },
  })
}

function imageNode(image) {
  const n = { type: "image", image }
  return Object.assign(n, {
    leftAlignImage: () => { n.imageAlign = "start" },
    centerAlignImage: () => { n.imageAlign = "center" },
    rightAlignImage: () => { n.imageAlign = "end" },
  })
}

globalThis.ListWidget = class { constructor() { return container("widget") } }
