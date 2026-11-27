// DSH 设置页：Nascence 桌宠低频配置。
// React 由 client-entry 注入，避免依赖额外运行时。

import DEFAULT_DIALOGUES from '../config/dialogues.json' with { type: 'json' }
import { PREFIX } from '../core/env.js'
import { SETTINGS_DEFAULTS } from '../shared/protocol.js'
import { FONT_SANS, FONT_MONO, LABEL_TRACKING, CARD_RADIUS, CONTROL_RADIUS } from './theme.js'

// 样式 token：优先用皮肤（dsh-nascence-skin）挂在 body 上的 --tn-*，没装皮肤时回退到宿主变量。
const C = {
  text: 'var(--tn-text, inherit)',
  dim: 'var(--tn-text-dim, var(--dsh-text-2, #8f9abb))',
  line: 'var(--tn-line-strong, var(--dsh-border, rgba(127,127,127,.35)))',
  hairline: 'var(--tn-line, var(--dsh-border, rgba(127,127,127,.18)))',
  field: 'var(--tn-navy, transparent)',
  card: 'var(--tn-navy, transparent)',
}
const INPUT_STYLE = {
  padding: '6px 9px', borderRadius: CONTROL_RADIUS, border: '1px solid ' + C.line,
  background: C.field, color: C.text, font: 'inherit', outline: 'none',
}
const GHOST_BUTTON = {
  border: '1px solid ' + C.line, background: 'transparent', color: C.text,
  borderRadius: CONTROL_RADIUS, cursor: 'pointer', padding: '2px 9px', font: 'inherit',
}
const KICKER = {
  fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: LABEL_TRACKING,
  textTransform: 'uppercase', color: C.dim,
}

function SectionTitle(h, kicker, title) {
  return h('div', { style: { margin: '28px 0 6px', paddingTop: 16, borderTop: '1px solid ' + C.hairline } },
    h('div', { style: KICKER }, kicker),
    h('h3', { style: { margin: '4px 0 0', fontSize: 15, fontWeight: 500, color: C.text } }, title))
}

const STATE_GROUPS = [
  ['idle', '闲时随机'],
  ['sadIdle', '悲伤时随机'],
  ['thinkIdle', '思考时随机'],
]

const EVENT_GROUPS = [
  ['credited', '到账'],
  ['peakTime', '峰时'],
  ['valleyTime', '谷时'],
  ['lowBalance', '余额不足'],
  ['turnInterrupted', '对话中断'],
  ['error', '出错'],
  ['toolSuccess', '工具成功'],
  ['turnEnd', '本轮结束'],
]

const INTERACT_GROUPS = [
  ['interact', '通用池'],
  ['interactIdle', '闲时交互'],
  ['interactSadIdle', '悲伤时交互'],
  ['interactThinkIdle', '思考时交互'],
]

