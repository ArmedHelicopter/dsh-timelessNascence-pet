# dsh-nascence-pet

给 DeepSeek Harness 界面加一只 **Timeless Nascence** 桌宠：透明视频动作切换、宇宙深蓝与星金配色的像素气泡、实时星尘余额与坍缩花费提醒，以及可编辑的台词库与算法合成音效。

> [!NOTE]
> **版权与来源说明**：本插件代码基于 `dsh-closure-pet`（MIT License，致谢原作者 FSYRG）改造，代码与合成音效遵循 [MIT 许可证](LICENSE)；角色美术为基于用户参考图以 AI 辅助生成的原创角色同人素材；字体使用 **Ark Pixel**（SIL OFL 1.1，见 `assets/fonts/OFL.txt`）。完整说明见 [`NOTICE.md`](NOTICE.md)。

---

## 快速开始

### 本地开发安装

编辑对应 profile 的 `package.json`，将依赖指向本地目录，并加入 `dsh.profile.bundles`：

```json
{
  "dependencies": {
    "dsh-nascence-pet": "link:<本地路径>/pet"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-nascence-pet"]
    }
  }
}
```

### 卸载方式

1. 在插件管理中停用插件（客户端 bundle 会随之卸载；若改过宿主代码，按需重启 DSH）。
2. 从 profile 的 `dependencies` 和 `dsh.profile.bundles` 中删除 `dsh-nascence-pet`。
3. 如需清理配置与当日花费记录，可手动删除 `$DSH_HOME/.dshtn.json`。

---

## 核心功能

### 动画状态机与表现

* **基础状态与转场**：内置 `idle`、`sad`、`think` 三种基础状态，均配有独立 `loop`、`enter` 与 `exit` 槽位。状态切换通过 `Sad_Begin` / `Think_Begin` 进入、`Sad_Exit` / `Think_Exit` 退出，`sad` 与 `think` 之间经由 `idle` 中转，跨多段转场时自动调整倍速，离开 `idle` 前会等当前循环走完一轮。
* **事件与通知联动**：监听 `agent/assistant-stream`、`tools/result`、`agent/error`、`agent/status`、`session/event`（`assistant/message` 计费、`turn/end` 结束）及每 60 秒一次的账户余额轮询。事件可绑定单段或多段视频（均匀随机抽取），并携带 `notice` 实例动态组装文案与气泡。
* **开屏检定**：拿到 `/state` 后默认延迟 5 秒（可通过 `localStorage['dshtn-startup-delay']` 调整）执行一次峰谷检定，走常规事件管线触发 `peak_time` 或 `valley_time`，若星尘余额偏低则将 `lowBalance`（优先级 20，纯文本通知）排入队列提示。
* **独立状态机**：统一由单一 active 片段、`seq` 与纯 `resolve()` 驱动。详细设计见 [`docs/state-machine.md`](docs/state-machine.md)。

### 计费、峰谷时段与星尘提醒

* **计费公式**：按 `assistant/message` 的 `usage` 计算单条消息花费：
  $$\text{花费} = \text{cacheRead} \times \text{谷/峰价} + \text{input} \times \text{未命中价} + \text{output} \times \text{输出价}$$
  价目（每百万 token，`[谷价, 峰价]`）内置于 `lib/billing.js`，当日累计花费与设置一并持久化至 `$DSH_HOME/.dshtn.json`。
* **峰谷判定（北京时间）**：
  * **潮汐高峰（峰价时段）**：工作日 `09:00–12:00`、`14:00–18:00`。
  * **引力低潮（谷价时段）**：其余时间、周末及法定节假日全天。
* **节假日表维护**：闭区间表位于 `lib/period.js` 的 `HOLIDAY_RANGES`（当前收录 2026 全年与 2027 推定日期）。官方公布次年调休安排后更新对应区间即可；未收录年份会退化为仅按工作日与周末计算，此时 `/state` 中 `holidaysOutdated` 会置为 true 以便提醒更新。

### 文案、音效与语音

* **算法合成音效**：`assets/audio/` 中的 `click.wav`、`coin.wav`、`fail.wav`、`turnfail.wav` 由 `tools/make-sfx.mjs` 纯 Node 合成生成，无第三方音频依赖。
* **语音默认关闭**：代码保留语音播放能力（默认关闭），可在未来补充语音资产后开启。
* **可编辑台词库**：DSH 设置页支持调整余额不足阈值、闲时对话间隔，并分别维护 `Idle`、`Sad_Idle`、`Think_Idle` 闲时池及各事件对话池（初始值来自 `assets/src/config/dialogues.json`）。

### 交互、设置与运行开销

