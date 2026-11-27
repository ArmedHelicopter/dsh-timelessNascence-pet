// dsh-nascence-pet — 硬件状态挂牌（极简 HUD：navy / 白卡片 + 发丝线）
//
// CPU / 内存 / GPU 读数来自 GET /dsh-nascence/hardware。
// 挂在桌宠上方或下方（设置里可选，默认下方），页面隐藏、屏保亮板或开关关闭时停采样。

import { HARDWARE_PATH } from '../shared/protocol.js'
import { palette as themePalette, detectScheme, watchScheme, FONT_MONO, CARD_RADIUS } from './theme.js'
import {
  buildSegments,
  PLATE_MAX_ROW_WIDTH, PLATE_LINE_HEIGHT, PLATE_PADDING_Y, PLATE_PADDING_X,
  PLATE_GROUP_GAP, PLATE_SEGMENT_GAP, PLATE_DOT_SIZE, PLATE_FONT_SIZE,
} from './plate-format.js'

var POLL_MS = 2000
var FETCH_TIMEOUT_MS = 2500
var GAP = 8

// 挂牌配色：读数统一用主文字色，状态只由左侧小圆点表达（钴蓝 = 正常）
function plateColors(scheme) {
  var t = themePalette(scheme)
  return {
    surface: t.card, border: t.line, shadow: t.shadow,
    text: t.text, cpu: t.text, gpu: t.text, mem: t.text,
    ok: t.accent, warn: t.warn, error: scheme === 'light' ? '#d0384f' : '#ff6b7f', idle: t.dim,
  }
}

