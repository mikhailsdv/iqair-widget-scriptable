// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;

// IQAir AQI widget for Scriptable
// Widget parameter (optional):
//   empty or "auto"          → nearest station to current location (falls back to IP)
//   "Almaty, Almaty Oblysy, Kazakhstan" → city, state, country (as IQAir spells them)
//   "43.24, 76.89"           → nearest station to coordinates

const API_KEY = "" // можно вписать ключ сюда, иначе спросим при первом запуске и сохраним в Keychain
const REFRESH_MIN = 20 // ~72 запроса в сутки
const MIN_FETCH_MIN = 10 // если iOS дергает виджет чаще, отдаем кэш без запроса
const KEYCHAIN_KEY = "iqair-api-key"
const TEMP_UNIT = "auto" // "auto" — по региону устройства, или "C" / "F"
const WIND_UNIT = "auto" // "auto" — по региону устройства, или "ms" / "kmh" / "mph"
const LOCATION_TIMEOUT_SEC = 5 // дольше не ждем геолокацию: берем прошлые координаты или IP

// Короткие формулировки: маленький виджет вмещает ~2 строки по 15–17 символов
const STRINGS = {
  en: {
    levels: ["Good", "Moderate", "Unhealthy for sensitive groups", "Unhealthy", "Very unhealthy", "Hazardous"],
    air: "Air", humidity: "Humidity", wind: "wind", ms: "m/s", kmh: "km/h", mph: "mph",
    updated: "updated", cached: "⚠︎ cached",
    keyTitle: "IQAir API key", keyMessage: "Get a free key at dashboard.iqair.com",
    save: "Save", cancel: "Cancel",
    themeTitle: "Widget theme", keep: "Keep current",
    themes: { color: "Colorful", light: "Light", dark: "Dark", system: "Match system" },
    noKey: "No API key. Run the script in the Scriptable app.",
    badKey: "Invalid API key. Run the script in the app to enter a new one.",
    limit: "IQAir rate limit reached",
    notFound: "City or station not found",
    badParam: "Parameter: empty, \"city, state, country\" or \"lat, lon\"",
    apiError: "API error",
  },
  ru: {
    levels: ["Хорошо", "Умеренно", "Вредно для чувствительных", "Вредно", "Очень вредно", "Опасно"],
    air: "Воздух", humidity: "Влажность", wind: "ветер", ms: "м/с", kmh: "км/ч",
    updated: "обновлено", cached: "⚠︎ кэш",
    keyMessage: "Ключ можно получить бесплатно на dashboard.iqair.com",
    save: "Сохранить", cancel: "Отмена",
    themeTitle: "Тема виджета", keep: "Оставить",
    themes: { color: "Цветная", light: "Светлая", dark: "Тёмная", system: "Как в системе" },
    noKey: "Нет API-ключа. Запусти скрипт в приложении Scriptable.",
    badKey: "Неверный API-ключ. Запусти скрипт в приложении, чтобы ввести новый.",
    limit: "Превышен лимит запросов IQAir",
    notFound: "Город или станция не найдены",
    badParam: "Параметр: пусто, «город, регион, страна» или «lat, lon»",
    apiError: "ошибка API",
  },
  zh: {
    levels: ["良好", "中等", "对敏感人群不健康", "不健康", "非常不健康", "危险"],
    air: "空气", humidity: "湿度", wind: "风速", ms: "米/秒", kmh: "公里/时",
    updated: "更新于", cached: "⚠︎ 缓存",
    keyMessage: "在 dashboard.iqair.com 免费获取密钥",
    save: "保存", cancel: "取消",
    themeTitle: "小组件主题", keep: "保持不变",
    themes: { color: "彩色", light: "浅色", dark: "深色", system: "跟随系统" },
    noKey: "没有 API 密钥。请在 Scriptable 中运行脚本。",
    badKey: "API 密钥无效。请在 Scriptable 中运行脚本并输入新密钥。",
    limit: "已达到 IQAir 请求上限",
    notFound: "未找到城市或监测站",
    badParam: "参数：留空、“城市, 省/州, 国家”或“纬度, 经度”",
    apiError: "API 错误",
  },
  ja: {
    levels: ["良好", "普通", "敏感な人に有害", "有害", "非常に有害", "危険"],
    air: "空気", humidity: "湿度", wind: "風速", ms: "m/s", kmh: "km/h",
    updated: "更新", cached: "⚠︎ キャッシュ",
    keyMessage: "dashboard.iqair.com で無料のキーを取得できます",
    save: "保存", cancel: "キャンセル",
    themeTitle: "ウィジェットのテーマ", keep: "変更しない",
    themes: { color: "カラフル", light: "ライト", dark: "ダーク", system: "システムに合わせる" },
    noKey: "API キーがありません。Scriptable でスクリプトを実行してください。",
    badKey: "API キーが無効です。Scriptable でスクリプトを実行し、新しいキーを入力してください。",
    limit: "IQAir のリクエスト上限に達しました",
    notFound: "都市または観測所が見つかりません",
    badParam: "パラメータ：空欄、「都市, 州, 国」または「緯度, 経度」",
    apiError: "API エラー",
  },
  es: {
    levels: ["Buena", "Moderada", "Dañina para sensibles", "Dañina", "Muy dañina", "Peligrosa"],
    air: "Aire", humidity: "Humedad", wind: "viento", ms: "m/s", kmh: "km/h",
    updated: "actualizado", cached: "⚠︎ caché",
    keyMessage: "Consigue una clave gratis en dashboard.iqair.com",
    save: "Guardar", cancel: "Cancelar",
    themeTitle: "Tema del widget", keep: "Mantener",
    themes: { color: "Colorido", light: "Claro", dark: "Oscuro", system: "Según el sistema" },
    noKey: "Sin clave API. Ejecuta el script en la app Scriptable.",
    badKey: "Clave API no válida. Ejecuta el script en la app para introducir una nueva.",
    limit: "Límite de solicitudes de IQAir alcanzado",
    notFound: "Ciudad o estación no encontrada",
    badParam: "Parámetro: vacío, «ciudad, estado, país» o «lat, lon»",
    apiError: "error de la API",
  },
  de: {
    levels: ["Gut", "Mäßig", "Ungesund für Empfindliche", "Ungesund", "Sehr ungesund", "Gefährlich"],
    air: "Luft", humidity: "Feuchte", wind: "Wind", ms: "m/s", kmh: "km/h",
    updated: "Stand", cached: "⚠︎ Cache",
    keyMessage: "Kostenlosen Schlüssel gibt es auf dashboard.iqair.com",
    save: "Speichern", cancel: "Abbrechen",
    themeTitle: "Widget-Design", keep: "Beibehalten",
    themes: { color: "Farbig", light: "Hell", dark: "Dunkel", system: "Wie System" },
    noKey: "Kein API-Schlüssel. Führe das Skript in der Scriptable-App aus.",
    badKey: "Ungültiger API-Schlüssel. Führe das Skript in der App aus, um einen neuen einzugeben.",
    limit: "IQAir-Anfragelimit erreicht",
    notFound: "Stadt oder Station nicht gefunden",
    badParam: "Parameter: leer, „Stadt, Region, Land“ oder „lat, lon“",
    apiError: "API-Fehler",
  },
  fr: {
    levels: ["Bon", "Modéré", "Mauvais pour les sensibles", "Mauvais", "Très mauvais", "Dangereux"],
    air: "Air", humidity: "Humidité", wind: "vent", ms: "m/s", kmh: "km/h",
    updated: "mis à jour", cached: "⚠︎ cache",
    keyMessage: "Obtenez une clé gratuite sur dashboard.iqair.com",
    save: "Enregistrer", cancel: "Annuler",
    themeTitle: "Thème du widget", keep: "Conserver",
    themes: { color: "Coloré", light: "Clair", dark: "Sombre", system: "Comme le système" },
    noKey: "Pas de clé API. Lancez le script dans l’app Scriptable.",
    badKey: "Clé API invalide. Lancez le script dans l’app pour en saisir une nouvelle.",
    limit: "Limite de requêtes IQAir atteinte",
    notFound: "Ville ou station introuvable",
    badParam: "Paramètre : vide, « ville, région, pays » ou « lat, lon »",
    apiError: "erreur de l’API",
  },
  pt: {
    levels: ["Boa", "Moderada", "Ruim para sensíveis", "Ruim", "Muito ruim", "Perigosa"],
    air: "Ar", humidity: "Umidade", wind: "vento", ms: "m/s", kmh: "km/h",
    updated: "atualizado", cached: "⚠︎ cache",
    keyMessage: "Obtenha uma chave grátis em dashboard.iqair.com",
    save: "Salvar", cancel: "Cancelar",
    themeTitle: "Tema do widget", keep: "Manter",
    themes: { color: "Colorido", light: "Claro", dark: "Escuro", system: "Igual ao sistema" },
    noKey: "Sem chave de API. Execute o script no app Scriptable.",
    badKey: "Chave de API inválida. Execute o script no app para inserir uma nova.",
    limit: "Limite de solicitações do IQAir atingido",
    notFound: "Cidade ou estação não encontrada",
    badParam: "Parâmetro: vazio, “cidade, estado, país” ou “lat, lon”",
    apiError: "erro da API",
  },
  kk: {
    levels: ["Жақсы", "Орташа", "Сезімталдарға зиянды", "Зиянды", "Өте зиянды", "Қауіпті"],
    air: "Ауа", humidity: "Ылғалдылық", wind: "жел", ms: "м/с", kmh: "км/сағ",
    updated: "жаңартылды", cached: "⚠︎ кэш",
    keyMessage: "Кілтті dashboard.iqair.com сайтынан тегін алуға болады",
    save: "Сақтау", cancel: "Бас тарту",
    themeTitle: "Виджет тақырыбы", keep: "Өзгертпеу",
    themes: { color: "Түрлі түсті", light: "Ашық", dark: "Қараңғы", system: "Жүйедегідей" },
    noKey: "API кілті жоқ. Скриптті Scriptable қолданбасында іске қосыңыз.",
    badKey: "API кілті жарамсыз. Жаңасын енгізу үшін скриптті қолданбада іске қосыңыз.",
    limit: "IQAir сұраныс шегіне жетті",
    notFound: "Қала немесе станция табылмады",
    badParam: "Параметр: бос, «қала, аймақ, ел» немесе «lat, lon»",
    apiError: "API қатесі",
  },
}
// "zh-Hans", "pt_BR" → "zh", "pt"; неизвестный язык и недостающие строки — из английского
const T = { ...STRINGS.en, ...STRINGS[Device.language().toLowerCase().split(/[-_]/)[0]] }

