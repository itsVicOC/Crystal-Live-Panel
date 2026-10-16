# 开发指南

## 环境要求

- Node.js 22 LTS。
- npm（使用仓库中的 `package-lock.json`）。
- 在 Windows 打包 NSIS 安装程序时使用 Windows x64 runner 或开发机。

真实运行验收还需要 RetroArch、`tgbdual-libretro`、OBS 和受支持 ROM。ROM 不属于开发依赖，不能提交到仓库。

## 安装依赖

```bash
npm ci
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm test` | 运行全部单元测试；真实 ROM 测试默认跳过 |
| `npm run test:watch` | 监听模式测试 |
| `npm run test:udp` | 启动临时 loopback UDP 服务，验证真实 socket 通信 |
| `npm run build` | 构建 Vite renderer 和 TypeScript 主进程 |
| `npm start` | 构建并启动 Electron |
| `npm run package:win` | 构建 Windows x64 NSIS 安装程序 |
| `npm run package:win:zip` | 构建 Windows x64 免安装 ZIP |
| `npm run package:win:all` | 同时构建 NSIS 与 ZIP |

## 真实 ROM 测试

只有显式设置环境变量时才读取真实 ROM：

```bash
CRYSTAL_TEST_ROM="/absolute/path/to/game.gbc" npm test
```

测试只读取文件并校验哈希，不复制或修改 ROM。不要把路径写死进源码、测试 fixture 或 CI secret。

## 背景图处理

仓库已经包含运行所需的 `public/overlay-background.png`。如果你有权使用新的 1536×1024 源图，可重新生成透明游戏窗口：

```bash
npm run prepare:background -- /absolute/path/to/background.png
```

脚本使用 `src/shared/overlay-layout.json` 中的 `x=64, y=112, 960×864` 清空游戏窗口。renderer 的 SVG 遮罩和控制面板对齐提示也读取该配置。当前源图、生成提示词和处理方法见 [背景与布局](BACKGROUND.md)。

### 地图数据

`src/shared/map-data.ts` 保存 26 个地图组中的 388 个地图对应地标，以及游戏原生 160×144 城镇地图中的地标坐标。来源版本记录在文件头，输入为 pret/pokecrystal 的 `data/maps/maps.asm`、`data/maps/landmarks.asm` 和 `constants/landmark_constants.asm`。

需要更新时，下载相同 commit 的三个文件，再运行：

```bash
node scripts/generate-map-data.mjs maps.asm landmarks.asm landmark_constants.asm <source-commit>
```

`world-map.ts` 负责区域归属及坐标归一化，`region-map.ts` 绘制共用原生坐标的 SVG 示意图。不要按地图组统一猜测所属城市，也不要从背景图片估算标记坐标。

道路的位置计算还使用同版本的 `constants/map_constants.asm` 与 `data/maps/attributes.asm`：

```bash
node scripts/generate-route-data.mjs map_constants.asm attributes.asm <source-commit>
```

此命令生成 `src/shared/route-data.ts`，记录全部 47 张室外道路地图的行走格尺寸和相邻地图的实际连接中心。`route-paths.ts` 定义区域示意图的中线，将地图内坐标投影到直线、弯道与岔路上；`region-map.ts` 直接绘制这些中线，避免显示路径和定位路径各用一套坐标。中线是区域图的缩略表达，不是可通行碰撞网格。

### 徽章像素素材

城都原始素材为 `assets/johto-badges-source.png`，关都为 `assets/kanto-badges-source.png`，来源版本与权利说明见 [NOTICE.md](../NOTICE.md)。运行以下命令可同时重建 `public/badges/johto.svg` 与 `public/badges/kanto.svg`：

```bash
npm run prepare:badges
```

脚本保留每枚徽章原始 16×16 的像素网格，去掉白色背景，并将其余三种颜色转换为可切换调色板的 SVG 路径。直播界面以 32×32 整数放大显示；默认使用中性灰，获得后统一使用水晶版徽章调色板。

原版《水晶》的训练师卡未提供独立的关都徽章图。关都素材使用初代原始像素；源图交替排列馆主头像和徽章，`kanto-badges.json` 仅引用第 1、3、5…15 帧的徽章，不渲染头像。数据读取仍来自《水晶》的 `wKantoBadges`，与素材来源独立。

`src/shared/johto-badges.json` 同时记录图形帧号和内存标志位。展示顺序中打击徽章在钢铁徽章前，但游戏的 `wJohtoBadges` 中钢铁为 `0x10`、打击为 `0x20`，不能直接用展示索引移位判断。

