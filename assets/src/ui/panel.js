// dsh-nascence-pet — 设置面板（工厂）
//
// 依赖注入：settings / saveSettings / resolveFlip / layout / repositionForAnchor /
// applyOpacity / hideBubble / audioEnsure / loadSounds / playSound / size / pet / resetPosition。
// 面板 DOM 懒创建（第一次 open 时），关闭只是 display:none。
// 样式：Timeless Nascence 极简卡片（深色 navy / 浅色白 + 发丝线），颜色走 --tnp-* 变量，
// 每次打开按当前主题重设一次，控件内联样式只引用变量。

import { SIZE_MIN, SIZE_MAX, BUBBLE_SCALE_MIN, BUBBLE_SCALE_MAX, SNAP_STRENGTH_MIN, SNAP_STRENGTH_MAX } from '../core/env.js'
import {
  palette, detectScheme, pixelFontEnabled, setPixelFontEnabled,
  FONT_SANS, FONT_MONO, LABEL_TRACKING, CARD_RADIUS, CONTROL_RADIUS,
} from './theme.js'

// 控件样式（只引用 --tnp-* 变量）
var SEG_BOX_CSS = 'display:inline-flex;border:1px solid var(--tnp-line);border-radius:' + CONTROL_RADIUS + 'px;overflow:hidden'
var SEG_BTN_CSS = 'padding:3px 9px;border:0;background:transparent;color:var(--tnp-dim);font:inherit;cursor:pointer'
var TOGGLE_CSS = 'padding:3px 10px;border-radius:' + CONTROL_RADIUS + 'px;border:1px solid var(--tnp-line);' +
  'background:transparent;color:var(--tnp-dim);font:inherit;cursor:pointer;min-width:38px'
var SLIDER_CSS = 'width:96px;accent-color:var(--tnp-accent);cursor:pointer'
var VALUE_CSS = 'text-align:right;color:var(--tnp-text);font-family:' + FONT_MONO + ';font-size:11px'

/** 开/关按钮与分段按钮的选中态：钴蓝底白字；未选：透明 + 次要文字色 */
function paintToggle(btn, on) {
  btn.style.background = on ? 'var(--tnp-accent)' : 'transparent'
  btn.style.borderColor = on ? 'var(--tnp-accent)' : 'var(--tnp-line)'
  btn.style.color = on ? '#ffffff' : 'var(--tnp-dim)'
}
function paintSegment(btn, on) {
  btn.style.background = on ? 'var(--tnp-accent)' : 'transparent'
  btn.style.color = on ? '#ffffff' : 'var(--tnp-dim)'
}

