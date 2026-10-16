# Crystal Live Panel · 水晶直播面板

**为《宝可梦 水晶版》直播提供实时训练师、队伍与冒险进度面板。**

[![Release](https://img.shields.io/github/v/release/itsVicOC/Crystal-Live-Panel)](https://github.com/itsVicOC/Crystal-Live-Panel/releases/latest)
[![Windows release](https://github.com/itsVicOC/Crystal-Live-Panel/actions/workflows/build-windows.yml/badge.svg)](https://github.com/itsVicOC/Crystal-Live-Panel/actions/workflows/build-windows.yml)
[![Platform](https://img.shields.io/badge/platform-Windows_10%2F11_x64-0078D4)](#兼容范围)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**简体中文** · [English](README.en.md)

[下载 Windows 版](https://github.com/itsVicOC/Crystal-Live-Panel/releases/latest) · [使用手册](docs/USER_GUIDE.md) · [报告问题](https://github.com/itsVicOC/Crystal-Live-Panel/issues) · [更新记录](CHANGELOG.md)

Crystal Live Panel 是一个 Windows 桌面应用，通过 RetroArch 的本机 UDP 网络命令接口只读游戏状态，将训练师资料、队伍精灵和地图位置实时显示在 OBS 浏览器源中。游戏画面由 OBS 单独捕获，叠加层通过透明窗口与它合成。

> **版本说明：**最新发布版为 [v1.0.4](https://github.com/itsVicOC/Crystal-Live-Panel/releases/tag/v1.0.4)。下方截图展示本地尚未发布的界面改版；中文界面、两地 16 枚徽章、道路移动定位与新布局属于开发中功能，不包含在 v1.0.4 中。本次 README 更新不发布新的程序版本。

## 目录

- [界面预览](#界面预览)
- [功能](#功能)
- [兼容范围](#兼容范围)
- [快速开始](#快速开始)
- [OBS 配置](#obs-配置)
- [常见问题](#常见问题)
- [本地数据与隐私](#本地数据与隐私)
- [从源码运行](#从源码运行)
- [架构与接口](#架构与接口)
- [文档导航](#文档导航)
- [参与贡献](#参与贡献)
- [致谢与许可证](#致谢与许可证)

## 界面预览

![开发版直播叠加层：透明游戏窗口、区域地图、训练师卡、六个队伍槽和徽章栏](docs/images/overlay-preview.png)

*开发版示例数据预览。棋盘格和“游戏画面”文字用于说明透明区域，实际直播时由 OBS 下层的游戏捕获源填充；空队伍用于展示占位状态。素材来源见[预览图说明](docs/images/README.md)。*

<details>
<summary>展开查看开发版控制面板</summary>

![开发版控制面板：直播预览、OBS 地址、游戏文件选择和连接诊断](docs/images/control-preview.png)

控制面板提供游戏文件选择、本机地址与端口设置、连接测试、诊断信息和叠加层预览。截图使用示例训练师数据。

</details>

## 功能

| 能力 | 已发布的 v1.0.4 | 本地开发版（未发布） |
| --- | --- | --- |
| 训练师资料 | 姓名、5 位 ID、金钱、游戏时长 | 保留，更新信息卡片布局 |
| 队伍 | 最多六只宝可梦的正面精灵与等级 | 改为 3 列 × 2 行，增加编号和中文等级提示 |
| 徽章 | 城都八枚徽章 | 城都、关都各八枚；按区域切换，显示两地合计进度 |
| 地图 | 城都地标；进入关都显示 `KANTO` | 两地独立区域示意图、388 张地图的地标映射、46 条道路的相对移动定位 |
| 界面 | 原版布局与文案 | 简体中文界面、紫蓝夜景、独立侧栏卡片 |
| OBS | `1536 × 1024` 浏览器叠加层 | 相同画布，游戏窗口改为 GBC 原生画面的六倍整数缩放 |

两版均以 **4 Hz** 尝试读取游戏状态；暂停、断线或数据校验失败时保留最后一次有效数据。只允许发送 `VERSION`、`GET_STATUS` 与 `READ_CORE_RAM`，不修改 ROM、存档或模拟器内存。

开发版地图是区域示意图：道路标记表示沿道路的相对位置，城镇、建筑和洞穴使用固定地标，并非逐格地形或导航地图。当前不显示 HP、异常状态、持有物或招式；其他游戏、ROM 版本和核心尚无兼容保证。

## 兼容范围

RetroArch、应用和 OBS 需要运行在**同一台电脑**上。

| 项目 | 要求 |
| --- | --- |
| 操作系统 | Windows 10 / 11，x64 |
| 模拟器 | RetroArch，启用 Network Commands |
| 核心 | `Nintendo - Game Boy / Color (TGB Dual)`，即 `tgbdual-libretro`；普通单游戏模式 |
| 游戏文件 | 标题为 `PM_CRYSTAL`、基于 Rev 1 的指定补丁版本，必须匹配下方两个哈希 |
| 直播软件 | OBS Studio，支持浏览器源 |
| RetroArch 连接 | 默认 `127.0.0.1:55355`，UDP；端口可配置 |
| 叠加层服务 | 固定 `127.0.0.1:17654`，HTTP / WebSocket |

```text
CRC32     9AB996C9
SHA-256   65701F63CFB8BCF88A56A6930236E659FC01FEC22BFAD0BE8BB49C739ADA406C
```

**相同标题或 Rev 1 标记不足以证明兼容。**原版及其他汉化、改版可能具有不同的哈希、内存布局或素材地址。应用会在本地校验文件身份，请以精确哈希为准。

仓库和安装包均不提供 ROM、存档、BIOS 或运行时提取的宝可梦精灵图。请自行准备有权使用的游戏文件。macOS、Linux、其他架构与双游戏模式不在当前支持范围内。

## 快速开始

1. **下载并运行应用。**前往 [Releases](https://github.com/itsVicOC/Crystal-Live-Panel/releases/latest)，下载 `Crystal-Live-Panel-<版本>-x64.zip` 并完整解压，运行 `Crystal Live Panel.exe`；也可选择 `.exe` 安装程序。普通使用无需安装 Node.js。
2. **开启 RetroArch 网络命令。**在 `Settings → Network → Network Commands` 中启用该功能，保持端口为 `55355`，保存配置并完全重启 RetroArch。
3. **加载游戏。**使用 TGB Dual 普通单游戏模式打开受支持的 ROM，进入新游戏或读档后的可操作画面。
4. **选择同一个 ROM。**在应用中点击“选择 / 重新选择 ROM”（开发版为“选择 / 重新选择游戏文件”），等待文件校验与本地精灵提取完成。
5. **测试连接。**保持地址 `127.0.0.1` 与相同的 UDP 端口，点击“保存并测试连接”。应看到 `UDP_VERSION_OK`、`GET_STATUS_OK`、`READ_CORE_RAM_OK`；开发版以中文标题展示诊断，悬停可查看编号。
6. **配置 OBS。**按[下节](#obs-配置)添加浏览器源并对齐游戏捕获。保持应用运行，确认预览中的训练师与队伍正确后开播。

发行包目前未使用商业代码签名证书。如果 Windows 提示来源未知，请核对下载来源，并在 Release 提供校验值时验证文件。应用没有自动更新器，更新时应关闭旧版并完整解压新版。

## OBS 配置

在 OBS 的源列表中，将 **Crystal Live Panel 浏览器源放在 RetroArch 捕获源上方**。

| 浏览器源选项 | 设置 |
| --- | --- |
| URL | `http://127.0.0.1:17654/overlay` |
| 宽度 | `1536` |
| 高度 | `1024` |
| 自定义 CSS | 留空 |

先将 RetroArch 捕获裁切到实际游戏内容，再按所用版本设置变换。以下坐标均以叠加层左上角为原点，且假设浏览器源尚未缩放：

| 游戏捕获参数 | v1.0.4 原版布局 | 未发布的新布局（截图所示） |
| --- | --- | --- |
| 位置 X / Y | `194` / `108` | `64` / `112` |
| 宽度 × 高度 | `854 × 768`，旧版窗口边界 | `960 × 864`，精确 `10:9` |

新版窗口是 GBC 原生 `160 × 144` 的六倍。使用改版程序时，应同步更新 OBS 变换并刷新浏览器源；请勿将新版坐标直接用于 v1.0.4。若直播画布尺寸不同，可先将两个源分组，再作为整体等比缩放与移动。

叠加层不会捕获游戏画面或声音。音视频采集由 OBS 配置，完整步骤见[使用手册](docs/USER_GUIDE.md)。

## 常见问题

| 现象 | 优先检查 |
| --- | --- |
| `UDP_NO_RESPONSE` / 始终离线 | Network Commands 是否已开启并保存、RetroArch 是否已重启、两边端口是否一致 |
| 状态读取成功，RAM 读取失败 | 使用较新的官方 RetroArch 与 TGB Dual，确认普通单游戏模式；无需登录 RetroAchievements |
| `UNSUPPORTED_ROM` / `ROM_CRC_MISMATCH` | 文件是否匹配两个哈希，应用与 RetroArch 是否选择同一份游戏 |
| `RAM_ALL_ZERO` / 数据一直为空 | 进入游戏后再测试，检查核心和完整字段诊断；无效帧不会覆盖直播数据 |
| 有队伍数据但没有精灵图 | 重新选择 ROM 提取缓存，并检查用户数据目录的写权限 |
| OBS 页面打不开或游戏错位 | 应用是否运行、`17654` 是否可用、源尺寸和版本对应的捕获参数是否正确 |
| 暂停或断线后仍显示旧数据 | 这是保留最后有效状态的预期行为，请同时观察连接提示 |
| 中文玩家名无法识别 | 当前姓名字符表支持英文、数字及少量标点；中文界面不代表支持中文玩家名 |

更多诊断码见[故障排查](docs/TROUBLESHOOTING.md)。提交 Issue 时请附应用、Windows、RetroArch 和核心版本、CRC32、诊断码及复现步骤；请勿上传 ROM 或存档，并遮去截图中的私人信息。

## 本地数据与隐私

- ROM 仅在本机读取，用于身份校验与精灵图提取；不复制原始 ROM，也不上传游戏文件或 RAM。
- 无遥测、账号系统或云端服务。HTTP / WebSocket 只监听 `127.0.0.1`，UDP 配置只接受 `127.0.0.1` 或 `localhost`。
- 写内存命令在客户端白名单层被拒绝；仅完整且校验通过的状态会更新面板。
- 玩家姓名、ID 和游戏进度会显示在叠加层中，加入直播后会随画面公开。

Windows 用户数据通常保存在：

```text
%APPDATA%\crystal-live-panel\
├── config.json            # 原 ROM 路径、本机地址与端口
└── sprites\9AB996C9\       # 从本地 ROM 提取的 PNG 缓存
```

更新通常会保留这些数据。卸载免安装版可删除程序文件夹；如需同时清理配置与缓存，关闭应用后再删除上述用户数据目录。下次启动需重新选择 ROM。

## 从源码运行

项目使用 **Node.js 22 LTS + npm**。打包与直播验收的目标平台为 Windows x64。

```bash
git clone https://github.com/itsVicOC/Crystal-Live-Panel.git
cd Crystal-Live-Panel
npm ci
npm test
npm start
```

`npm start` 会先构建，再启动 Electron。只构建文件可运行 `npm run build`。

| 命令 | 用途 |
| --- | --- |
| `npm test` | 单元测试；未提供真实 ROM 时跳过相应可选测试 |
| `npm run test:watch` | 监听文件变化并运行测试 |
| `npm run test:udp` | 本机临时 UDP 服务的 socket 集成测试 |
| `npm run build` | 构建 Vite 页面与 TypeScript 主进程 |
| `npm run package:win` | 构建 Windows x64 NSIS 安装程序 |
| `npm run package:win:zip` | 构建 Windows x64 免安装 ZIP |
| `npm run package:win:all` | 同时构建 NSIS 与 ZIP |

打包输出位于 `release/`，推荐在 Windows x64 开发机或 GitHub Actions Windows runner 上执行。工作流支持手动触发，并在推送 `v*` 标签时构建和发布；普通文档提交不会创建 Release。

如需运行可选的真实 ROM 测试，请显式提供本地路径：

```powershell
# Windows PowerShell
$env:CRYSTAL_TEST_ROM = "C:\Games\game.gbc"
npm test
Remove-Item Env:CRYSTAL_TEST_ROM
```

```bash
# Bash / Zsh
CRYSTAL_TEST_ROM="/absolute/path/to/game.gbc" npm test
```

不要将 ROM、存档、提取素材或本机路径加入仓库。新增 ROM 支持应使用独立 Profile、精确哈希和对应测试，见[开发指南](docs/DEVELOPMENT.md)。

## 架构与接口

```text
RetroArch + TGB Dual
  └─ 本机 UDP：VERSION / GET_STATUS / READ_CORE_RAM
      └─ Electron 主进程：读取 → 解码与校验 → 保留最后有效状态
          └─ 127.0.0.1:17654：HTTP + WebSocket
              ├─ Electron 控制面板
              └─ OBS 浏览器源
```

| 本机接口 | 用途 |
| --- | --- |
| `GET /control` | 控制面板页面；ROM 选择等系统操作需要 Electron 桥接 |
| `GET /overlay` | OBS 使用的固定尺寸页面 |
| `GET /api/state` | 当前 JSON 状态快照 |
| `ws://127.0.0.1:17654/ws` | 连接后发送当前状态，随后推送完整状态 |
| `GET /sprites/001.png` | 本地提取的精灵图，文件名使用三位编号 |

```text
src/main/       Electron、UDP 客户端、ROM/RAM 解码、本机服务
src/renderer/   控制面板和直播叠加层
src/shared/     状态类型与 ROM Profile
public/         页面静态资源
scripts/        构建辅助与素材处理
docs/           用户、开发和架构文档
.github/        Windows 构建与发布工作流
```

详细的地址模式、字节序、字段校验与安全边界见[架构说明](docs/ARCHITECTURE.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [使用手册](docs/USER_GUIDE.md) | 安装、开播、OBS 对齐、日常使用与卸载 |
| [故障排查](docs/TROUBLESHOOTING.md) | 诊断码、连接、游戏文件、RAM 与画面问题 |
| [开发指南](docs/DEVELOPMENT.md) | 环境、测试、构建、Profile 与发布流程 |
| [架构说明](docs/ARCHITECTURE.md) | 进程、数据流、接口与安全设计 |
| [贡献指南](CONTRIBUTING.md) | Issue、Pull Request 与贡献要求 |
| [安全策略](SECURITY.md) | 支持版本与私下漏洞报告 |
| [更新记录](CHANGELOG.md) | 已发布版本变化；开发中的改动可能尚未推送 |
| [第三方权利声明](NOTICE.md) | 第三方游戏素材、商标与授权范围 |

## 参与贡献

欢迎通过 [Issues](https://github.com/itsVicOC/Crystal-Live-Panel/issues) 提供可复现的问题、文档改进或功能建议，也欢迎提交 Pull Request。请先阅读[贡献指南](CONTRIBUTING.md)，从最新 `main` 创建分支，并为行为变化补充测试；提交前运行 `npm test` 与 `npm run build`。

请保持本机连接、只读命令和无遥测的设计。安全问题请依照[安全策略](SECURITY.md)私下报告，不要在公开 Issue 中包含利用细节或私人文件。

## 致谢与许可证

感谢 [RetroArch / Libretro](https://github.com/libretro/RetroArch)、[TGB Dual](https://github.com/libretro/tgbdual-libretro)、[OBS Studio](https://github.com/obsproject/obs-studio)、[Electron](https://github.com/electron/electron)、[pret/pokecrystal](https://github.com/pret/pokecrystal) 及 [pret/pokered](https://github.com/pret/pokered) 社区的工具、研究和资料。

本项目由 [itsVicOC](https://github.com/itsVicOC) 与贡献者维护。原创源代码及原创文档使用 [MIT License](LICENSE)。MIT 不授予第三方商标、角色、游戏数据或美术素材的权利，具体范围见 [NOTICE.md](NOTICE.md)。

Crystal Live Panel 是非官方同人项目，与 Nintendo、Creatures、GAME FREAK、The Pokémon Company、RetroArch、Libretro 或 OBS Project 无隶属、赞助或认可关系。
