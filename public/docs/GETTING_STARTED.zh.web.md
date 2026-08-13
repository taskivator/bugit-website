# BugIt 入门指南

> **翻译说明。** 本文档由机器翻译生成，未经母语者审校。以英文版本为准：如有出入，以英文文本为准。如需最准确、最新的表述，请参阅英文文档。

BugIt 可在 VS Code 内将粗略的测试记录转化为经过审阅的缺陷报告。搭配 VS Code 与 GitHub Copilot 的 Windows 11 是通过发布验证的客户端环境。

## 开始之前

- 安装最新版 VS Code，并登录 GitHub Copilot。
- 安装一个通过发布验证的 Python 3.10 至 3.13 解释器。
- 从你的账户仪表板下载 BugIt，并将其解压到本地文件夹。
- 请勿将令牌、客户数据及私有源代码置于聊天或配置文件中。

## 激活与配置

- 将解压后的 BugIt 文件夹作为受信任的 VS Code 工作区打开。
- 在 Copilot Chat 中选择 BugIt QA Agent，并输入 `Activate`（如果你的账户同时拥有两者，可加上 `--solo` 或 `--team`）。
- BugIt 会在浏览器中打开 BugIt 门户。使用你自己的 BugIt 账户登录：密码只保留在浏览器中，绝不会在 VS Code 中输入。
- 为这台机器选择 Solo 或 Team 权益，然后查看并批准此设备。
- 返回 VS Code。BugIt 会自动完成授权：没有任何许可密钥需要复制、粘贴或显示。
- 输入 `Begin setup`，并仅选择你的团队实际使用的集成。
- 连接你的缺陷跟踪系统（只需一次）：`python tools/connect.py jira`（也支持 `ado`、`github`、`gitlab`、`linear`、`clickup`、`asana`、`trello`、`shortcut`、`youtrack`、`bugzilla`）。令牌在你自己的账户中创建，粘贴到本地的掩码输入框；它保存在操作系统的凭据存储中，不会写入文件。
- 在创建工单之前，让 BugIt 完成对所选服务和项目的验证。

## 管理你的访问

- 一次安装每次只使用一个有效权益。若要将这台机器切换到另一个 Solo 或 Team 权益，请输入 `Switch license` 并在浏览器中再次批准；如果取消，则保留你当前的权益。
- `Deactivate` 仅从这台机器移除权益。席位、设备、成员资格、角色和账单都在门户中管理，而不是在 VS Code 中。
- Team 访问按人分配：每位成员都用自己的 BugIt 账户和有效成员资格登录。没有共享密钥，也没有共享登录。
- 在一次成功的联网校验之后，BugIt 在 Solo 和 Team 下都可继续离线工作最多 72 小时，并在重新联网后立即应用门户的最新状态。
- 更新由你签名的权益授权，因此下载新版本时绝不会要求提供密钥。

## 连接状态

- BugIt 会向十一个跟踪系统提交，各自通过其 REST API，并使用你在自己账户中创建的凭据：Jira Cloud、Azure DevOps、GitHub Issues、GitLab Issues、Bugzilla、YouTrack、Linear、Shortcut、ClickUp、Asana 和 Trello。设置会在你依赖它之前先验证连接。
- Confluence Cloud 作为知识来源，通过引导式的 Atlassian Rovo MCP 路径连接（浏览器登录）。Sentry 和 Notion 在其前置条件与实时检查通过之前仍为实验性。
- 其他列出的服务需要由所在组织提供的兼容 MCP 服务器。BugIt 提供配置指引，但不附带也不测试这些服务器。

## 你的第一份报告

- 用平实的语言描述问题，包括发生的位置及出现的频率。
- 回答为使复现步骤完整所需的任何问题。
- 审阅预览内容，尤其是私有数据、严重程度、项目及附件。
- 在你回复且仅回复 `FILE IT` 之前，不会有任何内容进入你的缺陷跟踪系统。「好」或「可以」不算确认。

## 获取帮助

请先在 BugIt 代理中运行 `Check status` 或 `Check readiness`。如果问题仍未解决，请从你的 BugIt 账户仪表板提交支持工单，切勿在其中包含任何机密信息或涉密项目材料。 支持仅以英语提供。