// start/end/text — цветная тема, light/dark — акцент на белом и черном фоне
// "en_US", "zh_Hans_CN" → "US", "CN"
const REGION = (Device.locale().match(/_([A-Z]{2})$/) || [])[1]
const FAHRENHEIT_REGIONS = ["US", "LR", "MM", "BS", "BZ", "KY", "PW"]
const MPH_REGIONS = ["US", "GB", "LR", "MM"]
const MS_REGIONS = ["RU", "KZ", "BY", "UA", "UZ", "KG", "CN", "JP", "KR", "TW", "FI", "SE", "NO", "DK"]
const tempUnit = TEMP_UNIT !== "auto" ? TEMP_UNIT : FAHRENHEIT_REGIONS.includes(REGION) ? "F" : "C"
const windUnit = WIND_UNIT !== "auto" ? WIND_UNIT
  : MPH_REGIONS.includes(REGION) ? "mph" : MS_REGIONS.includes(REGION) || !REGION ? "ms" : "kmh"

// API отдает °C и м/с
const formatTemp = c => Math.round(tempUnit === "F" ? c * 9 / 5 + 32 : c)
function formatWind(ms) {
  if (windUnit === "mph") return `${Math.round(ms * 2.23694)} ${T.mph}`
  if (windUnit === "kmh") return `${Math.round(ms * 3.6)} ${T.kmh}`
  return `${ms} ${T.ms}`
}

