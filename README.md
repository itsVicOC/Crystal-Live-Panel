# Crystal Live Panel

Crystal Live Panel 是面向 Windows 10/11 x64 的《宝可梦 水晶版》直播伴随应用。它通过 RetroArch 本机 UDP 网络命令接口只读游戏内存，并为 OBS 提供固定为 `1536 × 1024` 的实时浏览器叠加层。

> 当前版本：`1.0.4`。本项目是非官方同人项目，与 Nintendo、Creatures、GAME FREAK、The Pokémon Company、RetroArch、Libretro 或 OBS Project 无隶属或认可关系。

## 功能

- 以 4 Hz 轮询 RetroArch，只发送 `VERSION`、`GET_STATUS` 和 `READ_CORE_RAM`。
- 显示玩家姓名、5 位 ID、金钱、游戏时间和城都徽章。
- 显示最多六只队伍宝可梦的本地精灵图和等级。
- 显示城都地图地标；进入关都时切换为 `KANTO`。
- 暂停或断线时保留最后一次有效状态，并显示相应提示。
- ROM 仅在本地校验和提取素材，不复制、不上传，也不会写入 ROM、存档或模拟器内存。
- HTTP 和 WebSocket 服务只监听 `127.0.0.1`。

## 当前支持范围

首版只支持以下 ROM 与核心组合：

| 项目 | 要求 |
| --- | --- |
| 平台 | Windows 10/11 x64 |
| 模拟器 | RetroArch |
| 核心 | `tgbdual-libretro` 单游戏模式 |
| ROM 标题 | `PM_CRYSTAL` Rev 1 |
| CRC32 | `9AB996C9` |
| SHA-256 | `65701F63CFB8BCF88A56A6930236E659FC01FEC22BFAD0BE8BB49C739ADA406C` |
| OBS 页面 | `http://127.0.0.1:17654/overlay` |
| OBS 尺寸 | `1536 × 1024` |

仓库和 Release 均不包含 ROM、存档、BIOS 或运行时提取的精灵图。

## 快速开始

1. 从 [Releases](https://github.com/itsVicOC/Crystal-Live-Panel/releases) 下载 Windows x64 压缩包并完整解压。
2. 在 RetroArch 启用 `Settings → Network → Network Commands`，保存配置并重启 RetroArch；默认端口为 `55355`。
3. 使用 `tgbdual-libretro` 单游戏模式加载受支持的 ROM，并进入存档后的游戏画面。
4. 运行 `Crystal Live Panel.exe`，点击“选择 / 重新选择 ROM”。
5. 点击“保存并测试连接”，确认 `GET_STATUS_OK` 与 `READ_CORE_RAM_OK`。
6. 在 OBS 中先添加 RetroArch 捕获源，再在其上方添加浏览器源：
   - URL：`http://127.0.0.1:17654/overlay`
   - 宽度：`1536`
   - 高度：`1024`

完整安装、OBS 对齐、日常开播和卸载方法请阅读 [使用手册](docs/USER_GUIDE.md)。

## 文档

- [使用手册](docs/USER_GUIDE.md)：安装、RetroArch 设置、OBS 配置、开播流程和数据目录。
- [故障排查](docs/TROUBLESHOOTING.md)：诊断码、连接问题、ROM/RAM 问题和画面问题。
- [架构说明](docs/ARCHITECTURE.md)：进程结构、内存读取、数据接口、ROM Profile 和安全边界。
- [开发指南](docs/DEVELOPMENT.md)：环境、测试、构建、增加新 ROM Profile 和发布流程。
- [贡献指南](CONTRIBUTING.md)：提交 Issue 与 Pull Request 的要求。
- [安全策略](SECURITY.md)：安全问题的报告方式和项目安全模型。
- [更新记录](CHANGELOG.md)：各版本的重要变化。

## 开发速览

要求 Node.js 22 和 npm：

```bash
npm ci
npm test
npm run build
npm run package:win:zip
```

涉及真实 ROM 的可选测试必须显式提供本地路径；路径和 ROM 不会写入仓库：

```bash
CRYSTAL_TEST_ROM="/absolute/path/to/game.gbc" npm test
```

本机 UDP 集成测试：

```bash
npm run test:udp
```

更多信息见 [开发指南](docs/DEVELOPMENT.md)。

## 隐私与安全

- 应用没有遥测、账号系统或上传功能。
- UDP 目标只允许 `127.0.0.1` 或 `localhost`。
- 本地叠加服务只监听 loopback，端口固定为 `17654`。
- 网络命令有只读白名单，写内存命令会在客户端层被拒绝。
- 断线不会清空最后一次有效状态，非法 RAM 数据不会覆盖直播状态。

## 许可证与第三方权利

原创源代码和原创文档以 [MIT License](LICENSE) 开源。

MIT 许可证不授予任何第三方商标、角色、游戏数据或美术素材的权利。背景图中的宝可梦相关素材不在 MIT 授权范围内；详情见 [第三方权利声明](NOTICE.md)。使用者与再分发者应自行确认其所在地区的合法使用条件。