export function makeSettingsSection(React) {
  const h = React.createElement

  function Field(props) {
    return h('label', { style: { display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0' } },
      h('span', { style: { width: 150, color: C.dim } }, props.label),
      h('input', {
        type: 'number', value: props.value, min: props.min, step: props.step || 1,
        onChange: (e) => props.onChange(Number(e.target.value)),
        style: Object.assign({ width: 140, fontFamily: FONT_MONO }, INPUT_STYLE),
      }),
      props.hint ? h('span', { style: { fontSize: 12, color: C.dim } }, props.hint) : null,
    )
  }

  function ListEditor(props) {
    const list = Array.isArray(props.value) ? props.value : []
    const update = (next) => props.onChange(next)
    return h('div', { style: { margin: '14px 0 18px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
        h('strong', { style: { fontWeight: 500, color: C.text } }, props.title),
        h('button', {
          type: 'button',
          onClick: () => update(list.concat('')),
          style: GHOST_BUTTON,
        }, '+'),
      ),
      list.length === 0 ? h('div', { style: { fontSize: 12, color: C.dim } }, '空，不显示通知') : null,
      list.map((text, i) => h('div', { key: i, style: { display: 'flex', gap: 6, marginBottom: 4 } },
        h('input', {
          value: text, placeholder: '输入一条对话',
          onChange: (e) => {
            const next = list.slice()
            next[i] = e.target.value
            update(next)
          },
          style: Object.assign({ flex: 1 }, INPUT_STYLE),
        }),
        h('button', {
          type: 'button', onClick: () => update(list.filter((_, j) => j !== i)),
          style: GHOST_BUTTON,
        }, '−'),
      )),
    )
  }

  return function SettingsSection({ close }) {
    const api = window.__dshNascencePet
    const [settings, setSettings] = React.useState(function () {
      const base = api && api.settings ? api.settings : {}
      return Object.assign({}, SETTINGS_DEFAULTS, base, {
        dialogues: Object.assign({}, DEFAULT_DIALOGUES, base.dialogues || {}),
      })
    })

    // 打开设置页时从宿主配置与运行时 JSON 重新读取，避免页面早于 boot 完成时用默认值覆盖。
    if (React.useEffect) {
      React.useEffect(function () {
        let alive = true
        Promise.all([
          fetch(PREFIX + '/config', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(PREFIX + '/assets/src/config/dialogues.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]).then(([cfg, file]) => {
          if (!alive) return
          const host = (cfg && cfg.settings) || {}
          const dialogues = Object.assign({}, DEFAULT_DIALOGUES, file || {}, host.dialogues || {})
          setSettings(Object.assign({}, SETTINGS_DEFAULTS, host, {
            dialogues,
          }))
        })
        return function () { alive = false }
      }, [])
    }

    function patch(next) {
      setSettings(Object.assign({}, settings, next))
      if (api && api.setSettings) {
        // 本地立即生效，但不要走旧的整包 saveSettings；由这里直接 PATCH 宿主配置，
        // 只提交改动的字段，避免用客户端默认值覆盖已持久化的 dialogues。
        api.setSettings(next, false)
      }
      fetch(PREFIX + '/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: next }),
      }).catch(function () {})
    }

    function patchDialogue(key, value) {
      const dialogues = Object.assign({}, settings.dialogues || {})
      dialogues[key] = value
      patch({ dialogues: dialogues })
    }

    if (!api) {
      return h('div', { style: { padding: 24, opacity: 0.7 } }, '桌宠还在启动，请稍后再打开设置。')
    }

    return h('div', { style: { padding: '8px 4px 32px', maxWidth: 720, fontFamily: FONT_SANS, color: C.text } },
      h('div', { style: KICKER }, 'Timeless Nascence'),
      h('h2', { style: { margin: '4px 0 4px', fontSize: 18, fontWeight: 500 } }, 'Nascence 桌宠'),
      h('p', { style: { margin: '0 0 18px', color: C.dim, fontSize: 13 } }, '低频配置。大小、透明度、气泡样式与像素字体仍在右键面板里。'),

      h('div', { style: { padding: '6px 16px', border: '1px solid ' + C.hairline, borderRadius: CARD_RADIUS, background: C.card } },

      h(Field, {
        label: '余额不足阈值', value: settings.lowThreshold === undefined ? SETTINGS_DEFAULTS.lowThreshold : settings.lowThreshold,
        min: 0, step: 1, onChange: (v) => patch({ lowThreshold: v }), hint: '元',
      }),
      h(Field, {
        label: '闲时对话间隔', value: settings.idleChatterMinutes === undefined ? SETTINGS_DEFAULTS.idleChatterMinutes : settings.idleChatterMinutes,
        min: 0, step: 1, onChange: (v) => patch({ idleChatterMinutes: v }), hint: '分钟；0 = 关闭',
      }),
      h(Field, {
        label: '闲时对话触发概率',
        value: Math.round((settings.idleChatterChance === undefined ? SETTINGS_DEFAULTS.idleChatterChance : settings.idleChatterChance) * 100),
        min: 0, step: 5, onChange: (v) => patch({ idleChatterChance: Math.min(1, Math.max(0, v / 100)) }), hint: '%',
      }),
      ),

      SectionTitle(h, 'Idle', '闲时对话池'),
      STATE_GROUPS.map(([key, title]) =>
        h(ListEditor, {
          key: key, title: title,
          value: (settings.dialogues && settings.dialogues[key]) || [],
          onChange: (v) => patchDialogue(key, v),
        })),

      SectionTitle(h, 'Interact', '点击交互对话池'),
      h('p', { style: { margin: '0 0 8px', color: C.dim, fontSize: 12 } }, '每次点击从「通用池 + 当前状态池」中抽取；三种状态各有一份独立的闲时对话池。'),
      INTERACT_GROUPS.map(([key, title]) =>
        h(ListEditor, {
          key: key, title: title,
          value: (settings.dialogues && settings.dialogues[key]) || [],
          onChange: (v) => patchDialogue(key, v),
        })),

      SectionTitle(h, 'Events', '特殊事件对话池'),
      EVENT_GROUPS.map(([key, title]) =>
        h(ListEditor, {
          key: key, title: title,
          value: (settings.dialogues && settings.dialogues[key]) || [],
          onChange: (v) => patchDialogue(key, v),
        })),

      h('div', { style: { marginTop: 24 } },
        h('button', {
          type: 'button', onClick: close,
          style: Object.assign({}, GHOST_BUTTON, { padding: '7px 18px' }),
        }, '关闭'),
      ),
    )
  }
}