const LEVELS = [
  { max: 50,  start: "#7BD86F", end: "#43A047", text: "#0B3D0B", light: "#2E7D32", dark: "#7BD86F" },
  { max: 100, start: "#FFE55C", end: "#F2BE00", text: "#4A3B00", light: "#B38600", dark: "#FFE55C" },
  { max: 150, start: "#FFB062", end: "#F57C00", text: "#3E1F00", light: "#E65100", dark: "#FFB062" },
  { max: 200, start: "#FF6B6B", end: "#C62828", text: "#FFFFFF", light: "#C62828", dark: "#FF6B6B" },
  { max: 300, start: "#B57EDC", end: "#6A1B9A", text: "#FFFFFF", light: "#6A1B9A", dark: "#B57EDC" },
  { max: Infinity, start: "#A0405A", end: "#5E0016", text: "#FFFFFF", light: "#7E0023", dark: "#D46A86" },
].map((l, i) => ({ ...l, label: T.levels[i] }))
const THEMES = ["color", "light", "dark", "system"]
const POLLUTANTS = { p2: "PM2.5", p1: "PM10", o3: "O₃", n2: "NO₂", s2: "SO₂", co: "CO" }
const API_ERRORS = {
  incorrect_api_key: T.badKey, api_key_expired: T.badKey,
  call_limit_reached: T.limit, too_many_requests: T.limit,
  city_not_found: T.notFound, no_nearest_station: T.notFound,
}

