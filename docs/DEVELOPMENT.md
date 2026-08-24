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

脚本会把参考区域 `x=194, y=108, 854×768` 的 alpha 设为透明。第三方美术素材不受 MIT License 授权，替换或再分发前请确认权利。

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
7. GitHub Actions 在 Windows runner 构建 NSIS 与 ZIP，并附加到 GitHub Release。

Release 产物目前未使用商业代码签名证书，应发布 SHA-256 供用户核对。

## 代码约定

- TypeScript strict mode。
- 主进程内部 ESM；Electron preload 保持 `.cjs`。
- 文件修改保持最小范围，不提交生成目录。
- 网络命令必须保持只读白名单。
- 新增外部监听、遥测、上传或写内存能力必须先进行安全评审并明确告知用户。
