# 架构说明

## 目标与边界

Crystal Live Panel 是只读伴随应用，不负责捕获或渲染游戏视频。OBS 负责把 RetroArch 捕获源与本项目的透明浏览器叠加层合成。

核心约束：

- 不修改 ROM、存档或模拟器内存。
- 不要求 RetroAchievements 登录。
- 不向公网监听端口。
- 不上传 ROM、存档、RAM 内容或遥测。
- 只在完整字段通过一致性校验后发布新状态。

## 运行时数据流

```text
RetroArch + tgbdual-libretro
          │
          │ UDP loopback
          │ VERSION / GET_STATUS / READ_CORE_RAM
          ▼
Electron 主进程
  RetroArchClient → StateService → Decoder
          │              │
          │              ├─ ROM Profile / RAM validation
          │              └─ last valid OverlayState
          ▼
Loopback HTTP + WebSocket server (127.0.0.1:17654)
          │
          ├─ /control     Electron 控制面板
          ├─ /overlay     OBS 浏览器源
          ├─ /api/state   当前 JSON 状态
          ├─ /ws          实时状态推送
          └─ /sprites/*   本地提取的精灵 PNG
```

## Electron 进程

### 主进程

入口为 `src/main/main.ts`，负责：

- 读取 `%APPDATA%\crystal-live-panel\config.json`。
- 创建 ROM 文件选择器。
- 启动状态轮询和本地 Web 服务。
- 暴露最小 IPC：选择 ROM、复制文本、打开叠加层、读取连接设置、测试连接。

Preload 使用 CommonJS 文件 `src/main/preload.cjs`。生产构建必须保留 `.cjs` 后缀，避免 Windows Electron 在隔离上下文中错误解析 ESM preload。

### Renderer

- `src/renderer/control.ts`：控制面板、连接设置、诊断和实时预览。
- `src/renderer/overlay.ts`：固定 1536×1024 的 OBS 叠加层。
- `src/renderer/overlay.css`：训练师卡、徽章、地图、队伍和状态横幅的绝对布局。

Renderer 没有 Node.js 权限；所有系统操作通过 `contextBridge` 的最小接口完成。

## RetroArch UDP 客户端

`src/main/retroarch-client.ts` 使用 UDP4 与 `127.0.0.1:55355` 通信。

允许的命令由正则白名单限制为：

```text
VERSION
GET_STATUS
READ_CORE_RAM <hex-address> <decimal-length>
```

任何写命令都会在发送前被拒绝。请求通过 Promise 队列串行化，每个请求使用独立 UDP socket 和超时，防止无请求 ID 的回包互相混淆。

`GET_STATUS` 解析容忍额外空格、额外字段和缺失 CRC；原始回包保留在手动连接诊断中。

## 轮询与状态发布

`StateService` 每 250 ms 尝试一次轮询，即 4 Hz。一次轮询包括：

1. 获取 RetroArch 版本（首次或重新配置后）。
2. 获取运行、暂停或未加载内容状态。
3. 校验 RetroArch 报告的 CRC（若提供）。
4. 按 Profile 的多个最小范围读取 RAM。
5. 解码并校验字段。
6. 仅在整帧有效时替换直播状态。

暂停、断线或读取失败不会清空上一次有效训练师、队伍和地图数据，只改变 `connection` 状态与诊断。

## Game Boy Color RAM 地址

RetroArch 的 `READ_CORE_RAM` 通过 rcheevos 的逻辑地址空间读取。对于 `tgbdual-libretro`：

- Game Boy `$C000–$CFFF` 对应连续偏移 `0x0000–0x0FFF`。
- WRAM bank 1 的 `$D000–$DFFF` 对应偏移 `0x1000–0x1FFF`。

例如 Rev 1 的 `wPlayerID` 位于 `$D47B`，标准命令地址是 `0x147B`。

为了兼容部分核心或构建，`ram-reader.ts` 会在标准偏移无效时尝试 Game Boy CPU 原生地址。成功后把模式缓存到后续轮询；失败时清除缓存并重新探测。

## ROM Profile

`RomProfile` 将某个精确 ROM 版本的行为隔离在独立配置中，包含：

- CRC32、SHA-256、标题和预期核心。
- RAM 读取范围与字段地址。
- 玩家字符表所需长度。
- 精灵指针、基础数据和调色板位置。

当前 Profile 位于 `src/shared/profile.ts`，只匹配 CRC32 `9AB996C9` 和对应 SHA-256。添加新版本时不应放宽现有哈希匹配，而应新增独立 Profile 并建立固定测试。

## 字段解码与校验

`decoder.ts` 当前处理：

- 玩家 ID 与游戏小时：16 位大端整数。
- 金钱：24 位大端二进制整数，上限 999,999。
- 姓名：第二世代英文、数字和少量标点字符表。
- 徽章：8 位位图与 popcount。
- 队伍：数量 0–6，物种 1–251，等级 1–100。
- 地图：组号、地图号和城都/关都地标归属。

任一关键字段为 error 时，`valid` 为 false，整帧不发布。warning（例如合法但尚未建立地标映射）不会阻止发布。

## 精灵提取

首次选择 ROM 时，`rom.ts`：

1. 校验 ROM 标题、CRC32 与 SHA-256。
2. 根据 Profile 读取精灵指针和尺寸。
3. 解压游戏使用的 LZ3 数据。
4. 解码 GBC 2bpp tile 和 15-bit 调色板。
5. 写入用户数据目录的透明 PNG。

提取目录不在源码、安装包或 Web 公网中。HTTP 服务器只允许形如 `/sprites/001.png` 的路径，并只监听 loopback。

## 本地 Web 接口

### `GET /api/state`

返回当前 `OverlayState`。主要字段：

```json
{
  "connection": {
    "status": "online",
    "updatedAt": "2026-08-24T00:00:00.000Z",
    "retroArchVersion": "1.21.0",
    "game": "Pokemon Crystal",
    "crc32": "9AB996C9",
    "diagnosticCode": null
  },
  "trainer": {
    "name": "RED",
    "id": 12345,
    "money": 123456,
    "gameTimeHours": 100,
    "gameTimeMinutes": 42,
    "badges": 173,
    "badgeCount": 5
  },
  "party": [],
  "location": {},
  "diagnostics": [],
  "rom": {}
}
```

### `GET /ws`

同源 WebSocket。连接后立即发送最新状态，以后每次状态变化发送完整 `OverlayState`，客户端无需合并补丁。

## 安全设计

- 连接设置只接受 loopback 主机名。
- HTTP/WebSocket 只绑定 `127.0.0.1`。
- 静态文件解析后必须位于 renderer 根目录。
- 精灵文件名使用严格的三位数字白名单。
- Electron 开启 `contextIsolation` 并关闭 renderer 的 Node integration。
- ROM 路径只保存在本地用户配置，不写入日志或构建产物。
- `.gitignore` 排除 ROM、存档、状态和构建产物。

安全报告方式见 [SECURITY.md](../SECURITY.md)。