export function createPlate(deps) {
  var settings = deps.settings
  var pet = deps.pet
  var size = deps.size
  var container = deps.container

  var el = null
  var boxEl = null
  var rowEl = null
  var segNodes = {}
  var timer = 0
  var running = false
  var inflight = null
  var lastSample = null
  var lastError = null
  var lastPos = null
  var theme = detectScheme()
  var palette = plateColors(theme)
  var unwatch = null

  function createSeg() {
    var wrap = document.createElement('span')
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:' + PLATE_SEGMENT_GAP + 'px;white-space:nowrap'
    var dot = document.createElement('span')
    dot.style.cssText = [
      'display:inline-block',
      'width:' + PLATE_DOT_SIZE + 'px',
      'height:' + PLATE_DOT_SIZE + 'px',
      'border-radius:50%',
      'flex:0 0 auto',
      'background:' + palette.idle,
    ].join(';')
    var text = document.createElement('span')
    text.style.cssText = 'color:' + palette.text + ';white-space:nowrap'
    wrap.appendChild(dot)
    wrap.appendChild(text)
    return { wrap: wrap, dot: dot, text: text }
  }

  function ensure() {
    if (el) return
    el = document.createElement('div')
    el.id = 'dsh-nascence-pet-plate'
    el.setAttribute('data-tn-pet-plate', '')
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('data-tn-pet-plate-scheme', theme)
    el.style.cssText = [
      'position:fixed', 'left:0', 'top:0', 'display:none',
      'z-index:2147482001',
      'pointer-events:none', 'user-select:none',
      'width:max-content',
      'max-width:' + PLATE_MAX_ROW_WIDTH + 'px',
      'font-family:' + FONT_MONO,
      'font-size:' + PLATE_FONT_SIZE + 'px',
      'line-height:' + PLATE_LINE_HEIGHT + 'px',
      'font-variant-numeric:tabular-nums',
      'letter-spacing:0',
    ].join(';')
    boxEl = document.createElement('div')
    boxEl.style.cssText = [
      'border:1px solid transparent',
      'border-radius:' + CARD_RADIUS + 'px',
      'overflow:hidden',
    ].join(';')
    rowEl = document.createElement('div')
    rowEl.style.cssText = [
      'display:flex', 'flex-wrap:wrap', 'align-items:center',
      'column-gap:' + PLATE_GROUP_GAP + 'px', 'row-gap:0px',
      'padding:' + PLATE_PADDING_Y + 'px ' + PLATE_PADDING_X + 'px',
    ].join(';')
    boxEl.appendChild(rowEl)
    el.appendChild(boxEl)
    ;(container || document.body).appendChild(el)
    applyPalette()
    render(null)
  }

  function applyPalette() {
    if (!el) return
    el.setAttribute('data-tn-pet-plate-scheme', theme)
    el.style.filter = 'drop-shadow(0 4px 10px ' + palette.shadow + ')'
    el.style.color = palette.text
    if (boxEl) {
      boxEl.style.borderColor = palette.border
      boxEl.style.background = palette.surface
    }
  }

  function syncTheme() {
    var next = detectScheme()
    if (next === theme) return
    theme = next
    palette = plateColors(theme)
    applyPalette()
    render(lastSample)
  }

  function render(sample) {
    if (!el) return
    var segments = buildSegments(sample)
    var seen = {}
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i]
      seen[seg.key] = true
      var node = segNodes[seg.key]
      if (!node) {
        node = createSeg()
        segNodes[seg.key] = node
        rowEl.appendChild(node.wrap)
      }
      if (rowEl.childNodes[i] !== node.wrap) rowEl.insertBefore(node.wrap, rowEl.childNodes[i] || null)
      node.dot.style.background = palette[seg.level] || palette.idle
      node.text.style.color = palette[seg.tone] || palette.text
      node.text.textContent = seg.text
    }
    Object.keys(segNodes).forEach(function (key) {
      if (seen[key]) return
      var stale = segNodes[key]
      if (stale.wrap.parentNode) stale.wrap.parentNode.removeChild(stale.wrap)
      delete segNodes[key]
    })
    position()
  }

  function position() {
    if (!el || !pet.pos || !size) return
    var s = size()
    var w = el.offsetWidth || 0
    var h = el.offsetHeight || 0
    if (!w || !h) return

    var wantsTop = settings.platePosition === 'top'
    var top = wantsTop ? pet.pos.y - h - GAP : pet.pos.y + s.h + GAP
    if (wantsTop && top < 8) top = pet.pos.y + s.h + GAP
    if (!wantsTop && top + h > window.innerHeight - 8) top = pet.pos.y - h - GAP

    var left = pet.pos.x + s.w / 2 - w / 2
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8))
    var next = { left: Math.round(left), top: Math.round(top) }
    if (lastPos && lastPos.left === next.left && lastPos.top === next.top) return
    lastPos = next
    el.style.left = next.left + 'px'
    el.style.top = next.top + 'px'
  }

  function shouldPoll() {
    if (settings.plate !== true) return false
    if (!running) return false
    if (document.hidden) return false
    try { if (document.documentElement.hasAttribute('data-dsh-idle-crt')) return false } catch (err) {}
    return true
  }

  function show() {
    ensure()
    if (el.style.display !== 'block') {
      el.style.display = 'block'
      lastPos = null
    }
    position()
  }

  function hide() {
    if (!el) return
    el.style.display = 'none'
    lastPos = null
  }

  function abortInflight() {
    if (inflight) {
      try { inflight.abort() } catch (err) {}
      inflight = null
    }
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = 0 }
  }

  async function poll() {
    if (!shouldPoll() || inflight) return
    var controller = typeof AbortController === 'function' ? new AbortController() : null
    inflight = controller
    var timeout = controller ? setTimeout(function () { try { controller.abort() } catch (err) {} }, FETCH_TIMEOUT_MS) : 0
    try {
      var res = await fetch(HARDWARE_PATH, { cache: 'no-store', signal: controller ? controller.signal : undefined })
      if (!res || !res.ok) throw new Error('HTTP ' + ((res && res.status) || 0))
      var data = await res.json()
      if (!data || data.ok !== true) throw new Error('bad payload')
      lastSample = data
      lastError = null
      render(data)
    } catch (err) {
      lastError = String((err && err.message) || err)
    } finally {
      if (timeout) clearTimeout(timeout)
      if (inflight === controller) inflight = null
    }
  }

  function sync() {
    if (!shouldPoll()) {
      abortInflight()
      stopTimer()
      hide()
      return
    }
    show()
    if (!timer) {
      timer = setInterval(poll, POLL_MS)
      poll()
    }
  }

  function watchTheme() {
    if (!unwatch) unwatch = watchScheme(syncTheme)
  }

  function unwatchTheme() {
    if (unwatch) unwatch()
    unwatch = null
  }

  function start() {
    running = true
    watchTheme()
    syncTheme()
    sync()
  }

  function pause() {
    running = false
    abortInflight()
    stopTimer()
    hide()
  }

  function resume() {
    running = true
    watchTheme()
    syncTheme()
    sync()
  }

  function follow() {
    if (el && el.style.display === 'block') position()
  }

  function applySettings() {
    if (!settings.plate) {
      abortInflight()
      stopTimer()
      hide()
      return
    }
    if (running) sync()
  }

  function dispose() {
    abortInflight()
    stopTimer()
    unwatchTheme()
    running = false
    if (el && el.parentNode) el.parentNode.removeChild(el)
    el = null
    boxEl = null
    rowEl = null
    segNodes = {}
    lastSample = null
    lastPos = null
  }

  function debug() {
    return {
      active: !!(el && el.style.display === 'block'),
      enabled: settings.plate === true,
      position: settings.platePosition || 'bottom',
      theme: theme,
      running: running,
      lastError: lastError,
      sample: lastSample,
    }
  }

  return {
    start: start,
    pause: pause,
    resume: resume,
    follow: follow,
    applySettings: applySettings,
    dispose: dispose,
    debug: debug,
    getSample: function () { return lastSample },
  }
}
