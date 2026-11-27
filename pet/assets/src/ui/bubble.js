// dsh-nascence-pet — 对话气泡（工厂）
//
// 结构：一个 fixed 容器里放「SVG 背景（圆角卡片 + 发丝线 + 尾巴）+ 文本层」，
// 默认无衬线字体（像素字体是可选项，默认关闭）；整体 pointer-events:none，不挡下面 UI。
// 依赖注入：getState() 读 /state、pet、size()、settings。

import { PREFIX } from '../core/env.js'
import { palette, detectScheme, pixelFontEnabled, FONT_SANS, FONT_PIXEL, CARD_RADIUS } from './theme.js'

export function createBubble(deps) {
  var getState = deps.getState
  var pet = deps.pet
  var size = deps.size
  var settings = deps.settings
  var container = deps.container

  // ————————————————————— 气泡 —————————————————————
  // 默认：navy（深色）/ 白（浅色）圆角卡片 + 1px 发丝线，无衬线字体。
  // 像素字体（可选）：Ark Pixel 12px 只有整数倍渲染才清晰 → 用 24/36/48 三档。
  var BUBBLE_FONT = FONT_SANS
  var BUBBLE_SIZE = 15        // 辅助行
  var BUBBLE_SIZE_MID = 22    // 金额行降档
  var BUBBLE_SIZE_BIG = 28    // 金额行
  var BUBBLE_LINE = 22
  var LINE_MID = 30
  var LINE_BIG = 36
  var BUBBLE_PAD = 12
  var BUBBLE_HIDE_MS = 5200
  // 对话/事件气泡：当前 4.2s 作为最短基准，之后按可见字数延长。
  var BUBBLE_MIN_MS = 4200
  var BUBBLE_CHAR_MS = 90
  var BUBBLE_CORNER = CARD_RADIUS
  var pixelMode = false

  /** 按当前字体偏好切换字号档位（像素字体保持整数倍） */
  function syncMetrics() {
    pixelMode = pixelFontEnabled()
    if (pixelMode) {
      BUBBLE_FONT = FONT_PIXEL
      BUBBLE_SIZE = 24; BUBBLE_SIZE_MID = 36; BUBBLE_SIZE_BIG = 48
      BUBBLE_LINE = 30; LINE_MID = 44; LINE_BIG = 56
    } else {
      BUBBLE_FONT = FONT_SANS
      BUBBLE_SIZE = 15; BUBBLE_SIZE_MID = 22; BUBBLE_SIZE_BIG = 28
      BUBBLE_LINE = 22; LINE_MID = 30; LINE_BIG = 36
    }
  }
  syncMetrics()
  var TAIL_W = 14
  var TAIL_H = 10

  /** 气泡缩放系数：100% 为基准，50%–200% */
  function bubbleFactor() {
    var v = Number(settings.bubbleScale)
    if (!isFinite(v)) v = 100
    return Math.min(200, Math.max(50, v)) / 100
  }

  /** 基准像素 → 实际像素（至少 1px） */
  function bubblePx(base) {
    return Math.max(1, Math.round(base * bubbleFactor()))
  }

  /** 基准字号 → 行高（三档，按缩放系数取整） */
  function bubbleLineH(size) {
    var base = size >= BUBBLE_SIZE_BIG ? LINE_BIG : (size >= BUBBLE_SIZE_MID ? LINE_MID : BUBBLE_LINE)
    return Math.max(1, Math.round(base * bubbleFactor()))
  }
  var bubbleEl = null
  var bubbleTextEl = null
  var bubbleTailEl = null
  var bubbleSvg = null
  var bubbleW = 0
  var bubbleH = 0
  var bubbleTailCenter = 0
  var bubbleTailUp = false
  var bubbleHideTimer = 0
  var bubbleTickTimer = 0

  function hideBubble() {
    bubbleShown = false
    bubbleDialogText = ''
    bubbleDialogUntil = 0
    bubbleEventRows = null
    bubbleEventText = ''
    if (bubbleEl) {
      try { bubbleEl.getAnimations().forEach(function (a) { a.cancel() }) } catch (err) {}
      bubbleEl.style.opacity = '0'
    }
    if (bubbleTickTimer) { clearInterval(bubbleTickTimer); bubbleTickTimer = 0 }
  }
  var bubbleEventText = ''
  var bubbleEventRows = null
  var bubbleEventUntil = 0
  var bubbleDialogText = ''
  var bubbleDialogUntil = 0
  var bubbleMode = 'info'   // 'event'（事件反馈，过期即收）| 'info'（点击查看，常驻 5.2s）

  function ensureFont() {
    syncMetrics()
    if (!pixelMode) return
    if (document.getElementById('dsh-nascence-pet-font')) return
    var st = document.createElement('style')
    st.id = 'dsh-nascence-pet-font'
    st.textContent = '@font-face{font-family:ArkPixel12;src:url("' + PREFIX
      + '/assets/fonts/ark-pixel-12px-zh_hans.woff2") format("woff2");font-display:block}'
    document.head.appendChild(st)
    // 字体是异步加载的：加载完重排一次，避免用回退字体量错宽度
    try {
      document.fonts.load('12px ArkPixel12').then(function () {
        if (bubbleShown) refreshBubble()
      }).catch(function () {})
    } catch (err) {}
  }

  function ensureBubble() {
    if (bubbleEl) return
    bubbleEl = document.createElement('div')
    bubbleEl.id = 'dsh-nascence-pet-bubble'
    bubbleEl.style.cssText = [
      'position:fixed', 'left:0', 'top:0', 'z-index:2147482002',
      'pointer-events:none', 'opacity:0',
      'transform-origin:center bottom',
    ].join(';')

    bubbleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    bubbleSvg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'
    bubbleEl.appendChild(bubbleSvg)

    bubbleTextEl = document.createElement('div')
    bubbleTextEl.style.cssText = [
      'position:absolute', 'white-space:pre',
      'letter-spacing:0',
    ].join(';')
    bubbleEl.appendChild(bubbleTextEl)

    ;(container || document.body).appendChild(bubbleEl)
  }

  // 单行最大宽度（CSS px，100% 基准）：放宽到 420 让常见内容单行显示，超长仍会折行兜底。
  var BUBBLE_MAX_W = 420

  function measureText(text, size, bold) {
    var px = bubblePx(size || BUBBLE_SIZE)
    var cv = measureText._cv || (measureText._cv = document.createElement('canvas'))
    var ctx = cv.getContext('2d')
    ctx.font = (bold ? (pixelMode ? '700 ' : '600 ') : '') + px + 'px ' + BUBBLE_FONT
    return ctx.measureText(text).width
  }

  /** 按像素宽度折行：优先在空格处断（英文），中文按字符断 */
  function wrapText(text, maxWidth, size) {
    if (measureText(text, size) <= maxWidth) return [text]
    var out = []
    var cur = ''
    var lastSpace = -1
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i)
      if (cur && measureText(cur + ch, size) > maxWidth) {
        if (lastSpace > 0 && measureText(cur.slice(0, lastSpace), size) > maxWidth * 0.45) {
          out.push(cur.slice(0, lastSpace))
          cur = cur.slice(lastSpace + 1) + ch
        } else {
          out.push(cur)
          cur = ch
        }
        lastSpace = -1
      } else {
        cur += ch
      }
      if (ch === ' ') lastSpace = cur.length - 1
    }
    if (cur) out.push(cur)
    return out
  }

  // 气泡外框：圆角卡片 + 小三角尾巴；尾巴默认朝下（气泡在桌宠上方），
  // 桌面边缘放不下时气泡翻到下方，尾巴改为朝上。坐标偏移 0.5 让 1px 描边落在整像素上。
  function bubblePath(w, h, tailX, tailUp) {
    var r = Math.min(bubblePx(BUBBLE_CORNER), Math.floor(w / 2), Math.floor(h / 3))
    var t = bubblePx(TAIL_H)
    var tw = bubblePx(TAIL_W)
    var o = 0.5
    var x0 = o
    var x1 = w - o
    var tm = tailX + tw / 2
    if (!tailUp) {
      var y0 = o
      var y1 = h - t - o
      return [
        'M', x0 + r, y0, 'H', x1 - r, 'Q', x1, y0, x1, y0 + r, 'V', y1 - r, 'Q', x1, y1, x1 - r, y1,
        'H', tailX + tw, 'L', tm, h - o, 'L', tailX, y1,
        'H', x0 + r, 'Q', x0, y1, x0, y1 - r, 'V', y0 + r, 'Q', x0, y0, x0 + r, y0, 'Z',
      ].join(' ')
    }
    var top = t + o
    var bottom = h - o
    return [
      'M', x0 + r, top, 'H', tailX, 'L', tm, o, 'L', tailX + tw, top,
      'H', x1 - r, 'Q', x1, top, x1, top + r, 'V', bottom - r, 'Q', x1, bottom, x1 - r, bottom,
      'H', x0 + r, 'Q', x0, bottom, x0, bottom - r, 'V', top + r, 'Q', x0, top, x0 + r, top, 'Z',
    ].join(' ')
  }

  // 只重画外框/尾巴（拖动时每帧调用，不重复折行与排版）
  function drawBubbleFrame() {
    var w = bubbleW
    var h = bubbleH
    var tw = bubblePx(TAIL_W)
    var tailX = Math.round(Math.min(
      Math.max(8, bubbleTailCenter - tw / 2),
      w - tw - 8,
    ))
    bubbleSvg.setAttribute('width', String(w + 6))
    bubbleSvg.setAttribute('height', String(h + 6))
    bubbleSvg.setAttribute('viewBox', `0 0 ${w + 6} ${h + 6}`)
    var d = bubblePath(w, h, tailX, bubbleTailUp)
    var t = palette(detectScheme())
    bubbleSvg.innerHTML =
      '<path d="' + d + '" fill="' + t.card + '" stroke="' + t.line + '" stroke-width="1"/>'
    bubbleEl.style.filter = 'drop-shadow(0 6px 16px ' + t.shadow + ')'
    bubbleTextEl.style.color = t.text
  }

  // 气泡内容按「行」渲染，每行可独立字号/颜色/粗细。行对象：{ text, size, color, bold }
  // 兼容旧调用：直接给字符串数组时按辅助字号渲染。
  function normalizeRows(rows) {
    var out = []
    var tiers = settings.bubbleTiers !== false
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i]
      if (r === null || r === undefined) continue
      if (typeof r === 'string') out.push({ text: r, size: BUBBLE_SIZE })
      else out.push({
        text: String(r.text === undefined || r.text === null ? '' : r.text),
        size: tiers ? (r.size || BUBBLE_SIZE) : BUBBLE_SIZE,
        color: tiers ? (r.color || '') : '',
        bold: tiers ? !!r.bold : false,
      })
    }
    return out
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function renderBubble(rows, tailCenterX, tailUp) {
    ensureFont()
    ensureBubble()
    rows = normalizeRows(rows)
    // 折行规则：
    //   1) 文本里显式写的换行符优先作为硬换行（调用方自己控制分行）；
    //   2) 每段再按像素宽度软折行，避免单行把气泡拉得过宽。
    var maxW = bubblePx(BUBBLE_MAX_W)
    var flat = []
    for (var li = 0; li < rows.length; li++) {
      var row = rows[li]
      var segments = String(row.text).split(/\r?\n/)
      for (var si = 0; si < segments.length; si++) {
        var parts = wrapText(segments[si], maxW, row.size)
        for (var pi = 0; pi < parts.length; pi++) {
          flat.push({ text: parts[pi], size: row.size, color: row.color, bold: row.bold })
        }
      }
    }
    rows = flat
    var widest = 0
    var totalH = 0
    for (var i = 0; i < rows.length; i++) {
      widest = Math.max(widest, measureText(rows[i].text, rows[i].size, rows[i].bold))
      totalH += bubbleLineH(rows[i].size)
    }
    var pad = bubblePx(BUBBLE_PAD)
    var tailH = bubblePx(TAIL_H)
    var w = Math.ceil(widest) + pad * 2 + 4
    var h = totalH + pad * 2 + tailH
    // 对齐到偶数像素，保证边缘清晰
    w = Math.ceil(w / 2) * 2
    h = Math.ceil(h / 2) * 2
    bubbleW = w
    bubbleH = h
    // 容器本身没有内容流（子元素全是绝对定位），必须显式给尺寸
    bubbleEl.style.width = (w + 6) + 'px'
    bubbleEl.style.height = (h + 6) + 'px'

    bubbleTailCenter = tailCenterX || w / 2
    bubbleTailUp = !!tailUp
    drawBubbleFrame()

    bubbleTextEl.style.fontFamily = BUBBLE_FONT
    bubbleTextEl.style.webkitFontSmoothing = pixelMode ? 'none' : ''
    bubbleTextEl.style.left = (pad + 2) + 'px'
    bubbleTextEl.style.top = ((tailUp ? tailH : 0) + pad + 1) + 'px'
    // 逐行建 span：字号/颜色/粗细各自独立，行高按字号取整数倍
    var html = ''
    for (var ri = 0; ri < rows.length; ri++) {
      var rr = rows[ri]
      var style = 'display:block;font-size:' + bubblePx(rr.size) + 'px;line-height:' + bubbleLineH(rr.size) + 'px'
      if (rr.color) style += ';color:' + rr.color
      if (rr.bold) style += ';font-weight:' + (pixelMode ? '700' : '600')
      html += '<span style="' + style + '">' + escapeHtml(rr.text) + '</span>'
    }
    bubbleTextEl.innerHTML = html
  }

  function fmtMoney(value, currency) {
    if (value === null || value === undefined) return '--'
    var n = Number(value)
    if (!isFinite(n)) return '--'
    return (currency === 'USD' ? '$' : '¥') + n.toFixed(2)
  }

  /** HH:MM:SS（倒计时显示用） */
  function hhmmss(ms) {
    var totalMinutes = Math.max(0, Math.round(ms / 60000))
    var pad = function (n) { return String(n).padStart(2, '0') }
    var h = Math.floor(totalMinutes / 60)
    var m = totalMinutes % 60
    // 不足 1 小时时不显示「00时」，读起来更短
    return (h > 0 ? pad(h) + '时' : '') + pad(m) + '分'
  }

  var PROVIDER_ALIAS = {
    deepseek: '官方',
    openai: 'OpenAI',
    anthropic: 'Claude',
    google: 'Google',
    xai: 'Grok',
  }

  /** provider 缩写；未知/空返回空串（由调用方决定是否省略） */
  function shortProvider(provider) {
    var p = String(provider || '').trim()
    if (!p) return ''
    var alias = PROVIDER_ALIAS[p.toLowerCase()]
    if (alias) return alias
    return p.length > 8 ? p.slice(0, 8) : p
  }

  /** 模型缩写：去掉 deepseek- 前缀与日期后缀，太长再截断 */
  function shortModel(model) {
    var m = String(model || '').trim()
    if (!m) return ''
    m = m.replace(/^deepseek-/i, '').replace(/-\d{8}$/, '')
    return m.length > 14 ? m.slice(0, 14) : m
  }

  // 使用源脚注：把当日花费按 provider/model 聚合成一行短标签。
  // 同一 provider 连续出现时只写一次，例：官方 v4-pro ¥1.60 · v4-flash ¥0.24
  function sourceFootnote(sp) {
    var list = sp && sp.sources
    if (!Array.isArray(list) || !list.length) return ''
    var parts = []
    var shown = 0
    var lastProvider = null
    for (var i = 0; i < list.length && shown < 3; i++) {
      var rec = list[i]
      var cost = Number(rec.cost) || 0
      if (cost <= 0) continue
      var prov = shortProvider(rec.provider)
      var mdl = shortModel(rec.model)
      var label = ''
      if (prov && prov !== lastProvider) label = prov + (mdl ? ' ' + mdl : '')
      else label = mdl
      if (!label) label = '未知源'
      lastProvider = prov || lastProvider
      parts.push(label + ' ' + fmtMoney(cost, 'CNY'))
      shown++
    }
    if (!parts.length) return ''
    var rest = list.length - shown
    if (rest > 0) parts.push('+' + rest)
    return parts.join(' · ')
  }

  // 气泡内容：金额行最大，其余为小字辅助行（分级排版由 bubbleTiers 开关控制）
  function bubbleLines() {
    var tone = palette(detectScheme())
    // 事件反馈期间**只显示反馈内容**，不掺余额/花费/峰谷
    if ((bubbleEventRows || bubbleEventText) && Date.now() < bubbleEventUntil) {
      if (bubbleEventRows) {
        return bubbleEventRows.map(function (r) {
          var tier = r.tier
          var size = r.size
          if (!size) size = tier === 'title' ? BUBBLE_SIZE + (pixelMode ? 6 : 3) : tier === 'number' ? BUBBLE_SIZE_BIG : tier === 'tag' ? BUBBLE_SIZE - (pixelMode ? 4 : 2) : BUBBLE_SIZE
          return {
            text: r.text,
            size: size,
            color: r.color || (tier === 'tag' ? tone.dim : tier === 'title' ? tone.accent : ''),
            bold: r.bold === undefined ? (tier === 'title' || tier === 'number') : !!r.bold,
          }
        })
      }
      return [{ text: bubbleEventText, size: BUBBLE_SIZE }]
    }
    // 点击交互：复用完整信息气泡，对话放最后一行、常规字重，金额前加“余额”
    if (bubbleDialogText && Date.now() < bubbleDialogUntil) {
      var info = infoLines()
      if (info.length && info[0].bold && info[0].size >= BUBBLE_SIZE_MID) {
        info[0] = { text: '余额 ' + info[0].text, size: info[0].size, bold: info[0].bold }
      }
      return info.concat([{ text: bubbleDialogText, size: BUBBLE_SIZE, bold: false }])
    }
    return infoLines()
  }

  function infoLines() {
    var tone = palette(detectScheme())
    var rows = []
    var s = getState()
    var b = s && s.balance
    if (b && b.ok) {
      // 金额单独成行、放到最大字号；金额太长（如 ¥12345.67）时降一档，避免被折行
      var amountText = fmtMoney(b.total, b.currency)
      var amountSize = measureText(amountText, BUBBLE_SIZE_BIG) > bubblePx(BUBBLE_MAX_W)
        ? BUBBLE_SIZE_MID
        : BUBBLE_SIZE_BIG
      rows.push({ text: amountText, size: amountSize, bold: true })
      var hint = ''
      if (b.low) hint = '星尘快耗尽了！'
      if (b.stale) hint = (hint ? hint + ' ' : '') + '未刷新'
      if (hint) rows.push({ text: hint, size: BUBBLE_SIZE, color: tone.warn })
    } else if (b && b.signedOut) {
      rows.push({ text: '管理员还没有登录视界哦', size: BUBBLE_SIZE })
    } else {
      rows.push({ text: '嗯……星尘数据还没同步', size: BUBBLE_SIZE })
    }
    if (s) {
      var sp = s.spend
      if (sp) {
        var parts = ['今日坍缩 ' + fmtMoney(sp.today, 'CNY')]
        if (Number(sp.turnAmount) > 0) parts.push('本轮 ' + fmtMoney(sp.turnAmount, 'CNY'))
        rows.push({ text: parts.join(' · '), size: BUBBLE_SIZE })
        // 使用源脚注：同样字号、颜色压淡
        var foot = sourceFootnote(sp)
        if (foot) rows.push({ text: foot, size: BUBBLE_SIZE, color: tone.dim })
      }
      var peak = s.period === 'peak'
      var left = s.periodNextChangeAt ? Math.max(0, s.periodNextChangeAt - Date.now()) : null
      rows.push({
        text: (peak ? '潮汐高峰' : '引力低潮') + (left !== null ? ' 距' + (peak ? '低潮' : '高峰') + ' ' + hhmmss(left) : ''),
        size: BUBBLE_SIZE,
        color: peak ? tone.accent : tone.dim,
      })
    }
    return rows
  }

  function placeBubble() {
    if (!bubbleEl || !pet.pos) return { tailCenter: bubbleW / 2, below: false }
    var s = size()
    var centerX = pet.pos.x + s.w / 2
    // 尾巴不放在正中：气泡主体朝屏幕内侧展开，尾巴落在宽度的 32% / 68% 处
    var ratio = centerX < window.innerWidth / 2 ? 0.32 : 0.68
    var left = Math.round(centerX - bubbleW * ratio)
    left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - bubbleW - 8))
    var top = Math.round(pet.pos.y - bubbleH - 2)
    var below = top < 8
    if (below) top = Math.round(pet.pos.y + s.h + 2)
    bubbleEl.style.left = left + 'px'
    bubbleEl.style.top = top + 'px'
    // 弹出动画的轴心：在桌宠上方时用底边，翻到下方时用顶边
    bubbleEl.style.transformOrigin = below ? 'center top' : 'center bottom'
    // 尾巴仍然指向桌宠中心；气泡被夹到边缘时跟着偏移，但保证不贴边
    var tw = bubblePx(TAIL_W)
    var tailCenter = Math.min(
      Math.max(tw / 2 + 8, centerX - left),
      Math.max(tw / 2 + 8, bubbleW - tw / 2 - 8),
    )
    return { tailCenter: tailCenter, below: below }
  }

  function refreshBubble() {
    if (!pet.pos) return
    ensureFont()
    ensureBubble()
    var lines = bubbleLines()
    // 1) 先按占位尾巴量出尺寸；2) 用真实尺寸判定上下/左右；3) 用正确尾巴重画再落位
    renderBubble(lines, 0, false)
    var pos = placeBubble()
    renderBubble(lines, pos.tailCenter, pos.below)
    placeBubble()
  }

  // 拖动时气泡跟着桌宠走：只更新位置与外框，不重新折行/不重建文字
  // （与 refreshBubble 分开，避免每帧 measureText 造成拖拽掉帧）
  var bubbleFollowRaf = 0
  function followBubble() {
    if (!bubbleShown || !bubbleEl || !pet.pos) return
    if (bubbleFollowRaf) return
    bubbleFollowRaf = requestAnimationFrame(function () {
      bubbleFollowRaf = 0
      if (!bubbleShown || !bubbleEl || !pet.pos) return
      var pos = placeBubble()
      // 尾巴指向/上下翻转发生变化时才重画外框
      if (pos.tailCenter !== bubbleTailCenter || pos.below !== bubbleTailUp) {
        bubbleTailCenter = pos.tailCenter
        bubbleTailUp = !!pos.below
        drawBubbleFrame()
      }
    })
  }

  // 气泡显隐动画：像从桌宠头顶"冒"出来（底部为轴心），带一点回弹
  var bubbleShown = false
  function popBubbleIn() {
    if (!bubbleEl) return
    bubbleEl.style.opacity = '1'
    try { bubbleEl.getAnimations().forEach(function (a) { a.cancel() }) } catch (err) {}
    try {
      bubbleEl.animate([
        { opacity: 0, transform: 'scale(.62,.7) translateY(10px)' },
        { opacity: 1, transform: 'scale(1.06,1.03) translateY(-2px)', offset: 0.62 },
        { opacity: 1, transform: 'scale(.98,1.01) translateY(1px)', offset: 0.8 },
        { opacity: 1, transform: 'scale(1,1) translateY(0)' },
      ], { duration: 320, easing: 'cubic-bezier(.22,1.5,.36,1)', fill: 'forwards' })
    } catch (err) {}
  }

  function popBubbleOut() {
    if (!bubbleEl) return
    try {
      bubbleEl.getAnimations().forEach(function (a) { a.cancel() })
      bubbleEl.animate([
        { opacity: 1, transform: 'scale(1,1)' },
        { opacity: 0, transform: 'scale(.92,.94) translateY(4px)' },
      ], { duration: 180, easing: 'ease-in', fill: 'forwards' })
    } catch (err) {}
    bubbleEl.style.opacity = '0'
  }

  function textOf(content) {
    if (Array.isArray(content)) {
      return content.map(function (row) { return row && row.text ? row.text : '' }).join('')
    }
    if (content && typeof content === 'object' && content.text) return content.text
    return typeof content === 'string' ? content : ''
  }

  function textLength(content) {
    return Array.from(textOf(content).replace(/\s/g, '')).length
  }

  function eventDuration(content, explicitMs) {
    if (explicitMs !== undefined && explicitMs !== null) return explicitMs
    var voiceMs = deps.voiceDuration ? deps.voiceDuration(textOf(content)) : 0
    if (voiceMs > 0) return Math.max(BUBBLE_MIN_MS, voiceMs + 2000)
    var chars = textLength(content)
    var byChars = chars > 0 ? chars * BUBBLE_CHAR_MS : 0
    return Math.max(BUBBLE_MIN_MS, byChars)
  }

  function showBubble(eventText, eventMs) {
    if (!settings.bubble) return
    ensureFont()
    var wasVisible = bubbleShown
    bubbleDialogText = ''
    bubbleDialogUntil = 0
    var ms = eventDuration(eventText, eventMs)
    if (Array.isArray(eventText)) {
      bubbleEventRows = eventText
      bubbleEventText = ''
      bubbleEventUntil = Date.now() + ms
      bubbleMode = 'event'
    } else if (eventText) {
      bubbleEventText = eventText
      bubbleEventRows = null
      bubbleEventUntil = Date.now() + ms
      bubbleMode = 'event'
    } else {
      bubbleEventRows = null
      bubbleMode = 'info'
    }
    refreshBubble()
    bubbleShown = true
    // 新内容才重新"弹"一次；只是刷新数字时不打断动画
    if (!wasVisible || eventText) popBubbleIn()
    else bubbleEl.style.opacity = '1'
    clearTimeout(bubbleHideTimer)
    // ⚠️ 事件气泡到"文字过期"就收起，**不能**拖到 5.2s：
    //    否则过期后内容会回落成余额/花费，看起来像"思考中突然弹余额"。
    var hideIn = bubbleMode === 'event'
      ? Math.max(700, bubbleEventUntil - Date.now())
      : BUBBLE_HIDE_MS
    bubbleHideTimer = setTimeout(function () {
      bubbleShown = false
      popBubbleOut()
      if (bubbleTickTimer) { clearInterval(bubbleTickTimer); bubbleTickTimer = 0 }
    }, hideIn)
    if (!bubbleTickTimer) {
      bubbleTickTimer = setInterval(function () {
        if (!bubbleShown) {
          clearInterval(bubbleTickTimer); bubbleTickTimer = 0
          return
        }
        // 事件文字已过期 → 直接收气泡（不显示常规内容）
        if (bubbleMode === 'event' && Date.now() > bubbleEventUntil) {
          bubbleShown = false
          popBubbleOut()
          clearInterval(bubbleTickTimer); bubbleTickTimer = 0
          return
        }
        refreshBubble()
      }, 1000)
    }
  }

  function showDialog(text, eventMs) {
    if (!settings.bubble || !text) return
    ensureFont()
    var wasVisible = bubbleShown
    bubbleEventRows = null
    bubbleEventText = ''
    bubbleDialogText = String(text)
    bubbleDialogUntil = Date.now() + eventDuration(text, eventMs)
    bubbleMode = 'dialog'
    refreshBubble()
    bubbleShown = true
    if (!wasVisible) popBubbleIn()
    else bubbleEl.style.opacity = '1'
    clearTimeout(bubbleHideTimer)
    var hideIn = Math.max(1200, bubbleDialogUntil - Date.now())
    bubbleHideTimer = setTimeout(function () {
      bubbleShown = false
      popBubbleOut()
      if (bubbleTickTimer) { clearInterval(bubbleTickTimer); bubbleTickTimer = 0 }
    }, hideIn)
    if (!bubbleTickTimer) {
      bubbleTickTimer = setInterval(function () {
        if (!bubbleShown) {
          clearInterval(bubbleTickTimer); bubbleTickTimer = 0
          return
        }
        if (bubbleMode === 'dialog' && Date.now() > bubbleDialogUntil) {
          bubbleShown = false
          popBubbleOut()
          clearInterval(bubbleTickTimer); bubbleTickTimer = 0
          return
        }
        refreshBubble()
      }, 1000)
    }
  }

  function extendDuration(ms) {
    var extra = Number(ms)
    if (!bubbleShown || !isFinite(extra) || extra <= 0) return
    var until
    if (bubbleMode === 'event') {
      bubbleEventUntil = Math.max(bubbleEventUntil, Date.now() + extra)
      until = bubbleEventUntil
    } else if (bubbleMode === 'dialog') {
      bubbleDialogUntil = Math.max(bubbleDialogUntil, Date.now() + extra)
      until = bubbleDialogUntil
    } else {
      return
    }
    clearTimeout(bubbleHideTimer)
    bubbleHideTimer = setTimeout(function () {
      bubbleShown = false
      popBubbleOut()
      if (bubbleTickTimer) { clearInterval(bubbleTickTimer); bubbleTickTimer = 0 }
    }, Math.max(700, until - Date.now()))
  }

  function dispose() {
    hideBubble()
    if (bubbleFollowRaf) { cancelAnimationFrame(bubbleFollowRaf); bubbleFollowRaf = 0 }
    if (bubbleHideTimer) { clearTimeout(bubbleHideTimer); bubbleHideTimer = 0 }
    if (bubbleTickTimer) { clearInterval(bubbleTickTimer); bubbleTickTimer = 0 }
    if (bubbleEl && bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl)
    bubbleEl = null
    bubbleTextEl = null
    bubbleTailEl = null
    bubbleSvg = null
  }

  return { show: showBubble, dialog: showDialog, extend: extendDuration, refresh: refreshBubble, follow: followBubble, hide: hideBubble, dispose: dispose, isShown: function () { return bubbleShown } }
}