const fm = FileManager.local()

function cachePathFor(q) {
  const id = Object.values(q).join("_").toLowerCase().replace(/[^a-z0-9.-]+/g, "_")
  return fm.joinPath(fm.documentsDirectory(), `iqair-aqi-cache-${id}.json`)
}
function readJSON(path) {
  try { return fm.fileExists(path) ? JSON.parse(fm.readString(path)) : null }
  catch { return null }
}
function writeJSON(path, obj) { fm.writeString(path, JSON.stringify(obj)) }

const settingsPath = fm.joinPath(fm.documentsDirectory(), "iqair-aqi-settings.json")
const settings = readJSON(settingsPath) || {}

async function chooseTheme() {
  const current = settings.theme || "color"
  const a = new Alert()
  a.title = T.themeTitle
  THEMES.forEach(t => a.addAction((t === current ? "✓ " : "") + T.themes[t]))
  a.addCancelAction(T.keep)
  const i = await a.presentSheet()
  if (i === -1) return
  settings.theme = THEMES[i]
  writeJSON(settingsPath, settings)
}

function parseParam(raw) {
  const p = (raw || "").trim()
  if (!p || /^(auto|here|gps)$/i.test(p)) return { type: "auto" }
  const coords = p.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (coords) return { type: "coords", lat: coords[1], lon: coords[2] }
  const parts = p.split(",").map(s => s.trim()).filter(Boolean)
  if (parts.length === 3) return { type: "city", city: parts[0], state: parts[1], country: parts[2] }
  throw new Error(T.badParam)
}

let keyAsked = false
async function getApiKey() {
  if (API_KEY) return API_KEY
  if (Keychain.contains(KEYCHAIN_KEY)) return Keychain.get(KEYCHAIN_KEY)
  if (config.runsInWidget || keyAsked) return null
  keyAsked = true
  const a = new Alert()
  a.title = T.keyTitle
  a.message = T.keyMessage
  a.addTextField("API key")
  a.addAction(T.save)
  a.addCancelAction(T.cancel)
  if (await a.presentAlert() === -1) return null
  const key = a.textFieldValue(0).trim()
  if (key) Keychain.set(KEYCHAIN_KEY, key)
  return key || null
}

// В виджете Location.current() может долго висеть, поэтому ограничиваем ожидание.
// Не дождались — берем прошлые координаты, а если их нет, IQAir определит город по IP
async function currentCoords() {
  let timer
  try {
    Location.setAccuracyToThreeKilometers()
    const timeout = new Promise((_, reject) => {
      timer = Timer.schedule(LOCATION_TIMEOUT_SEC * 1000, false, () => reject(new Error("timeout")))
    })
    const { latitude, longitude } = await Promise.race([Location.current(), timeout])
    settings.lastCoords = { lat: latitude.toFixed(4), lon: longitude.toFixed(4) }
    writeJSON(settingsPath, settings)
    return settings.lastCoords
  } catch {
    return settings.lastCoords || null
  } finally {
    timer?.invalidate()
  }
}

