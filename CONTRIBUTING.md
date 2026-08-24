# Contributing

感谢你帮助改进 Crystal Live Panel。

## 提交 Issue

请先搜索现有 Issue。错误报告建议包含：

- 应用、Windows、RetroArch 与核心版本；
- ROM CRC32（不要上传 ROM）；
- 完整诊断码与 `GET_STATUS` 原始回包；
- 可重复步骤、预期行为和实际行为；
- 已移除个人信息的截图。

请勿提交 ROM、存档、BIOS、提取的精灵素材或无权再分发的文件。

安全漏洞不要公开提交 Issue，请按 [SECURITY.md](SECURITY.md) 报告。

## Pull Request

1. Fork 仓库并从最新 `main` 创建分支。
2. 使用 Node.js 22 和 `npm ci`。
3. 为行为变化添加或更新测试。
4. 运行 `npm test` 和 `npm run build`。
5. 保持只读网络命令、安全边界与隐私承诺。
6. 更新相关用户和开发文档。

涉及新 ROM 版本时必须使用独立 Profile、精确哈希、地址来源说明和真实核心验收记录。不要把 ROM 内容或从 ROM 提取的素材加入测试 fixture。

提交贡献即表示你有权提交相关内容，并同意按项目的 MIT License 提供该贡献。第三方素材不因进入 Pull Request 自动获得 MIT 授权。
