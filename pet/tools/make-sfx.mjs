// dsh-nascence-pet — 纯 Node 合成短音效 WAV（无外部依赖）
// 输出到 assets/audio/{click,coin,fail,turnfail}.wav
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 44100
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'assets/audio')

function encodeWav(samples) {
  const numSamples = samples.length
  const dataSize = numSamples * 2
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24)
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }
  return buf
}

function tri(phase) {
  const p = phase - Math.floor(phase)
  return p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4
}

function softSquare(phase) {
  const s = Math.sin(2 * Math.PI * phase)
  return Math.tanh(2.4 * s)
}

function synthClick() {
  const dur = 0.055
  const n = Math.floor(SAMPLE_RATE * dur)
  const out = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 72)
    const freq = 1320 + 480 * Math.exp(-t * 90)
    ph += freq / SAMPLE_RATE
    out[i] = 0.42 * env * (0.65 * tri(ph) + 0.35 * Math.sin(2 * Math.PI * ph * 2))
  }
  return out
}

function synthCoin() {
  const dur = 0.26
  const n = Math.floor(SAMPLE_RATE * dur)
  const out = new Float32Array(n)
  let ph1 = 0
  let ph2 = 0
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const split = 0.085
    if (t < split) {
      const lt = t
      const env = Math.min(1, lt / 0.004) * Math.exp(-lt * 14)
      ph1 += 987.77 / SAMPLE_RATE // B5
      out[i] = 0.36 * env * (0.7 * tri(ph1) + 0.3 * softSquare(ph1))
    } else {
      const lt = t - split
      const env = Math.min(1, lt / 0.004) * Math.exp(-lt * 13)
      ph2 += 1318.51 / SAMPLE_RATE // E6
      const shimmer = Math.sin(2 * Math.PI * 2637.02 * lt) * 0.18
      out[i] = 0.38 * env * (0.65 * tri(ph2) + 0.22 * softSquare(ph2) + shimmer)
    }
  }
  return out
}

function synthFail() {
  const dur = 0.28
  const n = Math.floor(SAMPLE_RATE * dur)
  const out = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const u = t / dur
    const stepFreq = u < 0.45 ? 493.88 : 349.23 // B4 -> F4
    const freq = stepFreq * (1 - 0.12 * u)
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 9.5)
    ph += freq / SAMPLE_RATE
    out[i] = 0.36 * env * (0.65 * tri(ph) + 0.35 * softSquare(ph))
  }
  return out
}

function synthTurnFail() {
  const dur = 0.27
  const n = Math.floor(SAMPLE_RATE * dur)
  const out = new Float32Array(n)
  let ph = 0
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    let amp = 0
    let freq = 140
    if (t < 0.11) {
      const lt = t
      amp = Math.min(1, lt / 0.004) * Math.exp(-lt * 28)
      freq = 165 - 70 * (lt / 0.11)
    } else if (t >= 0.13) {
      const lt = t - 0.13
      amp = Math.min(1, lt / 0.004) * Math.exp(-lt * 24)
      freq = 130 - 55 * Math.min(1, lt / 0.14)
    }
    ph += freq / SAMPLE_RATE
    out[i] = 0.48 * amp * (0.75 * Math.sin(2 * Math.PI * ph) + 0.25 * tri(ph))
  }
  return out
}

fs.mkdirSync(outDir, { recursive: true })
const files = [
  ['click.wav', synthClick()],
  ['coin.wav', synthCoin()],
  ['fail.wav', synthFail()],
  ['turnfail.wav', synthTurnFail()],
]
for (const [name, samples] of files) {
  const full = path.join(outDir, name)
  const wav = encodeWav(samples)
  fs.writeFileSync(full, wav)
  console.log(`wrote ${path.relative(root, full)} (${wav.length} bytes)`)
}
