// dsh-nascence-pet — UI 设计 token（Timeless Nascence：藏青 / 黑 / 白极简）
//
// 气泡、右键面板、硬件挂牌、谷价贴画共用一套 token：
//   深色 = navy 卡片 + 发丝线 + 白字；浅色 = 白卡片 + 发丝线 + 藏青字；钴蓝只做高亮。
// 像素字体只作为可选项（默认关闭），偏好存在本机 localStorage。
// 纯函数部分（palette / normalizeScheme）不碰 document，node --test 可直接 import。

import { normalizeScheme } from './plate-format.js'

export const FONT_SANS = '"Inter","HarmonyOS Sans SC","PingFang SC","Microsoft YaHei UI",system-ui,sans-serif'
export const FONT_MONO = '"JetBrains Mono","Cascadia Mono",Consolas,monospace'
export const FONT_PIXEL = '"ArkPixel12", ui-monospace, monospace'
export const LABEL_TRACKING = '0.12em'
export const CARD_RADIUS = 8
export const CONTROL_RADIUS = 6

export const PALETTES = {
  dark: {
    card: '#0b1430', raised: '#111c40', void: '#05070f',
    line: 'rgba(232,238,255,0.18)', hairline: 'rgba(232,238,255,0.08)',
    text: '#eef2ff', dim: '#8f9abb', silver: '#c9d1e6',
    accent: '#3d6bff', accentGlow: 'rgba(61,107,255,0.35)', warn: '#e9c46a',
    btnBg: '#ffffff', btnInk: '#0b1430',
    shadow: 'rgba(0,0,0,0.32)',
  },
  light: {
    card: '#ffffff', raised: '#eef1f8', void: '#f6f7fb',
    line: 'rgba(11,20,48,0.16)', hairline: 'rgba(11,20,48,0.08)',
    text: '#0b1430', dim: '#5b6480', silver: '#3a4466',
    accent: '#2148e8', accentGlow: 'rgba(33,72,232,0.25)', warn: '#a87a12',
    btnBg: '#0b1430', btnInk: '#ffffff',
    shadow: 'rgba(11,20,48,0.12)',
  },
}

export function palette(scheme) {
  return PALETTES[scheme === 'light' ? 'light' : 'dark']
}

/** 当前主题：优先宿主 body[data-ds-dark-theme]，再看 color-scheme / class / 系统偏好。 */
export function detectScheme() {
  try {
    if (document.body && document.body.hasAttribute('data-ds-dark-theme')) return 'dark'
    var root = document.documentElement
    var scheme = normalizeScheme(root.style && root.style.colorScheme)
    if (scheme) return scheme
    scheme = normalizeScheme(root.getAttribute('data-theme') || root.getAttribute('data-color-scheme'))
    if (scheme) return scheme
    try {
      scheme = normalizeScheme(window.getComputedStyle(root).colorScheme)
      if (scheme) return scheme
    } catch (err) {}
    if (root.classList) {
      if (root.classList.contains('dark')) return 'dark'
      if (root.classList.contains('light')) return 'light'
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch (err) {}
  return 'light'
}

// —— 像素字体偏好（默认关闭）——
var PIXEL_FONT_KEY = 'dshtn-pet-pixel-font'

export function pixelFontEnabled() {
  try { return window.localStorage.getItem(PIXEL_FONT_KEY) === '1' } catch (err) { return false }
}

export function setPixelFontEnabled(on) {
  try {
    if (on) window.localStorage.setItem(PIXEL_FONT_KEY, '1')
    else window.localStorage.removeItem(PIXEL_FONT_KEY)
  } catch (err) {}
}

/** 监听主题变化（宿主 body/html 属性 + 系统偏好），返回取消函数。 */
export function watchScheme(onChange) {
  var mq = null
  var observer = null
  try {
    mq = window.matchMedia('(prefers-color-scheme: dark)')
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
  } catch (err) { mq = null }
  try {
    observer = new MutationObserver(onChange)
    var filter = ['style', 'class', 'data-theme', 'data-color-scheme', 'data-ds-theme-source', 'data-ds-dark-theme']
    observer.observe(document.documentElement, { attributes: true, attributeFilter: filter })
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: filter })
  } catch (err) { observer = null }
  return function () {
    try {
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener('change', onChange)
        else if (mq.removeListener) mq.removeListener(onChange)
      }
    } catch (err) {}
    try { if (observer) observer.disconnect() } catch (err) {}
  }
}