export function createPanel(deps) {
  var settings = deps.settings
  var saveSettings = deps.saveSettings
  var resolveFlip = deps.resolveFlip
  var layout = deps.layout
  var repositionForAnchor = deps.repositionForAnchor
  var applyOpacity = deps.applyOpacity
  var hideBubble = deps.hideBubble
  var refreshBubble = deps.refreshBubble
  var audioEnsure = deps.audioEnsure
  var loadSounds = deps.loadSounds
  var playSound = deps.playSound
  var size = deps.size
  var pet = deps.pet
  var resetPosition = deps.resetPosition
  var applyPlate = deps.applyPlate

  // ————————————————————— 设置面板 —————————————————————
  var panel = null
  function panelIsOpen() { return !!(panel && panel.style.display === 'block') }

  function buildPanel() {
    panel = document.createElement('div')
    panel.id = 'dsh-nascence-pet-settings'
    panel.style.cssText = [
      'position:fixed', 'z-index:2147482003', 'display:none',
      'pointer-events:auto', 'min-width:208px', 'padding:12px 14px',
      'border-radius:' + CARD_RADIUS + 'px', 'font:12px/1.6 ' + FONT_SANS,
      'background:var(--tnp-card)', 'color:var(--tnp-text)',
      'border:1px solid var(--tnp-line)',
      'box-shadow:0 10px 28px var(--tnp-shadow)',
    ].join(';')
    applyTheme()

    var head = document.createElement('div')
    head.textContent = 'TIMELESS NASCENCE'
    head.style.cssText = 'font:500 10px/1.4 ' + FONT_MONO + ';letter-spacing:' + LABEL_TRACKING +
      ';color:var(--tnp-dim);padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--tnp-hairline)'
    panel.appendChild(head)

    function row(label) {
      var el = document.createElement('div')
      el.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0'
      var name = document.createElement('span')
      name.textContent = label
      name.style.cssText = 'color:var(--tnp-dim)'
      el.appendChild(name)
      panel.appendChild(el)
      return el
    }

    // 镜像
    var mirrorRow = row('镜像')
    var segBox = document.createElement('span')
    segBox.style.cssText = SEG_BOX_CSS
    var mirrorButtons = {}
    ;[['auto', '自动'], ['always', '始终'], ['never', '不镜像']].forEach(function (pair) {
      var btn = document.createElement('button')
      btn.textContent = pair[1]
      btn.dataset.value = pair[0]
      btn.style.cssText = SEG_BTN_CSS
      btn.addEventListener('click', function () {
        settings.mirror = pair[0]
        saveSettings()
        resolveFlip()
        syncMirrorButtons()
      })
      mirrorButtons[pair[0]] = btn
      segBox.appendChild(btn)
    })
    mirrorRow.appendChild(segBox)
    function syncMirrorButtons() {
      Object.keys(mirrorButtons).forEach(function (k) {
        var on = settings.mirror === k
        paintSegment(mirrorButtons[k], on)
      })
    }

    // 大小
    var sizeRow = row('大小')
    var sizeWrap = document.createElement('span')
    sizeWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px'
    var slider = document.createElement('input')
    slider.type = 'range'
    slider.min = String(SIZE_MIN)
    slider.max = String(SIZE_MAX)
    slider.step = '0.05'
    slider.value = String(settings.size)
    slider.style.cssText = SLIDER_CSS
    var sizeText = document.createElement('span')
    sizeText.style.cssText = 'width:34px;' + VALUE_CSS
    sizeText.textContent = Math.round(settings.size * 100) + '%'
    var saveTimer = 0
    slider.addEventListener('input', function () {
      settings.size = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Number(slider.value) || 1))
      sizeText.textContent = Math.round(settings.size * 100) + '%'
      layout()
      repositionForAnchor()
      clearTimeout(saveTimer)
      saveTimer = setTimeout(saveSettings, 250)
    })
    sizeWrap.appendChild(slider)
    sizeWrap.appendChild(sizeText)
    sizeRow.appendChild(sizeWrap)

    // 边缘吸附强度（200% = 旧吸附范围，0% = 不吸附）
    var snapRow = row('吸附强度')
    var snapWrap = document.createElement('span')
    snapWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px'
    var snapSlider = document.createElement('input')
    snapSlider.type = 'range'
    snapSlider.min = String(SNAP_STRENGTH_MIN)
    snapSlider.max = String(SNAP_STRENGTH_MAX)
    snapSlider.step = '5'
    snapSlider.value = String(settings.snapStrength)
    snapSlider.style.cssText = SLIDER_CSS
    var snapText = document.createElement('span')
    snapText.style.cssText = 'width:38px;' + VALUE_CSS
    snapText.textContent = Math.round(settings.snapStrength) + '%'
    snapSlider.addEventListener('input', function () {
      settings.snapStrength = Math.min(SNAP_STRENGTH_MAX, Math.max(SNAP_STRENGTH_MIN, Number(snapSlider.value) || 0))
      snapText.textContent = Math.round(settings.snapStrength) + '%'
      saveSettings(false)
    })
    snapWrap.appendChild(snapSlider)
    snapWrap.appendChild(snapText)
    snapRow.appendChild(snapWrap)

    // 气泡大小（100% 为基准；50%–200%）
    var bubbleScaleRow = row('气泡大小')
    var bubbleScaleWrap = document.createElement('span')
    bubbleScaleWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px'
    var bubbleScaleSlider = document.createElement('input')
    bubbleScaleSlider.type = 'range'
    bubbleScaleSlider.min = String(BUBBLE_SCALE_MIN)
    bubbleScaleSlider.max = String(BUBBLE_SCALE_MAX)
    bubbleScaleSlider.step = '5'
    bubbleScaleSlider.value = String(settings.bubbleScale)
    bubbleScaleSlider.style.cssText = SLIDER_CSS
    var bubbleScaleText = document.createElement('span')
    bubbleScaleText.style.cssText = 'width:38px;' + VALUE_CSS
    bubbleScaleText.textContent = Math.round(settings.bubbleScale) + '%'
    bubbleScaleSlider.addEventListener('input', function () {
      settings.bubbleScale = Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, Number(bubbleScaleSlider.value) || 100))
      bubbleScaleText.textContent = Math.round(settings.bubbleScale) + '%'
      if (refreshBubble) refreshBubble()
      saveSettings(false)
    })
    bubbleScaleWrap.appendChild(bubbleScaleSlider)
    bubbleScaleWrap.appendChild(bubbleScaleText)
    bubbleScaleRow.appendChild(bubbleScaleWrap)

    // 分级排版开关：金额大、辅助信息小的多字号效果
    var tiersRow = row('更多层次的字体视觉效果')
    var tiersBtn = document.createElement('button')
    tiersBtn.style.cssText = TOGGLE_CSS
    function syncTiersBtn() {
      tiersBtn.textContent = settings.bubbleTiers ? '开' : '关'
      paintToggle(tiersBtn, !!settings.bubbleTiers)
    }
    tiersBtn.addEventListener('click', function () {
      settings.bubbleTiers = !settings.bubbleTiers
      syncTiersBtn()
      saveSettings(true)
      if (refreshBubble) refreshBubble()
    })
    syncTiersBtn()
    tiersRow.appendChild(tiersBtn)

    // 像素字体：可选项，默认关闭（偏好存本机，只影响气泡）
    var pixelRow = row('像素字体')
    var pixelBtn = document.createElement('button')
    pixelBtn.style.cssText = TOGGLE_CSS
    function syncPixelBtn() {
      var on = pixelFontEnabled()
      pixelBtn.textContent = on ? '开' : '关'
      paintToggle(pixelBtn, on)
    }
    pixelBtn.addEventListener('click', function () {
      setPixelFontEnabled(!pixelFontEnabled())
      syncPixelBtn()
      if (refreshBubble) refreshBubble()
    })
    syncPixelBtn()
    pixelRow.appendChild(pixelBtn)

    // 气泡开关
    var bubbleRow = row('气泡')
    var bubbleBtn = document.createElement('button')
    bubbleBtn.style.cssText = TOGGLE_CSS
    function syncBubbleBtn() {
      bubbleBtn.textContent = settings.bubble ? '开' : '关'
      paintToggle(bubbleBtn, !!settings.bubble)
    }
    bubbleBtn.addEventListener('click', function () {
      settings.bubble = !settings.bubble
      syncBubbleBtn()
      saveSettings(true)
      if (!settings.bubble) hideBubble()
    })
    syncBubbleBtn()
    bubbleRow.appendChild(bubbleBtn)

    // 透明度
    var opaRow = row('透明度')
    var opaWrap = document.createElement('span')
    opaWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px'
    var opaSlider = document.createElement('input')
    opaSlider.type = 'range'
    opaSlider.min = '0.3'
    opaSlider.max = '1'
    opaSlider.step = '0.05'
    opaSlider.value = String(settings.opacity)
    opaSlider.style.cssText = SLIDER_CSS
    var opaText = document.createElement('span')
    opaText.style.cssText = 'width:38px;' + VALUE_CSS
    opaText.textContent = Math.round(settings.opacity * 100) + '%'
    opaSlider.addEventListener('input', function () {
      settings.opacity = Math.min(1, Math.max(0.3, Number(opaSlider.value) || 1))
      opaText.textContent = Math.round(settings.opacity * 100) + '%'
      applyOpacity()
      saveSettings(false)
    })
    opaWrap.appendChild(opaSlider)
    opaWrap.appendChild(opaText)
    opaRow.appendChild(opaWrap)

    // 音效：开关 + 音量
    var soundRow = row('音效')
    var soundWrap = document.createElement('span')
    soundWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px'
    var soundBtn = document.createElement('button')
    soundBtn.style.cssText = TOGGLE_CSS
    function syncSoundBtn() {
      soundBtn.textContent = settings.sound ? '开' : '关'
      paintToggle(soundBtn, !!settings.sound)
    }
    soundBtn.addEventListener('click', function () {
      settings.sound = !settings.sound
      syncSoundBtn()
      saveSettings(true)
      if (settings.sound) { audioEnsure(); loadSounds(); playSound('click') }
    })
    syncSoundBtn()
    var volSlider = document.createElement('input')
    volSlider.type = 'range'
    volSlider.min = '0'
    volSlider.max = '1'
    volSlider.step = '0.05'
    volSlider.value = String(settings.volume)
    volSlider.style.cssText = SLIDER_CSS.replace('96px', '74px')
    var volText = document.createElement('span')
    volText.style.cssText = 'width:34px;' + VALUE_CSS
    volText.textContent = Math.round(settings.volume * 100) + '%'
    volSlider.addEventListener('input', function () {
      settings.volume = Math.min(1, Math.max(0, Number(volSlider.value) || 0))
      volText.textContent = Math.round(settings.volume * 100) + '%'
      saveSettings(false)
    })
    volSlider.addEventListener('change', function () { if (settings.sound) { audioEnsure(); playSound('click') } })
    soundWrap.appendChild(soundBtn)
    soundWrap.appendChild(volSlider)
    soundWrap.appendChild(volText)
    soundRow.appendChild(soundWrap)

    // 语音：独立开关与语言（不影响音效）
    var voiceRow = row('语音')
    var voiceBtn = document.createElement('button')
    voiceBtn.style.cssText = TOGGLE_CSS
    function syncVoiceBtn() {
      voiceBtn.textContent = settings.voice ? '开' : '关'
      paintToggle(voiceBtn, !!settings.voice)
    }
    voiceBtn.addEventListener('click', function () {
      settings.voice = !settings.voice
      syncVoiceBtn()
      saveSettings(true)
    })
    syncVoiceBtn()
    voiceRow.appendChild(voiceBtn)

    var voiceLangRow = row('语音语言')
    var voiceLangBox = document.createElement('span')
    voiceLangBox.style.cssText = SEG_BOX_CSS
    var voiceLangButtons = {}
    ;[['zh', '中文'], ['ja', '日语']].forEach(function (pair) {
      var btn = document.createElement('button')
      btn.textContent = pair[1]
      btn.dataset.value = pair[0]
      btn.style.cssText = SEG_BTN_CSS
      btn.addEventListener('click', function () {
        settings.voiceLang = pair[0]
        saveSettings(true)
        syncVoiceLang()
      })
      voiceLangButtons[pair[0]] = btn
      voiceLangBox.appendChild(btn)
    })
    function syncVoiceLang() {
      Object.keys(voiceLangButtons).forEach(function (k) {
        var on = settings.voiceLang === k
        paintSegment(voiceLangButtons[k], on)
      })
    }
    syncVoiceLang()
    voiceLangRow.appendChild(voiceLangBox)

    // 语音音量独立于音效音量
    var voiceVolRow = row('语音音量')
    var voiceVolWrap = document.createElement('span')
    voiceVolWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px'
    var voiceVolSlider = document.createElement('input')
    voiceVolSlider.type = 'range'
    voiceVolSlider.min = '0'
    voiceVolSlider.max = '1'
    voiceVolSlider.step = '0.05'
    voiceVolSlider.value = String(settings.voiceVolume === undefined ? 0.7 : settings.voiceVolume)
    voiceVolSlider.style.cssText = SLIDER_CSS.replace('96px', '74px')
    var voiceVolText = document.createElement('span')
    voiceVolText.style.cssText = 'width:34px;' + VALUE_CSS
    function syncVoiceVolume() {
      var v = settings.voiceVolume === undefined ? 0.7 : settings.voiceVolume
      voiceVolSlider.value = String(v)
      voiceVolText.textContent = Math.round(v * 100) + '%'
    }
    voiceVolSlider.addEventListener('input', function () {
      settings.voiceVolume = Math.min(1, Math.max(0, Number(voiceVolSlider.value) || 0))
      syncVoiceVolume()
      saveSettings(false)
    })
    voiceVolSlider.addEventListener('change', function () { saveSettings(true) })
    syncVoiceVolume()
    voiceVolWrap.appendChild(voiceVolSlider)
    voiceVolWrap.appendChild(voiceVolText)
    voiceVolRow.appendChild(voiceVolWrap)

    // 硬件挂牌：开关 + 在桌宠上方/下方
    var plateRow = row('硬件挂牌')
    var plateBtn = document.createElement('button')
    plateBtn.style.cssText = TOGGLE_CSS
    function syncPlateBtn() {
      plateBtn.textContent = settings.plate ? '开' : '关'
      paintToggle(plateBtn, !!settings.plate)
    }
    plateBtn.addEventListener('click', function () {
      settings.plate = !settings.plate
      syncPlateBtn()
      saveSettings(true)
      if (applyPlate) applyPlate()
    })
    syncPlateBtn()
    plateRow.appendChild(plateBtn)

    var platePosRow = row('挂牌位置')
    var platePosBox = document.createElement('span')
    platePosBox.style.cssText = SEG_BOX_CSS
    var platePosButtons = {}
    ;[['bottom', '下方'], ['top', '上方']].forEach(function (pair) {
      var btn = document.createElement('button')
      btn.textContent = pair[1]
      btn.style.cssText = SEG_BTN_CSS
      btn.addEventListener('click', function () {
        settings.platePosition = pair[0]
        syncPlatePosition()
        saveSettings(true)
        if (applyPlate) applyPlate()
      })
      platePosButtons[pair[0]] = btn
      platePosBox.appendChild(btn)
    })
    function syncPlatePosition() {
      Object.keys(platePosButtons).forEach(function (key) {
        var on = settings.platePosition === key
        paintSegment(platePosButtons[key], on)
      })
    }
    syncPlatePosition()
    platePosRow.appendChild(platePosBox)

    // 操作
    var actions = document.createElement('div')
    actions.style.cssText = 'display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--tnp-hairline)'
    function action(label, fn, primary) {
      var b = document.createElement('button')
      b.textContent = label
      b.style.cssText = 'flex:1;padding:5px 8px;border-radius:' + CONTROL_RADIUS + 'px;font:inherit;cursor:pointer;' +
        (primary
          ? 'border:1px solid var(--tnp-btn-bg);background:var(--tnp-btn-bg);color:var(--tnp-btn-ink)'
          : 'border:1px solid var(--tnp-line);background:transparent;color:var(--tnp-text)')
      b.addEventListener('mouseenter', function () { if (primary) b.style.boxShadow = '0 0 0 3px var(--tnp-glow)' })
      b.addEventListener('mouseleave', function () { b.style.boxShadow = 'none' })
      b.addEventListener('click', fn)
      actions.appendChild(b)
    }
    action('重置位置', function () { resetPosition() })
    action('完成', function () { closePanel() }, true)
    panel.appendChild(actions)

    document.body.appendChild(panel)
    syncMirrorButtons()
    syncTiersBtn()
    return {
      syncMirrorButtons: syncMirrorButtons,
      syncTiersBtn: syncTiersBtn,
      syncPixelBtn: syncPixelBtn,
      syncVoiceBtn: syncVoiceBtn,
      syncVoiceLang: syncVoiceLang,
      syncVoiceVolume: syncVoiceVolume,
      syncPlateBtn: syncPlateBtn,
      syncPlatePosition: syncPlatePosition,
      slider: slider,
      sizeText: sizeText,
      snapSlider: snapSlider,
      snapText: snapText,
      bubbleScaleSlider: bubbleScaleSlider,
      bubbleScaleText: bubbleScaleText,
    }
  }

  /** 按当前主题写入 --tnp-* 变量（深色 navy / 浅色白） */
  function applyTheme() {
    if (!panel) return
    var t = palette(detectScheme())
    var vars = {
      card: t.card, raised: t.raised, line: t.line, hairline: t.hairline,
      text: t.text, dim: t.dim, accent: t.accent, glow: t.accentGlow,
      'btn-bg': t.btnBg, 'btn-ink': t.btnInk, shadow: t.shadow,
    }
    if (typeof panel.style.setProperty !== 'function') return
    Object.keys(vars).forEach(function (k) { panel.style.setProperty('--tnp-' + k, vars[k]) })
  }

  var panelApi = null
  function openPanel() {
    if (!panel) panelApi = buildPanel()
    applyTheme()
    if (panelApi) {
      panelApi.syncPixelBtn()
      panelApi.slider.value = String(settings.size)
      panelApi.sizeText.textContent = Math.round(settings.size * 100) + '%'
      panelApi.snapSlider.value = String(settings.snapStrength)
      panelApi.snapText.textContent = Math.round(settings.snapStrength) + '%'
      panelApi.bubbleScaleSlider.value = String(settings.bubbleScale)
      panelApi.bubbleScaleText.textContent = Math.round(settings.bubbleScale) + '%'
      panelApi.syncTiersBtn()
      panelApi.syncMirrorButtons()
      panelApi.syncVoiceBtn()
      panelApi.syncVoiceLang()
      panelApi.syncVoiceVolume()
      panelApi.syncPlateBtn()
      panelApi.syncPlatePosition()
    }
    panel.style.display = 'block'
    // 放在桌宠上方；下方放不下就放下方
    var s = size()
    var pw = panel.offsetWidth
    var ph = panel.offsetHeight
    var left = Math.min(Math.max(8, pet.pos.x + s.w / 2 - pw / 2), window.innerWidth - pw - 8)
    var top = pet.pos.y - ph - 8
    if (top < 8) top = Math.min(window.innerHeight - ph - 8, pet.pos.y + s.h + 8)
    panel.style.left = Math.round(left) + 'px'
    panel.style.top = Math.round(top) + 'px'
  }

  function closePanel() {
    if (panel) panel.style.display = 'none'
  }

  function insidePanel(target) {
    return !!(panel && target && panel.contains(target))
  }

  function dispose() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel)
    panel = null
    panelApi = null
  }

  return { open: openPanel, close: closePanel, isOpen: panelIsOpen, contains: insidePanel, dispose: dispose }
}
