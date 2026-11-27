# Timeless Nascence · DSH 桌宠

给 [DeepSeek Harness](https://deepseek.com)（DSH）装一只 **Timeless Nascence** 桌宠：透明动画状态机、极简气泡、实时星尘余额与坍缩花费提醒，外加可编辑台词库、语音与硬件状态挂牌。

<p>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-0b1430.svg"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-%E2%89%A50.2.0-3d6bff.svg">
  <img alt="tests" src="https://img.shields.io/badge/tests-70%20passing-2ea043.svg">
</p>

> [!NOTE]
> 配套皮肤在另一个仓库：[**dsh-timelessNascence-skin**](https://github.com/ArmedHelicopter/dsh-timelessNascence-skin) —— 藏青 / 黑 / 白极简科技风。
> 角色形象是基于《明日方舟》截图的二次创作同人素材，**不是官方素材**；授权范围见 [NOTICE.md](NOTICE.md)。

宣传片：**[promo/timeless-nascence-promo.mp4](promo/timeless-nascence-promo.mp4)**

---

## 目录

- [这是什么](#这是什么)
- [功能](#功能)
  - [动画状态机](#动画状态机)
  - [计费 · 峰谷 · 星尘](#计费--峰谷--星尘)
  - [互动 · 语音 · 音效](#互动--语音--音效)
  - [设置](#设置)
- [安装](#安装)
- [项目结构](#项目结构)
- [开发与测试](#开发与测试)
- [参考与致谢（参考仓库索引）](#参考与致谢参考仓库索引)
- [授权](#授权)

---

## 这是什么

DSH 客户端里的一只浮空桌宠。它由**透明视频片段**驱动（`888×748` WebM VP9-Alpha），按会话状态在 `idle` / `sad` / `think` 之间平滑切换，并在你发消息、跑工具、余额告急、遇上峰价时段时，用气泡 + 语音 + 音效给出反应。

代码派生自 [dsh-closure-pet](https://github.com/fengshiyangrouguan/dsh-closure-pet)（MIT，作者 FSYRG）的骨架 —— 状态机、气泡排版、设置页与计费管线都是在那套经过验证的结构上重写的。角色、配色、文案与动画全部换成 Timeless Nascence 的设定。

## 功能

### 动画状态机

* **三态 + 转场槽位**：`idle`、`sad`、`think` 各有独立 `loop` / `enter` / `exit` 片段；`sad` 与 `think` 之间经 `idle` 中转，跨多段转场时自动调整播放倍速，离开 `idle` 前等当前循环走完一轮。
* **变体随机**：`idle` 有星环、轨道、羽三套变体，事件片段支持单段或多段随机抽取。
* **事件联动**：订阅 `agent/assistant-stream`、`tools/result`、`agent/error`、`agent/status`、`session/event`，外加每 60 秒一次的余额轮询；notice 实例在运行时组装文案与气泡。
* **开屏检定**：拿到 `/state` 后延迟 5 秒（`localStorage['dshtn-startup-delay']` 可调）做一次峰谷检定，余额偏低时把 `lowBalance` 排进队列。
* **单一真相源**：一个 active 片段 + `seq` + 纯函数 `resolve()` 驱动全部状态。设计稿与测试矩阵见 [docs/state-machine.md](docs/state-machine.md)。

### 计费 · 峰谷 · 星尘

* **单条消息花费**：按 `assistant/message` 的 `usage` 计算

  $$\text{花费} = \text{cacheRead} \times \text{谷/峰价} + \text{input} \times \text{未命中价} + \text{output} \times \text{输出价}$$

  价目（每百万 token，`[谷价, 峰价]`）内置在 [lib/billing.js](lib/billing.js)，当日累计与设置持久化到 `$DSH_HOME/.dshtn.json`。
* **峰谷判定（北京时间）**：潮汐高峰 `09:00–12:00`、`14:00–18:00`（工作日）；其余时间、周末与法定节假日按引力低潮计价。
* **节假日表**：闭区间表在 [lib/period.js](lib/period.js) 的 `HOLIDAY_RANGES`（已收录 2026 全年与 2027 推定日期）。官方公布次年安排后补区间即可；未收录年份退化为按工作日/周末计算，`/state` 的 `holidaysOutdated` 会置真。

### 互动 · 语音 · 音效

* **拖拽防误触**：按下后在 window 捕获阶段拦截 `pointerdown` / `mousedown` / `selectstart` / `dragstart`，铺一层拖拽遮罩防点穿，松手吞掉一次合成 click，失焦或切后台自动清理。
* **语音**：61 条中文台词，按语言选预生成文件（`assets/voice/zh_*.mp3` + `manifest.json` 提供时长以驱动口型节奏），默认开启、可在设置里关。
* **音效**：`assets/audio/*.wav` 由 [tools/make-sfx.mjs](tools/make-sfx.mjs) 纯 Node 算法合成，不依赖任何第三方音频素材。
* **硬件挂牌**：右键开启后显示 CPU / 内存 / NVIDIA GPU 用量、显存与温度（`nvidia-smi` 可选，失败降级）；页面隐藏即停止采样。

### 设置

| 入口 | 打开方式 | 主要设置项 |
|---|---|---|
| 桌宠右键面板 | 右键点击桌宠本体 → 设置 | 镜像翻转、大小、吸附强度、气泡开关与大小、分级字体排版、透明度、音效、语音、硬件挂牌；底部「重置位置」「完成」 |
| DSH 设置页 | DSH 设置 → Nascence 桌宠 | 余额不足阈值、闲时对话间隔与概率、各状态/事件的对话池；底部「关闭」 |

两处修改都写回 `$DSH_HOME/.dshtn.json`，重载后保留。

## 安装

克隆本仓库到本地，然后在目标 profile 的 `package.json` 里把它指过去（本地开发安装方式）：

```json
{
  "dependencies": {
    "dsh-nascence-pet": "link:E:/path/to/dsh-timelessNascence-pet"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-nascence-pet"]
    }
  }
}
```

重启 DSH（或重载插件）后，桌宠出现在右下角。

**卸载**：在插件管理里停用 → 从 `dependencies` 与 `dsh.profile.bundles` 中移除 → 需要清理配置与当日花费时删除 `$DSH_HOME/.dshtn.json`。

> 客户端 bundle 由 DSH 通过 `/plugins/dsh-nascence-pet/client.js` 提供。改过 `assets/src/` 后务必先 `npm run build:client` 再刷新页面。

## 项目结构

```text
├── cordis.patch.yml          # Cordis bundle 入口
├── lib/                      # 宿主侧
│   ├── index.js              #   装配入口
│   ├── store.js              #   运行时状态、花费累计、持久化、余额轮询
│   ├── events.js             #   DSH 事件订阅与分发
│   ├── routes.js             #   HTTP 路由（/ping /state /config /hardware /assets/*）
│   ├── hardware.js           #   CPU / 内存 / GPU 采样
│   ├── period.js             #   峰谷时段判定（北京时间）
│   ├── billing.js            #   价目与花费计算（纯函数）
│   └── client.js             #   esbuild 打包产物（勿手改）
├── assets/
│   ├── src/                  # 客户端源码（打包进 lib/client.js）
│   │   ├── client-entry.js   #   bundle 入口
│   │   ├── main.js           #   DOM、位置、交互、模块装配
│   │   ├── core/ shared/     #   常量、设置归一化、前后端共享协议
│   │   ├── render/           #   命中掩码、A/B 双缓冲透明视频播放器
│   │   ├── anim/             #   片段库、状态注册表、状态机、运行时、notice
│   │   ├── ui/               #   布局、设置面板、气泡、设置页、谷价贴画、硬件挂牌
│   │   ├── input/drag.js     #   点击、拖拽锁定、右键
│   │   └── io/state.js       #   状态轮询与事件分发
│   ├── video/                #   888×748 WebM VP9-Alpha 动画
│   ├── voice/                #   61 条台词 + manifest.json
│   ├── audio/                #   合成音效（WAV）
│   └── fonts/                #   Ark Pixel 12px + OFL
├── art/                      # 角色制作管线（设定、提示词、关键帧、评审、语音素材）
├── docs/state-machine.md     # 状态机设计稿与测试矩阵
├── promo/                    # 宣传片（成片 + 可复现的渲染源码）
├── tools/                    # build-client.mjs、make-sfx.mjs
└── tests/                    # node --test 单元与接线测试
```

## 开发与测试

```bash
npm install
npm run build:client          # 重新打包 lib/client.js
node --test "tests/*.test.mjs" # 70 项测试
node tools/make-sfx.mjs       # 重新合成音效
```

`art/` 里的制作脚本（Python / Node）用于重跑角色出图、切帧与语音流水线，**不是运行依赖**；细节见 [art/design/character-sheet.md](art/design/character-sheet.md)。

## 参考与致谢（参考仓库索引）

本项目的骨架、素材与灵感来源如下。**代码层面的直接上游是前两项**，其余为字体、工具与视觉参考。

| # | 仓库 / 来源 | 在本项目中的作用 | 许可证 |
|---|---|---|---|
| 1 | [fengshiyangrouguan/dsh-closure-pet](https://github.com/fengshiyangrouguan/dsh-closure-pet) | **代码上游**：DSH 桌宠骨架（状态机、气泡、计费、设置页） | MIT |
| 2 | [fengshiyangrouguan/dsh-closure-skin](https://github.com/fengshiyangrouguan/dsh-closure-skin) | **配套皮肤的上游**（见 skin 仓库） | MIT |
| 3 | [TakWolf/ark-pixel-font](https://github.com/TakWolf/ark-pixel-font) | 可选像素字体 `assets/fonts/ark-pixel-12px.woff2` | MIT + OFL-1.1 |
| 4 | [TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font) | 皮肤正文字体（见 skin 仓库） | OFL-1.1 |
| 5 | [theleagueof/orbitron](https://github.com/theleagueof/orbitron) | 皮肤顶栏字标字体（见 skin 仓库） | OFL-1.1 |
| 6 | [DeepSeek Harness](https://deepseek.com) | 宿主平台与插件 API | — |
| 7 | [Bilibili · BV18zsm6EES5](https://www.bilibili.com/video/BV18zsm6EES5/) | 宣传片的节奏与「发布会」叙事参考 | — |

### 衍生关系

* `dsh-closure-pet` → **本仓库**：保留其工程结构（`lib/` + `assets/src/` 双端 + `cordis.patch.yml`）与状态机思路，角色、配色、文案、片段库、语音与硬件挂牌为本仓库新增或重写。
* 角色形象参考自《明日方舟》相关截图，经 AI 辅助生成为同人桌宠素材。**原角色与美术权利归权利人所有**，本仓库不主张权利，仅在本地娱乐范围内提供。
* 上游作者 FSYRG 的 MIT 许可与版权声明保留在 [LICENSE](LICENSE) 中。

## 授权

* **代码**（`lib/`、`assets/src/`、`tools/`、`tests/`）与**合成音效**：MIT，见 [LICENSE](LICENSE)。
* **角色动画 `assets/video/` 与角色形象**：同人素材，权利归原权利人；不得用于商业用途，再分发前请自行确认授权范围。
* **字体**：Ark Pixel，MIT + SIL OFL 1.1，全文见 [assets/fonts/OFL.txt](assets/fonts/OFL.txt)。
* 语音为 AI 合成音频（ElevenLabs），仅随本项目台词使用。

完整逐项说明见 [NOTICE.md](NOTICE.md)。