async function buildUrl(q, key) {
  const base = "https://api.airvisual.com/v2"
  if (q.type === "city") {
    return `${base}/city?city=${encodeURIComponent(q.city)}&state=${encodeURIComponent(q.state)}` +
      `&country=${encodeURIComponent(q.country)}&key=${key}`
  }
  const c = q.type === "coords" ? q : await currentCoords()
  return `${base}/nearest_city?` + (c ? `lat=${c.lat}&lon=${c.lon}&` : "") + `key=${key}`
}

async function fetchData(q, key) {
  const req = new Request(await buildUrl(q, key))
  req.timeoutInterval = 15
  const json = await req.loadJSON()
  if (json.status !== "success") {
    const code = json.data?.message || ""
    if (API_ERRORS[code] === T.badKey && !API_KEY) Keychain.remove(KEYCHAIN_KEY)
    throw new Error(API_ERRORS[code] || code || T.apiError)
  }
  const d = json.data
  return {
    city: d.city,
    state: d.state,
    country: d.country,
    aqi: d.current.pollution.aqius,
    main: d.current.pollution.mainus,
    ts: d.current.pollution.ts,
    temp: d.current.weather.tp,
    hum: d.current.weather.hu,
    wind: d.current.weather.ws,
  }
}

const levelFor = aqi => LEVELS.find(l => aqi <= l.max)

function trendArrow(d) {
  if (d.prevAqi == null) return ""
  const diff = d.aqi - d.prevAqi
  return diff > 0 ? "↑" : diff < 0 ? "↓" : ""
}

function formatTime(ts) {
  // Короткий стиль учитывает регион и настройку 24-часового формата: "18:00" или "6:00 PM"
  const df = new DateFormatter()
  df.useNoDateStyle()
  df.useShortTimeStyle()
  return df.string(new Date(ts))
}

// Как на сайте: "Washington, D.C." → "washington-d-c"
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
function iqairUrl(d) {
  if (!d.country || !d.state) return "https://www.iqair.com/"
  return `https://www.iqair.com/air-quality/${[d.country, d.state, d.city].map(slug).join("/")}`
}

// В цветной теме уровень AQI — это фон, в остальных — цвет цифры и подписи
function palette(lvl, theme = "color") {
  if (theme === "color") {
    const g = new LinearGradient()
    g.colors = [new Color(lvl.start), new Color(lvl.end)]
    g.locations = [0, 1]
    return { gradient: g, text: new Color(lvl.text), accent: new Color(lvl.text) }
  }
  const light = { bg: "#FFFFFF", text: "#1C1C1E", accent: lvl.light }
  const dark = { bg: "#1C1C1E", text: "#FFFFFF", accent: lvl.dark }
  const pick = k => theme === "light" ? new Color(light[k])
    : theme === "dark" ? new Color(dark[k])
    : Color.dynamic(new Color(light[k]), new Color(dark[k]))
  return { bg: pick("bg"), text: pick("text"), accent: pick("accent") }
}

function addLine(w, text, size, color, opacity = 1, bold = false) {
  const t = w.addText(text)
  t.font = bold ? Font.semiboldSystemFont(size) : Font.systemFont(size)
  if (color) t.textColor = color
  t.textOpacity = opacity
  t.minimumScaleFactor = 0.7
  return t
}

// ── Экран блокировки ──
// Фон прозрачный, система сама перекрашивает виджет под обои. Поэтому рисуем
// белым, а второстепенное приглушаем прозрачностью.
// Отступы на экране блокировки задает система. Только для кольца их компенсируем:
// iOS добавляет поля вокруг содержимого, из-за чего кольцо выглядит уменьшенным.
// Отрицательный отступ их съедает; если кольцо обрезается по краям — уменьши по модулю
const RING_PAD = -8
const white = (alpha = 1) => new Color("#FFFFFF", alpha)

function leafIcon(stack, size) {
  const s = SFSymbol.named("leaf.fill")
  s.applyFont(Font.semiboldSystemFont(size))
  const img = stack.addImage(s.image)
  img.imageSize = new Size(size, size)
  img.tintColor = white()
  return img
}

function newContext(width, height) {
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true
  return ctx
}

