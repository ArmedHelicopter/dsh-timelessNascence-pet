// dsh-nascence-pet — 动画数据表
//
// 每段动画对应一个透明视频片段：素材路径、时长与是否循环都写在这里。
// 需要改动画只改这张表；状态机在 machine.js / catalog.js，不在这里。

// 交互动画结束回状态层时的淡化时长（ms）；其余切换一律硬切。
export const CLIP_FADE_MS = 320

// 工具调用成功 → 播 Happy 的概率（失败仍然必播 Sad 片段）
export const HAPPY_CHANCE = 0.25

// 难过/思考的入场与退场都走基础状态的 enter/exit 槽。

// 片段表：src 相对 /assets/video/；duration 只用于调试与取整，播放以 video 元素为准。
export const CLIPS = {
  Idle: { src: 'idle.webm', duration: 4.000, loop: true },
  Sad_Idle: { src: 'sad_idle.webm', duration: 4.000, loop: true },
  Think_Idle: { src: 'think_idle.webm', duration: 4.000, loop: true },
  Happy: { src: 'happy.webm', duration: 4.000 },
  Sad_Begin: { src: 'sad_begin.webm', duration: 2.670 },
  Sad_Exit: { src: 'sad_exit.webm', duration: 2.670 },
  Think_Begin: { src: 'think_begin.webm', duration: 2.670 },
  Think_Exit: { src: 'think_exit.webm', duration: 2.670 },
  Celebrate: { src: 'celebrate.webm', duration: 4.000 },
  Talk: { src: 'talk.webm', duration: 5.000 },
  Interact_1: { src: 'interact_1.webm', duration: 4.000 },
  Interact_2: { src: 'interact_2.webm', duration: 4.000 },
}

export const ANIMATION_NAMES = [
  'Idle', 'Sad_Idle', 'Think_Idle', 'Happy', 'Sad_Begin', 'Think_Begin',
  'Celebrate', 'Talk', 'Interact_1', 'Interact_2',
]
