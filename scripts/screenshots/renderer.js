// Runs in the browser: turns widget trees recorded by stubs.mjs into DOM that roughly
// follows Scriptable's layout (vertical ListWidget, horizontal stacks, flexible spacers),
// and replays DrawContext commands on canvas. PAGE is injected by index.mjs.
/* global PAGE */

// Widget sizes in points, iPhone 15/16 Pro
const SIZES = {
  small: [158, 158], medium: [338, 158], large: [338, 354],
  accessoryRectangular: [160, 72], accessoryCircular: [72, 72], accessoryInline: [257, 22],
}
// iOS adds its own margins around lock screen content. The script cancels them for the
// ring with a negative padding, so the mock adds them back to keep the net size right.
const SYSTEM_MARGIN = { accessoryCircular: 8 }
const HOME_DEFAULT_PADDING = 16

const isLock = family => family.startsWith("accessory")

function cssColor(c, fallback) {
  if (!c) return fallback
  if (c.dynamic) return cssColor(c.dynamic[0], fallback) // light variant
  const hex = c.hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${c.alpha ?? 1})`
}

function cssFont(f) {
  const name = f?.name ?? "systemFont"
  const weight = /semibold/i.test(name) ? 600 : /bold/i.test(name) ? 700 : /medium/i.test(name) ? 500 : 400
  const family = /Rounded/.test(name) ? '"SF Pro Rounded", ui-rounded, system-ui' : "system-ui, -apple-system"
  return { weight, family, size: f?.size ?? 17 }
}

function el(tag, style = {}, text) {
  const e = document.createElement(tag)
  Object.assign(e.style, style)
  if (text != null) e.textContent = text
  return e
}

// Simple leaf in place of the leaf.fill SF Symbol
function leaf(size, color) {
  const ns = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(ns, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", size)
  svg.setAttribute("height", size)
  const p = document.createElementNS(ns, "path")
  p.setAttribute("d", "M20.5 3C10 3 4.5 7.5 4.5 14c0 1.5.4 2.9 1 4.1L3 20.6 4.4 22l2.5-2.5c1.2.7 2.6 1 4.1 1C17.5 20.5 21 14 20.5 3z")
  p.setAttribute("fill", color)
  svg.appendChild(p)
  svg.style.flex = "none"
  return svg
}

function canvas(draw, cssSize) {
  const { size, ops } = draw
  const scale = 3
  const c = el("canvas")
  c.width = size.width * scale
  c.height = size.height * scale
  Object.assign(c.style, cssSize)
  const ctx = c.getContext("2d")
  ctx.scale(scale, scale)
  for (const o of ops) {
    if (o.op === "fill") {
      ctx.beginPath()
      for (const [cmd, a, b] of o.cmds) {
        if (cmd === "lines") a.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        if (cmd === "roundedRect") ctx.roundRect(a.x, a.y, a.width, a.height, b)
        if (cmd === "close") ctx.closePath()
      }
      ctx.fillStyle = cssColor(o.color, "#000")
      ctx.fill()
    }
    if (o.op === "text") {
      const f = cssFont(o.font)
      ctx.font = `${f.weight} ${f.size}px ${f.family}`
      ctx.fillStyle = cssColor(o.color, "#000")
      ctx.textAlign = o.align === "center" ? "center" : "left"
      ctx.textBaseline = "top"
      const x = o.align === "center" ? o.rect.x + o.rect.width / 2 : o.rect.x
      ctx.fillText(o.text, x, o.rect.y + f.size * 0.1) // drawTextInRect starts at the rect top
    }
  }
  return c
}

const hasFlexibleSpacer = n => n.children?.some(c => c.type === "spacer" && c.length == null)

function renderNode(n, ctx) {
  if (n.type === "spacer") {
    return el("div", n.length == null ? { flex: "1 1 0", minWidth: "0", minHeight: "0" } : { flex: `0 0 ${n.length}px` })
  }

  if (n.type === "text") {
    const f = cssFont(n.font)
    const lines = n.lineLimit ?? 0
    const t = el("div", {
      font: `${f.weight} ${f.size}px ${f.family}`,
      lineHeight: "1.2",
      color: cssColor(n.textColor, ctx.textColor),
      opacity: n.textOpacity ?? 1,
      textAlign: n.textAlign ?? "left",
      whiteSpace: lines === 1 || (!lines && ctx.axis === "h") ? "nowrap" : "normal",
      overflow: "hidden",
      textOverflow: "ellipsis",
      minWidth: "0",
      maxWidth: "100%",
      flex: "0 1 auto",
    }, n.text)
    if (lines > 1) Object.assign(t.style, { display: "-webkit-box", webkitLineClamp: lines, webkitBoxOrient: "vertical" })
    if (n.textAlign === "center") t.style.alignSelf = "stretch"
    if (n.minimumScaleFactor) {
      t.dataset.minScale = n.minimumScaleFactor
      t.dataset.size = f.size
    }
    return t
  }

  if (n.type === "image") {
    const align = { start: "flex-start", center: "center", end: "flex-end" }[n.imageAlign]
    if (n.image.symbol) {
      const size = n.imageSize?.width ?? 16
      const s = leaf(size, cssColor(n.tintColor, ctx.textColor))
      if (align) s.style.alignSelf = align
      return s
    }
    if (n.imageSize) return canvas(n.image.draw, { width: `${n.imageSize.width}px`, height: `${n.imageSize.height}px`, flex: "none" })
    // A resizable image without a fixed size fills the free space, keeping its aspect ratio
    const box = el("div", { flex: "1 1 0", alignSelf: "stretch", display: "flex", justifyContent: align ?? "flex-start", alignItems: "center", minHeight: "0" })
    box.appendChild(canvas(n.image.draw, { height: "100%", aspectRatio: `${n.image.draw.size.width} / ${n.image.draw.size.height}` }))
    return box
  }

  // stack
  const axis = n.layout === "v" ? "v" : "h"
  const s = el("div", {
    display: "flex",
    flexDirection: axis === "v" ? "column" : "row",
    alignItems: { start: "flex-start", center: "center", end: "flex-end" }[n.align] ?? "center",
    minWidth: "0",
    flex: "none",
  })
  if (hasFlexibleSpacer(n) && ctx.axis === "v") s.style.alignSelf = "stretch"
  if (n.padding) s.style.padding = n.padding.map(p => `${p}px`).join(" ")
  for (const c of n.children) s.appendChild(renderNode(c, { ...ctx, axis }))
  return s
}

function renderWidget(tree, family) {
  const [w, h] = SIZES[family]
  const lock = isLock(family)
  const textColor = lock ? "#FFFFFF" : "#000000"

  if (family === "accessoryInline") {
    const row = el("div", { height: `${h}px`, display: "flex", alignItems: "center", gap: "5px", color: textColor })
    for (const c of tree.children) {
      const node = c.type === "text" ? { ...c, font: { name: "semiboldSystemFont", size: 16 } } : c
      row.appendChild(renderNode(node, { textColor, axis: "h" }))
    }
    return row
  }

  const frame = el("div", { width: `${w}px`, height: `${h}px`, position: "relative", flex: "none" })
  if (!lock) {
    Object.assign(frame.style, { borderRadius: "22px", overflow: "hidden", boxShadow: "0 6px 18px rgba(0, 0, 0, .18)" })
    const g = tree.backgroundGradient
    frame.style.background = g
      ? `linear-gradient(180deg, ${g.colors.map((c, i) => `${cssColor(c)} ${(g.locations[i] ?? i) * 100}%`).join(", ")})`
      : cssColor(tree.backgroundColor, "#FFFFFF")
  }

  const pad = tree.padding ?? Array(4).fill(lock ? 0 : HOME_DEFAULT_PADDING)
  const sys = SYSTEM_MARGIN[family] ?? 0
  const [top, left, bottom, right] = pad.map(p => `${p + sys}px`)
  const content = el("div", {
    position: "absolute", top, left, bottom, right,
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    justifyContent: hasFlexibleSpacer(tree) ? "flex-start" : "center",
  })
  for (const c of tree.children) content.appendChild(renderNode(c, { textColor, axis: "v" }))
  frame.appendChild(content)
  return frame
}

// Like minimumScaleFactor: shrink text that doesn't fit, down to its minimum scale
function shrinkToFit() {
  for (const t of document.querySelectorAll("[data-min-scale]")) {
    const base = Number(t.dataset.size)
    const min = base * Number(t.dataset.minScale)
    let size = base
    const overflows = () => t.scrollWidth > t.clientWidth + 0.5 || t.scrollHeight > t.clientHeight + 0.5
    while (overflows() && size > min) {
      size = Math.max(min, size - 0.25)
      t.style.fontSize = `${size}px`
    }
  }
}

function renderItem(item) {
  if (item.column) {
    const col = el("div", { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px" })
    item.column.forEach(i => col.appendChild(renderItem(i)))
    return col
  }
  const box = el("div", { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" })
  box.appendChild(renderWidget(item.tree, item.family))
  if (item.caption) box.appendChild(el("div", { font: "500 13px system-ui", color: "rgba(255,255,255,.8)" }, item.caption))
  return box
}

function renderGrid(page) {
  const shot = el("div", { display: "inline-flex", flexDirection: "column", gap: "22px", padding: "28px" })
  for (const row of page.rows) {
    const r = el("div", { display: "flex", flexDirection: "column", gap: "10px" })
    if (row.label) r.appendChild(el("div", { font: "600 14px system-ui", color: "rgba(255,255,255,.85)" }, row.label))
    const items = el("div", { display: "flex", gap: "16px", alignItems: "flex-start" })
    row.items.forEach(i => items.appendChild(renderItem(i)))
    r.appendChild(items)
    shot.appendChild(r)
  }
  return shot
}

function renderLock(page) {
  const shot = el("div", {
    width: "393px", boxSizing: "border-box", padding: "34px 0 36px",
    display: "flex", flexDirection: "column", alignItems: "center", color: "#fff",
  })
  const date = el("div", { display: "flex", alignItems: "center", gap: "8px", font: "600 17px system-ui", opacity: ".92" })
  date.appendChild(el("span", {}, page.date))
  date.appendChild(renderWidget(page.inline.tree, "accessoryInline"))
  shot.appendChild(date)
  shot.appendChild(el("div", { font: '700 96px "SF Pro Rounded", ui-rounded, system-ui', letterSpacing: "-2px", lineHeight: "1.05", margin: "2px 0 14px" }, "9:41"))
  const row = el("div", { display: "flex", gap: "17px", alignItems: "center" })
  page.widgets.forEach(i => row.appendChild(renderWidget(i.tree, i.family)))
  shot.appendChild(row)
  return shot
}

const shot = PAGE.type === "lock" ? renderLock(PAGE) : renderGrid(PAGE)
Object.assign(shot.style, { borderRadius: "28px", background: PAGE.wallpaper })
document.body.appendChild(shot)
document.fonts.ready.then(() => {
  shrinkToFit()
  document.body.dataset.size = `${Math.ceil(shot.offsetWidth)}x${Math.ceil(shot.offsetHeight)}`
})
