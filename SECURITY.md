# Security Policy

## Supported versions

安全修复只保证应用于最新 GitHub Release。请先在最新版复现问题。

## Reporting a vulnerability

请使用 GitHub 仓库的 **Security → Report a vulnerability** 私下提交安全报告。不要公开创建包含利用细节、ROM 路径、存档内容或本机信息的 Issue。

报告建议包含：

- 受影响版本；
- 影响与攻击前提；
- 最小复现步骤；
- 建议修复方案（如有）。

维护者确认前请不要公开漏洞细节。

## Security model

- HTTP、WebSocket 和 UDP 目标均限制在本机 loopback。
- RetroArch 命令只允许只读白名单。
- Renderer 使用 context isolation，不能直接访问 Node.js。
- ROM 在本地读取，不上传、不复制进发行包。
- 应用没有自动更新器、遥测或远程账号系统。

本项目不试图保护用户免受已经能在本机执行代码的恶意程序，也不为用户自行修改后加入的公网监听、写内存命令或第三方插件提供安全保证。