const gaugeFraction = aqi => Math.min(Math.max(aqi / 300, 0.02), 1)

// Полоска-шкала 0–300 со скругленными краями
function gaugeBar(aqi, width, height) {
  const ctx = newContext(width, height)
  const bar = (w, color) => {
    const p = new Path()
    p.addRoundedRect(new Rect(0, 0, w, height), height / 2, height / 2)
    ctx.addPath(p)
    ctx.setFillColor(color)
    ctx.fillPath()
  }
  bar(width, white(0.3))
  bar(Math.max(height, width * gaugeFraction(aqi)), white())
  return ctx.getImage()
}

// Кольцо как у системных gauge-виджетов: дуга 270° с разрывом снизу, в разрыве — "AQI"
function gaugeRing(aqi, arrow) {
  const size = 76, c = size / 2, lw = 7, r = c - lw / 2 - 1
  const ctx = newContext(size, size)
  const at = (x, y, radius, deg) =>
    new Point(x + radius * Math.cos(deg * Math.PI / 180), y + radius * Math.sin(deg * Math.PI / 180))
  const steps = (from, to, n) => Array.from({ length: n + 1 }, (_, i) => from + (to - from) * i / n)
  // В DrawContext нет скругленных концов линий, поэтому дуга — это залитый контур:
  // внешний край, полукруг на конце, внутренний край, полукруг в начале
  const arc = (from, to, color) => {
    const n = Math.max(4, Math.ceil((to - from) / 3))
    const end = at(c, c, r, to), start = at(c, c, r, from)
    const p = new Path()
    p.addLines([
      ...steps(from, to, n).map(a => at(c, c, r + lw / 2, a)),
      ...steps(to, to + 180, 12).map(a => at(end.x, end.y, lw / 2, a)),
      ...steps(to, from, n).map(a => at(c, c, r - lw / 2, a)),
      ...steps(from + 180, from + 360, 12).map(a => at(start.x, start.y, lw / 2, a)),
    ])
    p.closeSubpath()
    ctx.addPath(p)
    ctx.setFillColor(color)
    ctx.fillPath()
  }
  arc(135, 405, white(0.3))
  arc(135, 135 + 270 * gaugeFraction(aqi), white())

  ctx.setTextColor(white())
  ctx.setTextAlignedCenter()
  ctx.setFont(Font.boldRoundedSystemFont(aqi >= 100 ? 22 : 25))
  ctx.drawTextInRect(String(aqi), new Rect(0, c - 15, size, 30))
  ctx.setFont(Font.semiboldSystemFont(11))
  ctx.drawTextInRect(arrow ? `AQI ${arrow}` : "AQI", new Rect(0, size - 18, size, 15))
  return ctx.getImage()
}

// [лист] Воздух          11°
// 87↑
// Умеренно
// [■■■■□□□□□]       18:00
function lockRectangular(w, d, lvl, arrow, stale) {
  const head = w.addStack()
  head.centerAlignContent()
  leafIcon(head, 12)
  head.addSpacer(4)
  addLine(head, T.air, 13, white(), 1, true)
  head.addSpacer()
  addLine(head, `${formatTemp(d.temp)}°`, 13, white(), 1, true)

  const row = w.addStack()
  row.centerAlignContent()
  const num = row.addText(String(d.aqi))
  num.font = Font.boldRoundedSystemFont(20)
  num.textColor = white()
  if (arrow) {
    const a = row.addText(arrow)
    a.font = Font.boldSystemFont(12)
    a.textColor = white()
  }

  // Подпись отдельной строкой: длинные варианты вроде "Unhealthy for sensitive groups" ужимаются
  addLine(w, lvl.label, 12, white(), 0.85, true).lineLimit = 1

  const foot = w.addStack()
  foot.centerAlignContent()
  const bar = foot.addImage(gaugeBar(d.aqi, 64, 5))
  bar.imageSize = new Size(64, 5)
  foot.addSpacer()
  addLine(foot, `${stale ? "⚠︎ " : ""}${formatTime(d.ts)}`, 11, white(), 0.7)
}

