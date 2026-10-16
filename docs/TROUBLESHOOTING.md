# 故障排查

先在控制面板点击“保存并测试连接”，再根据诊断码定位问题。原始 `GET_STATUS` 回包和诊断码通常可以直接区分原因。

## 快速检查清单

1. RetroArch 与 Crystal Live Panel 是否运行在同一台电脑。
2. 是否启用了 `Settings → Network → Network Commands`。
3. 修改后是否保存配置并完全重启 RetroArch。
4. 两边端口是否一致，默认都是 `55355`。
5. 是否使用 `tgbdual-libretro` 普通单游戏模式。
6. 是否已加载 ROM 并进入存档后的游戏画面。
7. ROM CRC32 是否为 `9AB996C9`。

## 诊断码

| 诊断码 | 含义 | 处理方法 |
| --- | --- | --- |
| `UDP_VERSION_OK` | UDP 网络命令接口已响应 | 正常 |
| `GET_STATUS_OK` | 已取得内容或暂停状态 | 正常；继续检查 RAM |
| `READ_CORE_RAM_OK` | 核心支持只读 RAM | 正常 |
| `UDP_NO_RESPONSE` | 指定地址和端口没有响应 | 启用 Network Commands、核对端口、重启 RetroArch、检查防火墙 |
| `STATUS_FORMAT_UNSUPPORTED` | `GET_STATUS` 回包格式无法识别 | 升级 RetroArch，并在 Issue 中附上原始回包 |
| `READ_CORE_RAM_UNSUPPORTED` | RetroArch 或核心没有提供 CHEEVOS RAM | 使用官方较新 RetroArch 和 `tgbdual-libretro` |
| `RAM_READ_TIMEOUT` | 状态命令成功，但读 RAM 超时 | 升级核心/RetroArch，关闭异常双游戏模式 |
| `ROM_CRC_MISMATCH` | 当前运行 ROM 与已选择 ROM 不同 | 在 RetroArch 和应用中选择同一个受支持 ROM |
| `UNSUPPORTED_ROM` | 本地 ROM 哈希不受支持 | 仅使用支持表中的精确版本 |
| `ROM_READ_ERROR` | ROM 路径失效或文件不可读 | 重新选择 ROM，检查权限和文件位置 |
| `RAM_ADDRESS_MODE` | 已确定可用 RAM 地址模式 | 正常 |
| `RAM_ALL_ZERO` | 两种地址模式都没有读到初始化数据 | 进入存档画面；确认单游戏模式和正确核心 |
| `RAM_ADDRESS_MODE_UNRESOLVED` | 两种模式的字段校验均失败 | 附上全部字段诊断，补丁可能改变 WRAM 布局 |
| `RAM_VALIDATION_FAILED` | 关键字段无效，整帧不发布 | 查看紧随其后的具体字段错误 |
| `PLAYER_NAME` | 姓名未初始化或含不支持字符 | 进入游戏；首版只支持英文/数字字符表 |
| `GAME_TIME` | 时间字段超出范围 | 确认 ROM 和核心；附上诊断信息 |
| `MONEY` | 金钱超过游戏上限 | 正常游戏不应出现，检查 ROM 和核心 |
| `PARTY_COUNT` | 队伍数量不在 0–6 | 确认已进入存档和 ROM 版本 |
| `PARTY_1`–`PARTY_6` | 物种或等级非法 | 检查修改器、ROM 或核心内存映射 |
| `MAP` | 地图编号无效或暂未映射 | 未映射但合法的编号显示 `UNKNOWN` |

## ROM 按钮没有反应

此问题在 `1.0.1` 已修复。请确认已完整解压新版 ZIP、没有从压缩软件内部运行、界面没有显示“Electron 页面桥接加载失败”，且安全软件没有删除 `resources/app.asar`。

## RetroArch 始终离线

`UDP_NO_RESPONSE` 最常见原因是 Network Commands 没有真正保存或 RetroArch 尚未重启。打开设置、保存当前配置、完全退出 RetroArch、重新启动并加载游戏，再保持 `127.0.0.1:55355` 测试。

部分安全软件可能阻止本机 UDP。只需允许两个程序访问本机网络，不需要开放路由器端口。

如果 `GET_STATUS_OK` 成功但 RAM 命令失败，网络已经正常。升级 RetroArch 和核心，确保官方构建包含 CHEEVOS/RetroAchievements 内存支持；无需登录 RetroAchievements 账号。

## 读取到诊断，但图上没有显示

应用只发布通过一致性校验的整帧数据，避免直播时短暂读到一半更新的 RAM，造成姓名、队伍或金钱混搭。如果任一关键字段显示红色错误，应先解决该字段。

`1.0.3` 已修复《水晶》金钱应按三字节大端二进制解析的问题。

## 姓名显示问号或不显示

首版字符表仅支持英文大小写、数字、空格、连字符和句点。中文昵称或补丁新增字符不会被猜测转换。若英文名也无法读取，请检查 ROM 哈希和 RAM 地址模式。

## 队伍数量正确但精灵图缺失

1. 确认 ROM 区域显示 `Sprites ready`。
2. 点击“选择 / 重新选择 ROM”重新提取。
3. 检查 `%APPDATA%\crystal-live-panel\sprites\9AB996C9` 是否可写。

单个素材提取失败时显示编号占位，不会停止 RAM 读取。

## OBS 看不到页面

1. 在普通浏览器打开 `http://127.0.0.1:17654/overlay`。
2. 若浏览器也打不开，确认 Crystal Live Panel 正在运行。
3. 检查端口 `17654` 是否被其他程序占用。
4. OBS URL 不要使用 `https`、其他端口或本地文件路径。
5. 在 OBS 中刷新当前页面缓存。

## 游戏画面没有对齐

浏览器源必须设置为 `1536 × 1024`。透明窗口为 `x=64, y=112, 960×864`。RetroArch 捕获应裁切到实际游戏内容并保持 10:9；更新旧版后请修改捕获源的变换参数，再刷新 OBS 浏览器源。

当前背景 PNG 与页面遮罩都会清空同一个游戏窗口。请检查是否仍加载旧版应用、旧地址或旧浏览器缓存，以及 OBS 源上是否有额外的背景或滤镜。

## 地图标记位置不正确

道路显示“道路定位”时，标记按角色的地图内坐标沿区域示意图的道路移动。区域地图经过缩略，横穿道路、走向路边或在水域活动时，标记仍投影到道路中线上。进入城镇、建筑或洞穴后会改为固定的“地标定位”，房间内移动不会改变区域标记。

道路、洞穴与城市使用各自的地图编号；例如 `24:1` 为关都 26 号道路，`24:4` 才是若叶镇。非法或暂时越界的道路坐标会回落到所属地标。若仍有异常，请提供诊断中的地图编号、地标名称和当时的移动方向。

## 暂停或断线后数据没有清空

这是预期行为。应用保留最后有效状态，并显示 `PAUSED` 或 `RETROARCH OFFLINE`，避免网络抖动时直播面板全部闪空。

## 提交 Issue 时请提供

- Crystal Live Panel、Windows、RetroArch 和核心版本。
- 控制面板所有诊断码和消息。
- `GET_STATUS` 原始回包。
- ROM CRC32；不要上传 ROM 或存档。
- 问题发生在标题画面、新游戏、读档后还是战斗中。

请删除截图中不想公开的玩家名或其他个人信息。不要上传 ROM、存档、BIOS 或版权素材。
