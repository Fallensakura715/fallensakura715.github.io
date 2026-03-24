---
title: Claude Code 使用方法
date: 2026-03-16 10:13:25
tags:
  - AI
  - ClaudeCode
  - "#VibeCoding"
categories:
  - 技术
cover: https://imgu.falnsakura.top/PicGo/2026/03/dd464067755603ecde25fa3b6d49fb94.png
---
关于 Claude Code， [官方文档](https://code.claude.com/docs/en/overview) 里写得非常详细，请去阅读 [官方文档](https://code.claude.com/docs/en/overview)。

大多数开发者接触 AI 编码工具，通常还是这几种用法：在聊天窗口里问报错、在编辑器里让它补全几行代码，或者把一段代码贴进去让它解释一下。

AI编程目前可以简单的说，有三个阶段：

- **网页对话**，最早是 ChatGPT 引领全球，将需求或已有代码片段发给gpt，由gpt生成代码后，手动复制粘贴到自己的工程，手动编译调试；
- **插件工具**，有很多工具出来，但最早效果不太理想，直到 cursor 出道，瞬间爆发，代码自动补全非常好用，AI自动识别工程并理解，然后直接修改本地代码，无需用户手动复制粘贴；
- **Agent托管**，在当下 Claude Code、Codex 直接出世，开创全托管编程模式，AI不仅可以编码提交，更能自动测试，产物发布，且配合自定义skill、mcp等，可谓是无所不能（近期出现的龙虾openclaw能做的，它基本上都能），但是否是 VibeCoding 终局，可以拭目以待。

~~其实也可以在龙虾里指挥它用 Claude Code~~
## Claude Code 介绍

Claude Code 是一个代理编码工具，可以读取你的代码库、编辑文件、运行命令，并与你的开发工具集成。可在终端、IDE、桌面应用和浏览器中使用。

Anthropic 在官方文档里把它叫做 [agentic coding tool](https://code.claude.com/docs/en/overview)。它不只是回答问题的 LLM 客户端，你在项目目录里给出需求，它能拿着你的**整个代码仓库**去完成这件事，而且是**规划开发测试一条龙**，有完整的工作流。

无论是 Claude Code 还是 Codex 都支持四种方式：终端CLI、桌面端、插件版、网页版，这里面大家普遍使用最多的是终端 CLI 的方式，毕竟全托管才是未来趋势。

- **终端版**：运行在本地，具有完整功能，无界面消耗，纯命令行操作，可多开并发；
- **桌面端**：与终端版本功能几乎一致，但额外增加了界面的资源损耗（无论是cpu还是内存资源，都是有额外的负担），在多开并发场景下对电脑性能要求更高，但优势在于有界面显示（实际作用不是很明显）；
- **插件版**：嵌入到其他工具(JetBrains、VSCode、Cursor等)，优势在于仍保留现有开发习惯，增加 ClaudeCode 的功能，但注意一旦保留此习惯，那就是势必会削弱AI的存在感，增加人工干预。对于 VibeCoding 来说，这其实是个负担，没有真正的 Agent 托管；
- **网页版**：运行在云端，劣势是无法操作你当前电脑环境，比如修改你本机代码就做不了，但优势在于，可任意设备操作，比如说你的代码本身就是外网可访问（Github仓库），那么你手机可以随时随地的指挥AI干活，完成后自动提交到github。网页版可做任务规划（Plan mode），规划好后，再拉到本地进行实操（会话可以同步到本地）；

与其拿模型能力和其他 AI 工具比，其实差别在它们各自的工作方式。

| 形态                                   | 常见入口      | 更擅长的事                       | 开发者主要负责什么     |     |
| ------------------------------------ | --------- | --------------------------- | ------------- | --- |
| 聊天式 AI                               | 浏览器 / 对话框 | 解释问题、给思路、生成示例               | 自己把方案落到项目里    |     |
| AI IDE (Cursor、Antigravity)          | 编辑器       | 补全、局部修改、边写边问，也能跑小任务         | 在编辑器里组织上下文和修改 |     |
| Claude Code / Codex CLI 这类 CLI agent | 终端 / 项目目录 | 读仓库、改多文件、跑命令、验证结果，自动完成一整个需求 | 描述目标、约束和验收标准  |     |

当然，边界也没有这么绝对。AI IDE 这两年也在往 agent 方向更新(比如 Antigravity 也能 VibeCoding，但是效果没有 Claude Code 和 Codex 那么好)，Claude Code 也不只待在 CLI 里。

但实际用下来，区别很明显。如果你只是补一行代码、改个变量名、顺手问一句为什么报错，编辑器里的 AI 已经够用了。一旦任务变成"搞清楚这个模块在干嘛"、"完成一个需求，开发功能"、"跑一遍测试看有没有挂"，Claude Code 这种工具就非常好用。

它做的事情更接近帮你完成一个仓库层面的需求，而不是只回答一个代码片段的问题。

其次 Claude Code 并不是只用于写代码，它也可以做其他事情，可以**自动化操作浏览器**，可以协助**写文档**，**总结文档**等。

## Quickstart

### 环境准备

#### 安装 Git

```bash
# windowx
winget install --id Git.Git -e --source winget

# macos
xcode-select --install

# Linux
sudo apt install git
sudo dnf install git-all
```

验证

```bash
git --version
```

#### 安装 Node.js

很多安装命令以及环境运行都依赖nodejs，属于必须安装的系统依赖。官网下载链接：[https://nodejs.org/zh-cn/download](https://nodejs.org/zh-cn/download)

```bash
node -v # 验证 Node.js 版本
npm -v # 验证 npm 版本
npx -v # 验证 npx 版本
```

#### 安装 Python

不是必装。

由于 AI 许多技能都是使用py语言编写，所以想要AI有强大的能力，就必须得安装py运行环境。下载地址：[https://www.python.org/downloads/](https://www.python.org/downloads/windows/)

验证：

```bash
py --version
```

#### 安装 Claude Code

安装这件事本身不复杂，官方 [Quickstart](https://code.claude.com/docs/en/quickstart) 已经写得比较完整了。

Windows：

```powershell
irm https://claude.ai/install.ps1 | iex
# 或者
winget install Anthropic.ClaudeCode
```

macOS / Linux ：

```bash
curl -fsSL https://claude.ai/install.sh | bash
# 或
brew install --cask claude-code
```

或者使用 npm 安装 (官方文档没有，但是能用)：

```shell
npm install -g @anthropic-ai/claude-code
```

装好以后，最常见的几种用法大概是这样：

```bash
# 在当前项目里启动交互式会话
claude
```

Claude Code 命令列表：[https://code.claude.com/docs/zh-CN/cli-reference](https://code.claude.com/docs/zh-CN/cli-reference)
[https://code.claude.com/docs/zh-CN/interactive-mode](https://code.claude.com/docs/zh-CN/interactive-mode)

免费用户由于模型能力较弱，且额度极低，无法达到很好的效果，可按照后续章节提到的方式接其他模型 ~~(这何尝不是一种NTR)~~ 。另外中转站等自定义API则不支持云端执行，只能本地使用，付费用户登录可以云端使用，多端同步。

#### 顺便放一下 Codex 安装

Codex 现在可以免费蹬 gpt-5.4 系列模型，~~后面也会提到怎么薅羊毛~~

```bash
npm i -g @openai/codex  #安装codex

#进入codex开始使用，确认当前工作文件夹以及登陆，然后开始对话即可
codex 
```

#### 安装 CC Switch

这个工具不是必装，只不过给配置 ClaudeCode 弄了个图形界面而已。

项目地址[https://github.com/farion1231/cc-switch/releases/tag/v3.12.2](https://github.com/farion1231/cc-switch/releases/tag/v3.12.2)

#### 安装 ccline

这是个 cc 状态栏插件，也不是必装。
但是推荐装上，可以看模型和实时上下文token、当前的 git 分支，cc 工作时间等。

项目地址[https://github.com/Haleclipse/CCometixLine](https://github.com/Haleclipse/CCometixLine)

图片下面那一行就是 ccline。

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/93ed8df91ad7807fbe5a7f27ec6f7e32.png)

## 使用方法

### 交互

- **自然对话**：通过claude进入后，可以直接输入自然语言跟AI交互，让AI干活（openclaw能干的，它都能）；
- **复制粘贴**：将外部的长文本粘贴到终端，为避免干扰交互，此时会显示“ [Pasted text #1 +14 lines]”，实际里面就是你所粘贴的文本，回车后会显示实际正文；
	![image.png](https://imgu.falnsakura.top/PicGo/2026/03/c1af4a00cb9db90a1db66c3816cf7ad5.png)
- **提供文件**：输入 @ 后，就会出来当前工作目录的文件列表，可以选择，也可以输入文件路径，可继续输入@选择多个文件；
- **提供图片**：复制图片文件后，粘贴进去，就会显示“[Image #2] (↑ to select)”，可粘贴多个图片，如果需要删除，则按“↑”键选择后按Del删除；
- **终端命令**：按"!"后，就是进行终端命令，此时继续输入终端命令即可执行（比如查看目录文件等等），claude不会介入；
- **管道输入**：将一些命令的结果直接给到claude，而无需执行后再复制进行交互。输入 “命令 | claude”，即把命令的结果直接传递给claude。比如让claude看当前文件的所有错误日志，可通过命令查出来再提供给claude，而无需让claude搜索全文，节省token。
### 多任务并发

虽然AI写代码比人工快了很多，但是执行任务时，因为网络问题，或者工作流比较复杂，AI可能会跑好几个小时完成一个任务。所以使用AI的时候，可以多开几个Claude Code 让他并发执行任务。

多跑几个 CLI 输入 claude 就行。

### 继续对话

可能不小心关了或者需要继续上次的任务，就需要继续对话。
输入 `/resume` 就行。

### 压缩上下文

让上下文更短，输入`/compact`。
Claude Code 也有内置的自动压缩，但是我习惯关掉，与其一直压缩上下文，不如把大需求拆成小需求一个一个做。

### 清理上下文

上下文过长会影响 AI 的性能，输入 `/clear` 清理上下文。

## Best practices

Claude Code 的 [Best practices](https://code.claude.com/docs/en/best-practices) 文档写的很详细。
#### 让 Claude Code 自动跑测试

能跑测试就跑测试，能看截图就看截图，能用命令输出校验就别只靠看起来没问题。这条几乎是整份 Best practices 里最重要的一条。

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/b5696a3dbb6f4ee26e94cd564cfca895.png)

#### 大任务先探索，再规划，最后编码

官方并不是说所有事都要先计划一遍；像改 typo、重命名变量这种小事，直接做就行。
但只要任务开始涉及多个文件，或者你自己也不确定该怎么下手，先让它读代码、做计划，返工一般会少很多。

按 `shift+tab` 开启Plan Mode。
开了 plan 会比不 plan 写的项目完整的多。

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/a851ffc73533c512a7afb0cdb4df2026.png)

先读代码，比如 `read /src/auth and understand how we handle sessions and login.`
再规划，比如 `I want to add Google OAuth. What files need to change? What's the session flow? Create a plan.`
最后实现，`implement the OAuth flow from your plan. write tests for the callback handler, run the test suite and fix any failures.`
提交代码 commit 或者提PR，`commit with a descriptive message and open a PR.`
#### prompt 里要给它具体上下文

光说修 bug还是太空了。更有效的方式是把症状、可能相关的目录、不能动的部分、参考文件或者测试要求一起说清楚。Claude Code 能自己找东西，但前提是你得先把问题范围画出来。

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/201fa475cc6a63ca2920dc9e74546738.png)

#### 管理上下文

官方文档对 context 讲得很直白：上下文一长，模型能力会下降。

所以不相关的任务别硬塞在一个会话里，必要时直接 `/clear`。长期稳定的规则放到 `CLAUDE.md` 里，像测试命令、代码风格、仓库约束这种，交给它记住会更省事。

#### 编写 CLAUDE.md

这就像是项目的全局 prompt，claude code 执行任务会先读这个文件。

可以输入 `/init` 初始化 `CLAUDE.md`。

另外，`CLAUDE.md` 也不是越长越好。
官方建议其实很克制：CLAUDE.md 文件没有必需的格式，但保持简短和易读。只写那些 Claude 靠读代码也推不出来、但又会反复影响结果的东西。再细一点、只在特定场景下才需要的知识，更适合放到 skills 或 hooks 里，而不是把一个文件越堆越长。

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/6c39355b488e3cee21708efee4ef8e4c.png)

#### 打断

Claude code 有时候会跑偏，在它跑偏的时候及时按 ESC 打断
## 进阶用法

### 接入 MCP

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/a4f3fcce69af06ea75eccaf38c1603bb.png)

### 接入 Skills

Claude Skills 是一套允许Claude模型通过包含指令、脚本和资源的模块化文件夹来提升特定任务执行能力的“外挂”系统。它采用“渐进式加载”技术，在需要时按需调用，减少了上下文Token占用，能实现复杂工作流自动化（如自动化代码审查、数据处理），显著提升企业或个人用户在专业领域的输出质量与效率。

skills 可以简单的理解成，在告诉AI于什么场景就做什么事情，让AI知道自己有什么额外的功能，怎么去使用这些功能，比如claude无法直接读取pdf文件，那么就可以安装一个pdf skill，这样ai就可以读取pdf文件了（其实自定义命令也是skills的一种）。

#### 制作自己的 Skills

手写md文件就行，也可以装 [claude code 插件](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 让它帮你创建skills。

[官方教程](https://code.claude.com/docs/zh-CN/skills)

目录和文件格式：

```
my-skill/
├── SKILL.md           # 主要说明（必需）
├── template.md        # Claude 要填写的模板
├── examples/
│   └── sample.md      # 显示预期格式的示例输出
└── scripts/
    └── validate.sh    # Claude 可以执行的脚本
```
### 自定义 Hooks

[官方教程](https://code.claude.com/docs/zh-CN/hooks-guide)

钩子的作用可以简单的理解成AOP切面操作或者说是绑定事件，当出现什么事情的时候，让AI执行指定任务。

比如说，当 ai 干完活后的通知，在控制台不明显，导致容易被忽略，那么就可以让ai增加系统通知，或者每次保存文件前执行格式化代码，再或者执行命令是对 rm-rf 进行拦截。开发网站功能完成后，让ai继续使用插件自行测试功能，让 ai 24小时马不停蹄的干，配合多任务执行，完美。

### SubAgents

[官方教程](https://code.claude.com/docs/zh-CN/sub-agents)

简单的说就是，给AI设定不同的角色，给与不同的上下文、约定、权限，让不同AI有不一样的预埋规则，各自注重点不同。

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/ec0859deed5a91bd048dee4bf7f747f6.png)


## ~~白嫖指南~~

很多团队需要用 Claude Code，需要接入企业 API，个人或者小团队使用直接跳到 **接入第三方API** 部分即可。

先说 provider 和部署方式。按照官方文档，Claude Code 不只支持直接使用 Anthropic 账号，也支持第三方API和通过 [Anthropic Console](https://console.anthropic.com/)、[Amazon Bedrock](https://code.claude.com/docs/en/amazon-bedrock)、[Google Vertex AI](https://code.claude.com/docs/en/google-vertex-ai) 和 [Microsoft Foundry](https://code.claude.com/docs/en/microsoft-foundry) 来接入。

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

如果是通过 Bedrock、Vertex 或 Foundry 接入，实际配置时通常还会配合对应 provider 的启用和认证变量一起使用。对个人来说，这部分未必用得上，但到了团队场景，它就不只是能不能连上，而是和权限、计费、网络策略一起考虑的事了。
### ~~白嫖部分~~ 接入自己的/第三方 Provider 

Claude Code 还支持接入自己的或者第三方(中转站) 的 API。
你可以接入任意兼容 Anthropic 接口的 API。

目前写代码能力第一梯队 ~~(版本T0)~~ 是`claude-opus-4-6`和`gpt-5.4`。

`gemini-3.1-pro-preview`属于 T1 级别。

`GLM-5`，`minimax-m2.7`，`composer-2` 之类的是 T2 往后了，其他模型看看就得了。

那怎么白嫖 T0模型 呢？
截至至2026/3/24，能用顶级模型最好的办法就是反代 Codex。

Codex 对免费 openai 账户提供了一点 gpt-5.4 和 gpt-5.3-codex 的额度，~~可以使用注册机注册几十上百个号，这样就可以爽用了~~。

GPT Team 也可以低价白嫖，需要域名邮箱，验证卡之类的，~~理论上零成本，但是奥特曼会时不时杀掉你的号，嘻嘻。~~

反代 Antigravity 使用 Claude Opus 4.6 会被封号，如果 Google 一天一封，~~你一天准备一个号进家庭组也是可以的~~。

具体反代API项目常用的有两个，按照项目文档使用即可，拿到 API 地址和 key 放到 claude code 配置文件就 ~~可以尽情白嫖啦~~。

推荐个人使用：[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)
推荐商业使用(中转站)：[Sub2api](https://github.com/Wei-Shaw/sub2api)

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

> 注意 HAIKU 模型一定要用快速小模型。

接入第三方中转站需要加以下四个配置，屏蔽掉claude code 发的无意义请求头。

```json
{
  "env": {
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0",
    "DISABLE_BUG_COMMAND": "1",
    "DISABLE_ERROR_REPORTING": "1",
    "DISABLE_TELEMETRY": "1"
  }
}
```

分享一下我的配置：

```json
{

  "env": {
    "ANTHROPIC_AUTH_TOKEN": "******",
    "ANTHROPIC_BASE_URL": "https://your.domain",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gpt-5.4-mini",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "gpt-5.4(xhigh)",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "gpt-5.4(xhigh)",
    "ANTHROPIC_REASONING_MODEL": "gpt-5.4(xhigh)",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0",
    "DISABLE_BUG_COMMAND": "1",
    "DISABLE_ERROR_REPORTING": "1",
    "DISABLE_TELEMETRY": "1"
  },
  "model": "opus[1m]",
  "effortLevel": "high",
  "autoUpdatesChannel": "latest"
}
```
## 插件系统

这件事真正有意思的地方不在“多了一个命令”，而在于 Claude Code 的工作边界开始从本地仓库往外扩。它不只是读代码，还能把设计稿、工单、错误监控、数据库信息一起拉进同一条任务链里。

插件则是另一个层面的扩展。Claude Code 的 [插件系统](https://code.claude.com/docs/en/plugins) 可以把 skills、agents、hooks、MCP server、LSP server 这些能力打包到一起，更适合团队共享，而不是每个人都零散配一遍。官方现在也有插件发现页和 marketplace，常见的管理入口是 `/plugin` 和 `/reload-plugins`。

以下插件输入 `/plugin` 就能找到，都在 Anthropic 官方 plugin market 里面

![image.png](https://imgu.falnsakura.top/PicGo/2026/03/6fb5bb789d61272b7453c214c2cc2e24.png)

#### frontend-design

这是 Anthropic 开发的用于打造具有独特设计的生产级前端的插件。可以生成精良的代码，避免千篇一律的AI美学，~~千篇一律的蓝紫色UI~~。让 Claude Code 写前端页面的时候这个 skill 自动开启。
#### superpowers

让 Claude Code 进行头脑风暴，也就是开发之前先进行规划，会问你很多问题确定开发的方向，也会制定开发的规范：测试必须在实现之前失败、要求在进行任何修复之前进行根本原因调查、在开始编码之前完善需求。

做大项目推荐使用，这个插件的Skills定义了完整的工作流：需求分析，和你对话确认需求，subagent 创建分支写代码，冒烟测试，commit 提 PR或者合并回主分支。

~~只不过做任务出奇的慢，烧Token也是出奇的多。~~
#### context7

这是 Upstash 开发的用于实时文档查找的 MCP Server，可以将特定版本的文档和代码示例从源代码库提取到 LLM 环境中。

在开发对接第三方API查文档非常好用，防止AI用已经过时的信息或者乱写。

只需在需要查看最新文档的任何提示中添加“use context7”即可。例如：“创建一个 Next.js 中间件，用于检查 cookie 中是否存在有效的 JWT。use context7”或“配置一个 Cloudflare Worker 脚本来缓存 JSON API 响应。use context7”。还可以使用“use library /supabase/supabase for API and docs”来指定具体的库。
#### playwright

用于AI控制你的浏览器，进行浏览器自动化，比如说测试网页界面，自动协助操作等等，让claude执行命令自动安装。
#### claude-md-management

这个插件是让 Claude Code 扫描代码库中所有 CLAUDE.md 文件，并根据质量标准（命令、架构、注意事项、简洁性）对其进行评估，然后生成包含分数和等级的详细质量报告。之后，它会根据发现的不足之处提出有针对性的改进建议。

说出“审核我的 CLAUDE.md 文件”或“检查我的 CLAUDE.md 文件是否为最新版本”即可触发审核功能。`/revise-claude-md`在完成一次高效的工作后运行此功能，可以获取新的见解。插件会将建议的更改以差异的形式显示，并且只有在批准后才会应用这些更改。 

## 最后

所以如果只是把 Claude Code 理解成另一个聊天窗口或者AI IDE，其实有点低估它。它更像是一个能进项目、能调用工具、也能自我验证的编码 Agent。

使用 Claude Code 并不复杂，你只要会安装、启动、对话即可，其余都是进阶功能，适合定制自己的工作流和开发环境。

后续用熟 Claude Code 之后，就会尝试提效，提高代码生成质量，优化自动化流程，这时候就是捣鼓 Skills，Hooks这类功能的时候。

~~Token就是生产力，这也是你担心获取大量Token的时候。~~

However, Claude Code当然不是所有场景都比 AI IDE 更顺。局部补全、短平快的小修改，编辑器里的体验还是更自然。但一旦任务开始跨文件、跨命令、还需要验收，Claude Code 和普通聊天式 AI 的差别就会很明显。

Claude Code 真正有意思的地方，不只是会不会写代码，而是让 AI 从回答代码问题这件事，往参与工程流程更靠近了一步，~~初级程序员距离失业也靠近了一大步。~~

## 相关链接

[https://code.claude.com/docs/zh-CN/cli-reference](https://code.claude.com/docs/zh-CN/cli-reference)
[https://developers.openai.com/codex/cli/slash-commands](https://developers.openai.com/codex/cli/slash-commands)
[https://baijiahao.baidu.com/s?id=1856714956350110572&wfr=spider&for=pc](https://baijiahao.baidu.com/s?id=1856714956350110572&wfr=spider&for=pc)
[https://zhuanlan.zhihu.com/p/1991321870100878958](https://zhuanlan.zhihu.com/p/1991321870100878958)
https://linux.do/t/topic/1798141
[https://www.runoob.com/claude-code/skill-creator-usage.html](https://www.runoob.com/claude-code/skill-creator-usage.html)