关都徽章由 `src/shared/kanto-badges.json` 记录，按灰色、蓝色、橙色、彩虹、粉红、金色、深红、绿色顺序分别对应 `0x01` 至 `0x80`。新增或修改读取字段时，必须覆盖 `ram-reader.test.ts` 的稀疏读取与 CPU 地址回退，避免 DTO 字段存在但轮询未读取的问题。

## 目录结构

```text
src/main/       Electron 主进程、UDP、ROM、RAM 和本地服务器
src/renderer/   控制面板与 OBS overlay
src/shared/     主进程和 renderer 共用 DTO/Profile
public/         Vite 静态素材
scripts/        preload 复制、背景处理和本地视觉 fixture
docs/           用户、故障排查、架构与开发文档
.github/        Windows CI/Release 工作流
```

## 测试层次

### 单元测试

- `decoder.test.ts`：字节序、金钱、队伍、地图和状态合并。
- `ram-reader.test.ts`：rcheevos 偏移、CPU 地址回退和全零诊断。
- `retroarch-client.test.ts`：命令白名单、回包格式和 UDP socket。
- `rom.test.ts`：CRC32、ROM 身份和可选真实 ROM 测试。
- `state-service.test.ts`：连接探测和错误分类。
- `world-map.test.ts`：城都/关都坐标、完整地标表、特殊地图与区域边界。
- `route-paths.test.ts`：道路进退、弯道、南北分图、相邻道路衔接、全部道路的边界和室内回退。
- `overlay-assets.test.ts`：GBC 比例、侧栏边界与透明窗口所有像素的 alpha。

### 视觉验证

先构建，再显式提供本地 ROM：

```bash
node scripts/visual-fixture.mjs /absolute/path/to/game.gbc
```

然后访问 `http://127.0.0.1:17654/overlay`。fixture 使用合成 RAM，不读取存档。

### Windows 实机验收

至少验证：

1. 新建游戏与读档。
2. 获得或移除队伍成员。
3. 升级、获得徽章和移动地图。
4. 暂停、快进、存档读取和重启 RetroArch。
5. 断线后保留最后有效状态。
6. OBS 1536×1024 页面和透明窗口对齐。

## 添加新的 ROM Profile

不要修改现有 Profile 去兼容不同哈希。建议流程：

1. 取得合法的目标 ROM 本地副本并计算 CRC32/SHA-256。
2. 从对应版本符号表确认 WRAM bank 和字段地址。
3. 把 CPU 地址转换为 RetroAchievements 逻辑偏移。
4. 确认字符表、金钱格式和多字节字节序。
5. 确认精灵指针、压缩、尺寸和调色板表。
6. 新增独立 `RomProfile`。
7. 为哈希、RAM fixture、字符、地图和精灵提取增加固定测试。
8. 在真实 RetroArch/Core 上完成验收。

如果目标 ROM 修改了 WRAM 布局，应为它维护独立地址配置，不在运行时扫描或猜测用户内存。

## 发布流程

1. 更新 `package.json` 和 `package-lock.json` 版本。
2. 更新 README/文档中的当前版本与 Release notes。
3. 运行：

   ```bash
   npm ci
   npm test
   npm run test:udp
   npm run build
   ```

4. 审计仓库和 ASAR 中没有 ROM、存档、私有路径和测试 fixture。
5. 提交并推送代码。
6. 创建 `v<version>` tag 并推送。
7. GitHub Actions 在 Windows runner 运行单元与 UDP 集成测试，构建 NSIS 与 ZIP，检查 ASAR 内容并生成 `SHA256SUMS.txt`，将三个文件附加到 Release 草稿。
8. 确认工作流成功、附件完整、版本与校验值一致后，填写更新说明并将草稿公开为正式 Release。

Release 产物目前未使用商业代码签名证书，应发布 SHA-256 供用户核对。

包内容检查与校验文件也可在本地构建完成后运行：

```bash
node scripts/audit-package.mjs
node scripts/release-checksums.mjs
```

## 代码约定

- TypeScript strict mode。
- 主进程内部 ESM；Electron preload 保持 `.cjs`。
- 文件修改保持最小范围，不提交生成目录。
- 网络命令必须保持只读白名单。
- 新增外部监听、遥测、上传或写内存能力必须先进行安全评审并明确告知用户。
