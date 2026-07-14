# BugIt 入门指南

BugIt 可在 VS Code 内将粗略的测试记录转化为经过审阅的缺陷报告。搭配 VS Code 与 GitHub Copilot 的 Windows 11 是通过发布验证的客户端环境。

## 开始之前

- 安装最新版 VS Code，并登录 GitHub Copilot。
- 安装一个通过发布验证的 Python 3.10 至 3.13 解释器。
- 从你的账户仪表板下载 BugIt，并将其解压到本地文件夹。
- 请勿将许可密钥、令牌、客户数据及私有源代码置于聊天或配置文件中。

## 激活与配置

- 将解压后的 BugIt 文件夹作为受信任的 VS Code 工作区打开。
- 在 Copilot Chat 中选择 BugIt QA Agent，并输入 `Activate`。
- 仅在带掩码的终端提示中输入许可密钥。
- 输入 `Begin setup`，并仅选择你的团队实际使用的集成。
- 在创建工单之前，让 BugIt 完成对所选服务和项目的验证。

## 连接状态

- Jira Cloud 与 Confluence Cloud 采用引导式的 Atlassian Rovo MCP 路径，需要浏览器身份验证以及实时能力检查。
- Azure DevOps 采用 Microsoft 面向组织范围的远程 MCP 公开预览，需要实时验证。
- Sentry、GitHub、Linear 与 Notion 在其服务前置条件与实时检查通过之前，均属实验性功能。
- 其他所列服务需要由组织自行提供的兼容 MCP 服务器。BugIt 提供设置指导，但不随附也不测试这些服务器。

## 你的第一份报告

- 用平实的语言描述问题，包括发生的位置及出现的频率。
- 回答为使复现步骤完整所需的任何问题。
- 审阅预览内容，尤其是私有数据、严重程度、项目及附件。
- 仅在目标位置与最终工单均正确无误时才予以确认。

## 获取帮助

请先在 BugIt 代理中运行 `Check status` 或 `Check readiness`。如果问题仍未解决，请从你的 BugIt 账户仪表板提交支持工单，切勿在其中包含任何机密信息或涉密项目材料。
