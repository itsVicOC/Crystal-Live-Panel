# Changelog

All notable changes to Crystal Live Panel are documented here.

## 1.0.4 - 2026-08-24

- 为六个队伍精灵槽增加独立白色圆角背景，改善透明像素精灵的显示效果。
- 补充完整用户手册、故障排查、架构、开发、贡献和安全文档。
- 以 MIT License 开放原创源码和文档，并增加第三方权利声明。
- 清理源码中本机 ROM/背景路径，真实 ROM 测试改为显式环境变量。
- 完善 Windows tag 构建与 GitHub Release 工作流。

## 1.0.3 - 2026-08-24

- 修正《宝可梦 水晶版》金钱字段：使用 24 位大端二进制整数，不再误按 BCD 解析。
- 修复金钱误判导致整帧玩家、队伍和地图状态不发布的问题。

## 1.0.2 - 2026-08-24

- 增加 RetroAchievements 连续偏移与 Game Boy CPU 原生地址双模式探测。
- 修正玩家 ID 和游戏小时的 16 位大端字节序。
- 增加全零 RAM 与地址模式诊断。

## 1.0.1 - 2026-08-24

- 修复 Windows Electron preload 模块格式导致 ROM 按钮无响应的问题。
- 增加 RetroArch 地址/端口配置、连接探测与原始状态回包。
- 区分 UDP 无响应、状态格式、RAM 命令不支持和超时。

## 1.0.0 - 2026-08-24

- 初始版本：RetroArch 只读 RAM、OBS 叠加层、训练师、徽章、队伍、地图与 ROM 本地精灵提取。
