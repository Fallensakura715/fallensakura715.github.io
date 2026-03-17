---
title: Claude Code：工作方式、优势与使用方法
date: 2026-03-16 10:13:25
tags:
  - AI
  - ClaudeCode
categories:
  - 技术
cover: https://imgu.falnsakura.top/PicGo/2026/03/dd464067755603ecde25fa3b6d49fb94.png
---
大多数开发者接触 AI 编码工具，通常还是这几种用法：在聊天窗口里问报错、在编辑器里让它补全几行代码，或者把一段代码贴进去让它解释一下。

Claude Code 给我的感觉不太一样。第一次真正把它放进项目里用，比较明显的差别不是“回答得更像人”，而是它会直接围绕仓库做事：读文件、找代码、改多个文件、跑命令、看结果，再把过程整理回来。

Anthropic 在官方文档里把它叫做 [agentic coding tool](https://code.claude.com/docs/en/overview)。这个说法听起来有点官方，换成更直白的话，大概就是：它不只是回答问题，而是能在项目环境里执行编码任务。

虽然 Claude Code 现在也有 [VS Code](https://code.claude.com/docs/en/vs-code)、JetBrains、Cursor、桌面端和 Web 这些入口，但我还是更愿意把它理解成一个从项目目录出发的 agent 工具。只要任务开始涉及真实仓库、命令行和验证结果，它和普通聊天式 AI 的区别就会慢慢显出来。

## Claude Code 和聊天式 AI、AI IDE 的差别

我现在更倾向把它们按“默认工作方式”来理解，而不是单纯按模型强弱来分。

| 形态                                   | 常见入口      | 更擅长的事             | 开发者主要负责什么     |
| ------------------------------------ | --------- | ----------------- | ------------- |
| 聊天式 AI                               | 浏览器 / 对话框 | 解释问题、给思路、生成示例     | 自己把方案落到项目里    |
| AI IDE (Cursor、Antigravity)          | 编辑器       | 补全、局部修改、边写边问      | 在编辑器里组织上下文和修改 |
| Claude Code / Codex CLI 这类 CLI agent | 终端 / 项目目录 | 读仓库、改多文件、跑命令、验证结果 | 描述目标、约束和验收标准  |

当然，边界也没有这么绝对。AI IDE 这两年也在往 agent 方向走，Claude Code 本身也不只待在终端里。

如果你只是想补一行代码、改个变量名、顺手问一句“这里为什么报错”，编辑器内的 AI 工具通常已经很顺手了。可一旦任务变成“读懂这个模块”“把修改落到几个文件里”“跑测试再告诉我结果”，Claude Code 这种工具的感觉就会更明显一些。

它更像是在帮你完成一个仓库任务，而不只是回答一个局部问题。

## Claude Code 的优势

### 它更容易站在项目上下文里工作

这一点其实最容易在真实项目里体现出来。

官方文档对 Claude Code 的描述很直接：它可以读取代码库、编辑文件、运行命令，并和开发工具集成。也就是说，它看到的上下文不只是当前光标附近那几行代码，还包括目录结构、脚本、Git 状态，甚至你放在 `CLAUDE.md` 里的项目规则。

这会带来一个很实际的区别：同样是“修个 bug”，任务不再只是“猜哪一行有问题”，而是可以变成“先定位问题，再改相关文件，然后验证有没有真的修好”。

### 它不只给建议，也能把建议推进成动作

很多聊天式 AI 的强项还是“解释”和“给方案”。这当然有用，但真正花时间的往往不是想法本身，而是把想法落实到仓库结构、已有代码和本地环境里。

它可以自己去搜相关文件、读实现、修改代码、调用 shell、执行测试或者构建命令，再根据结果继续调整。官方在 [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) 里把这个过程概括成三件事：gather context、take action、verify results。

所以它和普通聊天窗口最大的差别，不是“更会说”，而是“更像真的在做事”。

### 它更适合需要验证的任务

Anthropic 在 [Best practices](https://code.claude.com/docs/en/best-practices) 里有一句我觉得很关键：**当 Claude 能够验证自己的工作时，例如运行测试、比较屏幕截图和验证输出，它的表现会显著提高。**

如果你只是问一个抽象问题，所有 AI 工具差别未必特别大；但如果任务可以用测试、截图、构建结果、命令输出去验收，Claude Code 的表现通常会稳很多。因为它不是只给出一个“看起来合理”的答案，而是可以顺着验证链继续往下走。

这也是为什么它特别适合下面这些事：

- 需要跨多个文件改动的任务
- 能跑测试或构建来验收的任务
- 先探索代码再动手的大一点的修改
- 需要和 Git、脚本、外部工具一起配合的工作

反过来说，如果只是高频的小补全、小修小改，AI IDE 依然很有优势。Claude Code 的价值更多体现在“工程任务”上，而不是替代一切编辑器内体验。

## Claude Code 快速开始

安装这件事本身不复杂，官方 [Quickstart](https://code.claude.com/docs/en/quickstart) 已经写得比较完整了。Windows 下可以直接用：

```powershell
winget install Anthropic.ClaudeCode
# 或者
irm https://claude.ai/install.ps1 | iex
```

装好以后，最常见的几种用法大概是这样：

```bash
# 在当前项目里启动交互式会话
claude

# 带着一个任务启动
claude "write tests for the auth module, run them, and fix any failures"

# 一次性提问，输出完就退出
claude -p "Explain what this project does"
claude -p "List all API endpoints" --output-format json

# 继续当前目录下最近一次会话
claude -c

# 打开会话选择器，或按名称 / ID 续接
claude -r
claude -r auth-refactor

# 在独立 git worktree 里开始一项任务
claude -w feature-auth
```

命令本身不难，真正影响结果的往往还是任务描述方式。

和普通聊天式 AI 比起来，Claude Code 更吃“真实上下文 + 明确边界 + 可验证结果”这三样东西。比如一句“帮我优化一下”其实很难稳定，因为它不知道你想优化什么，也不知道什么叫优化完成。

更有效的说法通常会像这样：

```text
给 auth 模块补测试，先看 src/auth 和现有测试目录；
只跑相关测试，不要动接口层；
如果有失败，修到测试通过后再总结改了什么。
```

或者再具体一点：

```text
先读这个项目里和登录相关的代码；
告诉我登录流程经过了哪些文件；
然后给出修改计划，确认后再动手。
```

官方文档里反复强调的其实也是这些意思：任务尽量具体，最好给出约束，最好还能告诉它怎么验证结果。

## Best practices 里，我觉得最值得记住的几件事

Claude Code 的 [Best practices](https://code.claude.com/docs/en/best-practices) 很长，但如果只是写在脑子里常备，我觉得下面几条已经很够用了。

**尽量让它能自证结果。**
能跑测试就跑测试，能看截图就看截图，能用命令输出校验就别只靠“看起来没问题”。这条几乎是整份 Best practices 里最重要的一条。

**大任务先 explore，再 plan，再 implementation。**
官方并不是说所有事都要先计划一遍；像改 typo、重命名变量这种小事，直接做就行。
但只要任务开始涉及多个文件，或者你自己也不确定该怎么下手，先让它读代码、做计划，返工一般会少很多。

**prompt 里要给它具体上下文。**
光说“修登录 bug”还是太空了。更有效的方式是把症状、可能相关的目录、不能动的部分、参考文件或者测试要求一起说清楚。Claude Code 能自己找东西，但前提是你得先把问题范围画出来。

**管理上下文，不能一锅炖。**
官方文档对 context 这件事讲得很直白：上下文一长，效果会慢慢掉。
所以不相关的任务别硬塞在一个会话里，必要时直接 `/clear`。长期稳定的规则放到 `CLAUDE.md` 里，像测试命令、代码风格、仓库约束这种，交给它记住会更省事。

另外，`CLAUDE.md` 也不是越长越好。官方建议其实很克制：只写那些 Claude 靠读代码也推不出来、但又会反复影响结果的东西。再细一点、只在特定场景下才需要的知识，更适合放到 skills 或 hooks 里，而不是把一个文件越堆越长。

## Provider、MCP 和插件

很多入门文章会把注意力都放在“它会不会写代码”上，但如果你真的准备把 Claude Code 用到团队流程里，后面这几块反而会越来越重要。

先说 provider 和部署方式。按照官方文档，Claude Code 不只支持直接使用 Anthropic 账号，也支持通过 [Anthropic Console](https://console.anthropic.com/)、[Amazon Bedrock](https://code.claude.com/docs/en/amazon-bedrock)、[Google Vertex AI](https://code.claude.com/docs/en/google-vertex-ai) 和 [Microsoft Foundry](https://code.claude.com/docs/en/microsoft-foundry) 来接入。

对个人用户来说，直接登录官方账号通常最省事；到了公司环境，网络代理、统一鉴权、成本统计这些问题就会浮出来，这时往往会用到企业代理或者 LLM gateway。

官方文档里能看到的相关环境变量，常见的像这些：

```bash
HTTP_PROXY
HTTPS_PROXY
ANTHROPIC_BASE_URL
ANTHROPIC_BEDROCK_BASE_URL
ANTHROPIC_VERTEX_BASE_URL
ANTHROPIC_FOUNDRY_BASE_URL
```

如果是通过 Bedrock、Vertex 或 Foundry 接入，实际配置时通常还会配合对应 provider 的启用和认证变量一起使用。对个人来说，这部分未必用得上；但到了团队场景，它就不只是“能不能连上”，而是和权限、计费、网络策略一起考虑的事了。

### 接入自己的/第三方 Provider

Claude Code 还支持接入自己的或者第三方(中转站) 的 API。
你可以接入任意兼容 Anthropic 接口的 API。
以 Windows 为例，进入`C:\Users\你的用户名\.claude\settings.json`

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "你的中转站URL",
    "ANTHROPIC_AUTH_TOKEN": "你的中转站APIKEY",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "模型名",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "模型名",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "模型名"
  }, 
  "effortLevel": "high"
}
```

甚至可以使用 Codex 反代出来的 gpt-5.4 1M 长上下文。

### 插件系统

这件事真正有意思的地方不在“多了一个命令”，而在于 Claude Code 的工作边界开始从本地仓库往外扩。它不只是读代码，还能把设计稿、工单、错误监控、数据库信息一起拉进同一条任务链里。

插件则是另一个层面的扩展。Claude Code 的 [插件系统](https://code.claude.com/docs/en/plugins) 可以把 skills、agents、hooks、MCP server、LSP server 这些能力打包到一起，更适合团队共享，而不是每个人都零散配一遍。官方现在也有插件发现页和 marketplace，常见的管理入口是 `/plugin` 和 `/reload-plugins`。

#### frontend-design

这是 Anthropic 开发的用于打造具有独特设计的生产级前端的插件。可以生成精良的代码，避免千篇一律的AI美学。让 Claude Code 写前端页面的时候这个 skill 自动开启。
#### superpowers

让 Claude Code 进行头脑风暴，也就是开发之前先进行规划，会问你很多问题确定开发的方向，也会制定开发的规范：测试必须在实现之前失败、要求在进行任何修复之前进行根本原因调查、在开始编码之前完善需求。
#### context7

这是 Upstash 开发的用于实时文档查找的 MCP Server，可以将特定版本的文档和代码示例从源代码库提取到 LLM 环境中。

只需在需要查看最新文档的任何提示中添加“use context7”即可。例如：“创建一个 Next.js 中间件，用于检查 cookie 中是否存在有效的 JWT。use context7”或“配置一个 Cloudflare Worker 脚本来缓存 JSON API 响应。use context7”。还可以使用“use library /supabase/supabase for API and docs”来指定具体的库。
#### claude-md-management

这个插件是让 Claude Code 扫描代码库中所有 CLAUDE.md 文件，并根据质量标准（命令、架构、注意事项、简洁性）对其进行评估，然后生成包含分数和等级的详细质量报告。之后，它会根据发现的不足之处提出有针对性的改进建议。

说出“审核我的 CLAUDE.md 文件”或“检查我的 CLAUDE.md 文件是否为最新版本”即可触发审核功能。`/revise-claude-md`在完成一次高效的工作后运行此功能，可以获取新的见解。插件会将建议的更改以差异的形式显示，并且只有在批准后才会应用这些更改。

### MCP

官方把它描述成一个连接外部工具和数据源的开放标准。放到 Claude Code 里，它的作用很直观：让 Claude Code 不只看本地仓库，也能在授权范围内接 Jira、Notion、GitHub、数据库、监控系统这些外部上下文。

目前文档里更推荐的是远程 HTTP 方式，SSE 还支持但已经标了 deprecated，本地也可以走 stdio。比如最简单的写法就是：

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp list
```

## 最后

所以如果只是把 Claude Code 理解成“另一个聊天窗口”，其实会有点低估它。它更像是一个能进项目、能调用工具、也能自我验证的编码 Agent。

它当然不是所有场景都比 AI IDE 更顺。局部补全、短平快的小修改，编辑器里的体验还是更自然。但一旦任务开始跨文件、跨命令、还需要验收，Claude Code 和普通聊天式 AI 的差别就会很明显。

Claude Code 真正有意思的地方，不只是会不会写代码，而是让 AI 从回答代码问题这件事，往参与工程流程更靠近了一步。