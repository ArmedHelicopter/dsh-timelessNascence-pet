// dsh-nascence-pet — 谷价贴画（工厂）
//
// 只在谷价时段、点击桌宠时弹一下：极简卡片（深色 navy / 浅色白 + 发丝线），
// 等宽小标签 VALLEY + 钴蓝「-50%」。像素字体只在设置里打开「像素字体」时使用。
// 依赖注入：getState() 读 /state、settings、size()、pet。

import { palette, detectScheme, pixelFontEnabled, FONT_SANS, FONT_MONO, FONT_PIXEL, LABEL_TRACKING, CARD_RADIUS } from './theme.js'

export function createSticker(deps) {
  var getState = deps.getState
  var settings = deps.settings
  var size = deps.size
  var pet = deps.pet

  // ————————————————————— 谷价贴画（−50%）—————————————————————
  var stickerEl = null
  var stickerLabel = null
  var stickerValue = null
  var stickerW = 96            // 测量后的 CSS 尺寸（定位用）
  var stickerH = 56

  function paintSticker() {
    var t = palette(detectScheme())
    var pixel = pixelFontEnabled()
    stickerEl.style.background = t.card
    stickerEl.style.borderColor = t.line
    stickerEl.style.boxShadow = '0 6px 16px ' + t.shadow
    stickerLabel.style.color = t.dim
    stickerValue.style.color = t.accent
    stickerValue.style.fontFamily = pixel ? FONT_PIXEL : FONT_SANS
    stickerValue.style.fontSize = pixel ? '24px' : '22px'
    stickerValue.style.fontWeight = pixel ? '400' : '600'
    stickerW = stickerEl.offsetWidth || stickerW
    stickerH = stickerEl.offsetHeight || stickerH
  }

  function ensureSticker() {
    if (stickerEl) return
    stickerEl = document.createElement('div')
    stickerEl.id = 'dsh-nascence-pet-sticker'
    // z-index 与桌宠同级但后插入 → 盖在桌宠身上（"贴"上去）
    stickerEl.style.cssText = [
      'position:fixed', 'z-index:2147482000', 'pointer-events:none',
      'display:none', 'will-change:transform,opacity',
      'box-sizing:border-box', 'padding:8px 14px 9px',
      'border:1px solid transparent', 'border-radius:' + CARD_RADIUS + 'px',
      'text-align:center', 'white-space:nowrap',
    ].join(';')
    stickerLabel = document.createElement('div')
    stickerLabel.textContent = 'VALLEY'
    stickerLabel.style.cssText = 'font:500 9.5px/1.2 ' + FONT_MONO + ';letter-spacing:' + LABEL_TRACKING + ';padding-left:' + LABEL_TRACKING
    stickerValue = document.createElement('div')
    stickerValue.textContent = '-50%'
    stickerValue.style.cssText = 'line-height:1.15;letter-spacing:0.02em;margin-top:2px;font-variant-numeric:tabular-nums'
    stickerEl.appendChild(stickerLabel)
    stickerEl.appendChild(stickerValue)
    document.body.appendChild(stickerEl)
  }

  function showValleySticker() {
    var s = getState()
    if (!s || s.period !== 'valley') return // 只在谷价弹
    if (!settings.bubble) return             // 跟气泡同一个"减少干扰"开关
    ensureSticker()
    stickerEl.style.display = 'block'
    paintSticker()

    var petSize = size()
    var cx = pet.pos.x + petSize.w / 2
    // 贴着角色本体（而不是画布边缘）：右侧时贴左半身，左侧时贴右半身
    var leftOfPet = cx > window.innerWidth / 2
    var left = leftOfPet ? Math.round(cx - stickerW - 8) : Math.round(cx + 8)
    left = Math.min(Math.max(8, left), window.innerWidth - stickerW - 8)
    var top = Math.round(pet.pos.y + petSize.h * 0.18)
    top = Math.min(Math.max(8, top), window.innerHeight - stickerH - 8)
    stickerEl.style.left = left + 'px'
    stickerEl.style.top = top + 'px'
    stickerEl.style.display = 'block'

    try {
      stickerEl.getAnimations().forEach(function (a) { a.cancel() })
      // 从下往上"飘"出来：一条连续的贝塞尔上升曲线，没有中途停顿
      //   · transform 全程单调上浮（26px → -40px），用 ease-out 贝塞尔收尾
      //   · 透明度只在前 18% 淡入，后 45% 开始随上浮一起淡出
      stickerEl.animate([
        { opacity: 0, transform: 'translateY(26px) scale(.94)', easing: 'cubic-bezier(.18,.89,.32,1)' },
        { opacity: 1, transform: 'translateY(6px) scale(1)', offset: 0.18, easing: 'cubic-bezier(.25,.8,.35,1)' },
        { opacity: 1, transform: 'translateY(-14px) scale(1.02)', offset: 0.52, easing: 'cubic-bezier(.4,0,.7,.5)' },
        { opacity: 0, transform: 'translateY(-42px) scale(1.04)', offset: 1 },
      ], { duration: 1000, easing: 'linear', fill: 'forwards' }).onfinish = function () {
        if (stickerEl) stickerEl.style.display = 'none'
      }
    } catch (err) {
      // 老内核没有 WAAPI：退化成直接显示 1s
      stickerEl.style.opacity = '1'
      setTimeout(function () { if (stickerEl) stickerEl.style.display = 'none' }, 1000)
    }
  }

  function dispose() {
    if (stickerEl && stickerEl.parentNode) stickerEl.parentNode.removeChild(stickerEl)
    stickerEl = null
    stickerLabel = null
    stickerValue = null
  }

  return { show: showValleySticker, dispose: dispose }
}