function createWidget(d, stale) {
  const lvl = levelFor(d.aqi)
  const fam = config.widgetFamily || "small"
  const arrow = trendArrow(d)
  const w = new ListWidget()
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60e3)
  w.url = iqairUrl(d)

  if (fam === "accessoryInline") {
    // Строка над часами: система оставляет одну картинку и один текст
    leafIcon(w, 12)
    addLine(w, `${T.air} ${d.aqi}${arrow} · ${formatTemp(d.temp)}°`, 12)
    return w
  }
  if (fam === "accessoryRectangular") {
    lockRectangular(w, d, lvl, arrow, stale)
    return w
  }
  if (fam === "accessoryCircular") {
    w.setPadding(RING_PAD, RING_PAD, RING_PAD, RING_PAD)
    w.addImage(gaugeRing(d.aqi, arrow)).centerAlignImage()
    return w
  }

  const p = palette(lvl, settings.theme)
  if (p.gradient) w.backgroundGradient = p.gradient
  else w.backgroundColor = p.bg
  w.setPadding(14, 14, 14, 14)
  const tc = p.text

  addLine(w, d.city.toUpperCase(), 11, tc, 0.75, true)
  w.addSpacer(2)

  const row = w.addStack()
  row.centerAlignContent()
  const num = row.addText(String(d.aqi))
  num.font = Font.boldRoundedSystemFont(44)
  num.textColor = p.accent
  if (arrow) {
    row.addSpacer(4)
    const a = row.addText(arrow)
    a.font = Font.boldSystemFont(20)
    a.textColor = p.accent
  }

  const lab = addLine(w, lvl.label, 13, p.accent, 1, true)
  lab.lineLimit = 2

  w.addSpacer()
  addLine(w, `${POLLUTANTS[d.main] ?? d.main} · ${formatTemp(d.temp)}°${tempUnit}`, 11, tc, 0.85)
  if (fam !== "small") addLine(w, `${T.humidity} ${d.hum}% · ${T.wind} ${formatWind(d.wind)}`, 11, tc, 0.85)
  addLine(w, `${stale ? T.cached + ", " : ""}${T.updated} ${formatTime(d.ts)}`, 9, tc, 0.6)
  return w
}

function errorWidget(msg) {
  const w = new ListWidget()
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60e3)
  const fam = config.widgetFamily || "small"
  if (fam.startsWith("accessory")) {
    if (fam !== "accessoryRectangular") {
      addLine(w, "AQI ⚠︎", 12, white(), 1, true).centerAlignText()
      return w
    }
    addLine(w, "IQAir ⚠︎", 13, white(), 1, true)
    addLine(w, msg, 11, white(), 0.8).lineLimit = 3
    return w
  }
  w.backgroundColor = new Color("#333333")
  addLine(w, "IQAir", 12, Color.white(), 1, true)
  w.addSpacer(4)
  addLine(w, msg, 11, Color.white(), 0.8)
  return w
}

async function buildWidget() {
  let q
  try { q = parseParam(args.widgetParameter) }
  catch (e) { return errorWidget(e.message) }

  const cachePath = cachePathFor(q)
  const cache = readJSON(cachePath)
  const view = c => ({ ...c.data, prevAqi: c.prevAqi })
  if (config.runsInWidget && cache?.fetchedAt && Date.now() - cache.fetchedAt < MIN_FETCH_MIN * 60e3) {
    return createWidget(view(cache), false)
  }

  try {
    const key = await getApiKey()
    if (!key) throw new Error(T.noKey)
    const data = await fetchData(q, key)
    // предыдущее значение берем только когда пришел новый замер (IQAir обновляет раз в час)
    const prevAqi = cache && cache.data.ts !== data.ts ? cache.data.aqi : cache?.prevAqi
    const fresh = { data, prevAqi, fetchedAt: Date.now() }
    writeJSON(cachePath, fresh)
    return createWidget(view(fresh), false)
  } catch (e) {
    return cache ? createWidget(view(cache), true) : errorWidget(e.message)
  }
}

// В приложении: сначала ключ (если его нет), потом выбор темы, потом превью
if (!config.runsInWidget) {
  await getApiKey()
  await chooseTheme()
}
const widget = await buildWidget()
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentSmall()
Script.complete()