* **拖拽防误触锁定**：按下桌宠后在 window 捕获阶段拦截 `pointerdown`、`mousedown`、`selectstart`、`dragstart`，为 `<html>` 加上 `dshtn-dragging` 样式（`user-select:none`、`cursor:grabbing`），并铺设 `#dsh-nascence-pet-drag-shield` 遮罩层防止点穿或被 iframe 抢焦点；松手后吞掉单次合成 `click`，失焦、切后台或 `pointercancel` 时自动清理。
* **桌面右键设置**：支持镜像翻转、缩放大小、吸附强度（`0%–200%`，`0%` 关闭）、气泡开关与大小（`50%–200%`）、分级字体排版（默认开启）、透明度、音效开关/音量、语音开关/语言/音量，以及硬件挂牌开关与位置（下方/上方）。
* **硬件状态挂牌**：右键开启后显示 CPU / 内存 / NVIDIA GPU 用量、显存与温度；采用深蓝、钴蓝与星金主题配色，页面关闭、隐藏或切换到屏保时停止采样。
* **轻量渲染**：角色由浏览器直接解码 `888×748` 的 WebM VP9-Alpha 视频，页面隐藏时暂停视频播放，并将状态轮询间隔从 1 秒放宽至 5 秒。

### 设置入口

| 入口 | 打开方式 | 主要设置项 |
|---|---|---|
| 桌宠右键面板 | **右键点击桌宠本体** → 设置 | 镜像翻转、大小、吸附强度、气泡开关、气泡大小、分级字体排版、透明度、音效开关/音量、语音开关/语言/音量、硬件挂牌开关与位置；底部「重置位置」和「完成」 |
| DSH 设置页 | **DSH 设置 → Nascence 桌宠** | 余额不足阈值、闲时对话间隔、闲时对话触发概率；闲时随机 / 悲伤时随机 / 思考时随机对话池；事件对话池；点击交互对话池；底部「关闭」 |

两处修改都会写入 `$DSH_HOME/.dshtn.json`，刷新或重载后保留。

---

## 项目结构

```text
├── cordis.patch.yml            # Cordis bundle 入口配置
├── docs/
│   └── state-machine.md        # 状态机设计稿、状态表、优先级与测试矩阵
├── lib/
│   ├── index.js                # 宿主装配入口
│   ├── store.js                # 运行时状态、花费累计、持久化与余额轮询
│   ├── events.js               # DSH 事件订阅与分发
│   ├── routes.js               # HTTP 路由（/ping、/state、/config、/hardware、/assets/*）
│   ├── hardware.js             # CPU / 内存 / GPU 采样（nvidia-smi 可选，失败降级）
│   ├── period.js               # 峰谷时段判定（北京时间）
│   ├── billing.js              # 计费价目与单条消息花费计算（纯函数）
│   └── client.js               # esbuild 打包生成的自包含客户端 bundle（勿手改）
├── assets/
│   ├── src/                    # 客户端源码（打包进 lib/client.js）
│   │   ├── client-entry.js     # bundle 入口，注册 factory / slot
│   │   ├── main.js             # DOM、位置、交互与模块装配
│   │   ├── core/               # 常量、日志、设置读写与持久化
│   │   ├── shared/             # 前后端共享协议与设置归一化
│   │   ├── render/             # 静态命中区掩码与 A/B 双缓冲透明视频播放器
│   │   ├── anim/               # 片段库、状态注册表、状态机、运行时与 notice 类
│   │   ├── config/dialogues.json # 默认对话池配置
│   │   ├── ui/                 # 布局、设置面板、像素气泡、DSH 设置页、谷价贴画、硬件挂牌
│   │   ├── input/drag.js       # 点击、拖拽锁定与右键交互
│   │   └── io/state.js         # 宿主状态轮询与事件分发
│   ├── video/                  # 888×748 WebM VP9-Alpha 透明动画素材
│   ├── fonts/                  # Ark Pixel 12px 字体与 OFL 声明
│   └── audio/                  # click / fail / coin / turnfail 音效（WAV）
├── tools/
│   ├── build-client.mjs        # esbuild 客户端打包脚本
│   └── make-sfx.mjs            # 合成 WAV 音效脚本
└── tests/                      # node --test 单元测试与接线验证
```

---

## 开发与验证

### 构建与测试

```bash
npm install
node tools/make-sfx.mjs
npm run build:client
node --test "tests/*.test.mjs"
```

> 客户端 bundle 由 DSH 通过 `/plugins/dsh-nascence-pet/client.js` 提供；修改前端源码后请先执行 `npm run build:client` 再刷新页面。

---

## 许可证

代码部分与合成音效采用 [MIT License](LICENSE)（衍生自 `dsh-closure-pet`，MIT License，致谢 FSYRG）；角色素材与字体的授权说明请参见 [`NOTICE.md`](NOTICE.md)。
