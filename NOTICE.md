# NOTICE

本插件的**代码**可按 MIT 许可证使用；其余资源来源不同，分发前请逐项确认。本文件与 [LICENSE](LICENSE) 中的附加说明共同构成完整的授权说明。

## 代码与上游致谢

- 本插件代码派生自 [fengshiyangrouguan/dsh-closure-pet](https://github.com/fengshiyangrouguan/dsh-closure-pet)
  （MIT License，Copyright (c) 2026 FSYRG）。原始版权与许可声明完整保留在 [LICENSE](LICENSE) 中。
- 状态机、气泡排版、计费与峰谷时段、设置页的工程结构沿用该上游；Timeless Nascence 的角色、配色、
  文案、片段库、语音与硬件挂牌为本仓库的改造与新增。

## 角色形象与动画

- `assets/video/`、`art/keyframes/`、`art/sources/` 中的角色形象，是基于《明日方舟》相关截图、
  以 AI 辅助生成的**同人二次创作**桌宠素材，**不是官方素材**。
- 原角色与相关美术的权利归权利人所有；本仓库不主张任何权利，也不随附任何商业使用许可。
  请在个人本机娱乐范围内使用；对外再分发或任何商业用途前，请自行取得权利方许可。
- 若权利人提出异议，本仓库会立即移除相关素材。

## 音效与语音

- `assets/audio/*.wav`：由本仓库脚本 [tools/make-sfx.mjs](tools/make-sfx.mjs) 纯算法合成，
  不含任何第三方采样，随代码按 MIT 许可证提供。
- `assets/voice/*.mp3`：由 ElevenLabs 语音合成生成的中文台词成品，仅配合本项目台词库使用；
  台词文本见 [art/voice/lines.json](art/voice/lines.json)。

## 字体

- `assets/fonts/ark-pixel-12px.woff2` —— Ark Pixel Font，作者 [TakWolf](https://github.com/TakWolf/ark-pixel-font)，
  上游采用 **MIT + SIL OFL 1.1** 双许可；本仓库按 SIL Open Font License 1.1 使用，
  许可证全文见 `assets/fonts/OFL.txt`。
- 分发时须随附该许可证文件；不得单独售卖该字体；修改版不得使用保留字体名。

## 宣传片

- `promo/timeless-nascence-promo.mp4` 由本仓库源码渲染生成（见 `promo/`），画面素材来自本项目的
  角色动画与自绘界面示意，随本仓库按 MIT 发布。
- 成片中的 BGM 是用户提供的第三方音轨片段，**仅作宣传演示用途**，不在 MIT 授权范围内；
  本仓库不单独分发该音频源文件。

## 设置与数据文件

运行后在 `$DSH_HOME/.dshtn.json` 写入设置与当日花费统计（`settings` / `spend`）。
该文件只保存在本地，插件不收集、不上传任何数据。卸载时可手动删除；不删也不影响 DSH 其他功能。

## 免责

本项目按「现状」提供，不附带任何明示或暗示的担保。使用者应在遵守所在司法辖区法律的前提下自行承担使用风险。