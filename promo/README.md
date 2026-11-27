# 宣传片

`timeless-nascence-promo.mp4` —— 52 秒，1920×1080 / 30fps，H.264 + AAC。

一部「发布会」体例的产品短片：冷开场 → 01 桌宠 → 02 主题 → 03 能力 → 两个仓库 → 结尾。全片按 BGM 的节拍网格切镜。

## 成片

| 文件 | 说明 |
|---|---|
| `timeless-nascence-promo.mp4` | 成片（约 6 MB） |
| `poster.jpg` | 封面帧 |

## 怎么做的

没有用剪辑软件，也没有用动效库。全片是一张 HTML 页面，**每一帧都由 `t` 决定**（没有 CSS 动画、没有 `requestAnimationFrame` 驱动），所以同一个 `t` 永远渲染出同一帧，可以逐帧重跑、逐帧对比。

```text
promo/src/
├── film.html      # 整片：9 个场景，render(t) 计算所有属性
├── splash.html    # 启动动画（1440×480 / 3.9s），也发布到 skin 仓库
├── serve.py       # 静态服务器，支持 Range（关键，见下）
├── render.py      # Playwright 逐帧 seek + 截图
├── analyze_bgm.py # 音频结构分析（能量段 / 节拍估计）
├── beats.py       # 在选定窗口内拟合节拍网格，输出切点候选
└── assets/        # 用到的图与 splash 片段
```

### 复现步骤

```sh
# 0) 依赖：Python 3 + playwright（Chromium）、ffmpeg
python -m http.server  # ❌ 不要用这个：它不支持 Range

# 1) 起带 Range 的静态服务（仓库根目录）
python promo/src/serve.py . 8917

# 2) 预览若干帧（不用渲染整片）
python promo/src/render.py --out promo/src/_still --still "1.2,9.4,24.2,48.4"

# 3) 渲染整片
python promo/src/render.py --out promo/src/frames --fps 30 --start 0 --end 52

# 4) 配乐：从源音乐里截 96–148s，做淡入淡出与响度归一
ffmpeg -ss 96 -t 52 -i <bgm> \
  -af "afade=t=in:st=0:d=0.55,afade=t=out:st=48.8:d=3.2,loudnorm=I=-11.5:TP=-1.2:LRA=9" \
  -ar 48000 -ac 2 promo/src/_audio_bgm.wav

# 5) 合成
ffmpeg -framerate 30 -i promo/src/frames/f_%05d.jpg -i promo/src/_audio_bgm.wav \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 19 -profile:v high -level 4.2 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -movflags +faststart -c:a aac -b:a 192k -shortest -t 52 \
  promo/timeless-nascence-promo.mp4
```

### 三个踩过的坑

1. **`python -m http.server` 放不了视频。** Chrome 对没有 `Accept-Ranges` 的 WebM 会认为时长未知，`video.currentTime = x` 直接无效（永远停在 0）。`serve.py` 实现了 Range，逐帧 seek 才成立。
2. **透明视频能直接进页面。** 桌宠片段是 VP9 + alpha 的 WebM，Chrome 在 `<video>` 里会正确保留 alpha，叠在任意背景上都干净——不需要先抽成 PNG 序列，也就不需要几百 MB 的中间文件。
3. **全画面必须由 `t` 算出来。** 只要有一处用 CSS transition 或 `setTimeout`，逐帧截图就会截到动画中间态，同一时间点每次渲染都不一样。

### 关于声音

**配乐**是一段用户提供的音轨，**没有随仓库分发**（只出现在成片里）。选段依据 `analyze_bgm.py` 的能量分析：96–100s 是铺垫，100s 落 drop，138–148s 收尾，取 96–148s 正好 52 秒。

节拍网格由 `beats.py` 拟合：约 **161.5 BPM**，一小节 1.486s，网格相位 0.164s。所有切镜点都落在小节或半小节上；每个场景边界都对照过附近的实际瞬态（onset）。

**旁白**由 `tts_vo.py` 生成，音色就是桌宠本人 —— ElevenLabs Voice Design 里的「基石白毛」(`nIHlF0W9GAWokF1eFwWt`)，通过官方 `elevenlabs` CLI 合成，认证走 CLI 自己的登录态，脚本不碰任何 API key。七句话分别落在七个节拍上，字幕与配音共用同一份 `vo/schedule.json`，不会各说各的：

| # | 入点 | 台词 | 对应画面 |
|---|---|---|---|
| 00 | 5.75s | 管理员，今天也一起看看这片宇宙吧。 | 桌宠登场 |
| 01 | 9.95s | 开心、发呆、难过——我都演给你看。 | 三态切换 |
| 02 | 18.30s | 把界面换成深空的颜色，就只剩下一道光。 | 主题 · 浅色 |
| 03 | 22.90s | 暗一点的宇宙，好像更适合待久一点。 | 主题 · 深色 |
| 04 | 32.20s | 星尘花去了哪里，我都替你记着。 | 星尘计费 |
| 05 | 40.75s | 两个仓库，各自独立，挑你喜欢的装就好。 | 两个仓库 |
| 06 | 46.70s | 来探索新的宇宙吧，管理员。 | 结尾 |

混音由 `build_audio.py` 完成：每句先做高通、压缩与响度归一（-15.5 LUFS），再用 **sidechain 压缩**把音乐压下去（`sidechaincompress`，阈值 0.012、比率 7、释放 420ms），而不是在固定时间点硬调音量；最后 `amix` 相加并过 limiter。成品约 **-13 LUFS / 真峰 -1.4 dBFS**。

重做旁白：

```sh
python promo/src/tts_vo.py --force     # 重新合成（需要 elevenlabs CLI 已登录）
python promo/src/build_audio.py        # 重新排期、混音、写 schedule.json
```

改台词就改 `tts_vo.py` 里的 `LINES`；改入点就改 `build_audio.py` 里的 `STARTS`（两处都要在对应场景窗口内）。


### 字体

成片使用系统字体渲染：`Bahnschrift Light`（拉丁标题）、`Noto Sans SC Light`（中文）、`Cascadia Mono`（标注）。换一台没有这些字体的机器重跑，字形会退回系统默认——成片本身不受影响，但重渲染结果会有差异。
