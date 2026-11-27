// Minimal CDP client for testing the pet/skin inside the DSH Electron window.
// Usage:
//   node cdp.mjs <port> shot <out.png>
//   node cdp.mjs <port> eval "<js expression>"
//   node cdp.mjs <port> targets
import { writeFileSync } from 'node:fs'

const [port, cmd, arg] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
if (cmd === 'targets') {
  console.log(JSON.stringify(targets.map(t => ({ type: t.type, title: t.title, url: t.url })), null, 2))
  process.exit(0)
}
const want = process.env.CDP_URL || 'dsh-app://'
const page = targets.find(t => t.type === 'page' && t.url.includes(want))
  || targets.find(t => t.type === 'page' && !t.url.startsWith('devtools://')) || targets[0]
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
await new Promise((r) => { ws.onopen = r })

if (cmd === 'shot') {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(arg, Buffer.from(r.result.data, 'base64'))
  console.log('saved', arg, 'from', page.title, page.url)
} else if (cmd === 'eval') {
  const r = await send('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true })
  console.log(JSON.stringify(r.result.result.value ?? r.result, null, 2))
}
ws.close()
process.exit(0)
