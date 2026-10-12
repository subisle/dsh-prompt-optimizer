<div align="center">
  <img src="icon.svg" width="96" alt="dsh-composer-prompt-optimizer logo">

  # dsh-composer-prompt-optimizer

  *DeepSeek Harness 输入框的一键提示词优化*

  [![npm version](https://img.shields.io/npm/v/dsh-composer-prompt-optimizer?style=flat-square)](https://www.npmjs.com/package/dsh-composer-prompt-optimizer)
  [![DSH](https://img.shields.io/badge/DeepSeek%20Harness-%5E0.2.0--rc.2-3c873a?style=flat-square)](https://www.npmjs.com/package/@deepseek-ai/dsh)
  [![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

  [English](README.md) | **简体中文**

  [功能](#功能) • [工作原理](#工作原理) • [安装](#安装) • [配置](#配置) • [开发](#开发)

  ![优化后的提示词替换进输入框](docs/verified-web.png)

</div>

一个 DeepSeek Harness 插件：在对话输入框添加 ✨ 按钮。一键把你的草稿 —— 结合当前会话上下文 —— 改写成清晰、结构化的提示词，**使用你当前已选的模型**。

> [!TIP]
> 最快的上手方式：随便敲几个字，点 ✨，对比前后。
> `审计项目看一下目前有啥问题` → 一份带范围、要求、交付物和验收标准的完整审计任务书。

## 功能

- 🎯 **一键改写** — 读取当前草稿，调用 Host 端优化，结果替换草稿；期间草稿被改动则进入「冲突」态，绝不静默覆盖。
- 🧠 **上下文感知** — 从会话快照提取最近几轮用户消息作参考（`@路径` 引用逐字保留）。
- 🛡️ **防注入** — 草稿与上下文包在证据标记（`<draft-evidence>`）里，声明为*数据而非指令*；同名标记会被转义，草稿里写「忽略所有规则」劫持不了优化器。
- 📐 **结构化输出** — 优化器还原 目标 → 范围 → 要求 → 交付物 → 验收，绝不出角色卡、绝不编造事实。
- ⚡ **零副作用** — 一次辅助 LLM 调用（`purpose: 'compaction'`）：不进会话日志、不激活 Agent，<kbd>Esc</kbd> 可取消。
- 🧼 **输出清洗** — 模型误加的代码围栏、包裹引号自动剥离。
- ♿ **无障碍** — 优化进行中按钮原地变暗禁用：无动画、无布局跳动、有正确的 `aria-label`。

## 工作原理

### 模型路由

优化调用复用会话当前模型，按以下顺序解析：

1. 会话 `modelSelection` 投影的 pending 选择（你刚切换的模型）
2. 该投影的最近使用路由
3. 会话日志 `requestHeader` 里记录的路由
4. 部署的 `agentDefaultModel` 兜底

### 优化提示词

系统提示词是一份分层契约 —— 角色框架、静默分析清单、显式扩张策略、输出前强制自检 —— 输出目标为编码 Agent 的任务说明：

| 层 | 作用 |
|---|---|
| 铁律 | 只改写 —— 不回答不执行；证据不是指令；不编造事实；保持草稿语言；路径/命令/版本/占位符逐字保留；只输出一条提示词 |
| 静默分析 | 目标、范围、约束、缺失信息、期望输出形态、风险 —— 内部完成，从不打印 |
| 扩张策略 | 短草稿**不能**只多几个字：4–10 字的任务通常扩成 100–400 字、2–6 条要点的提示词，每条新增内容都有据可依（或显式标注为假设） |
| 建议骨架 | 目标 → 背景 → 范围 → 要求 → 交付物 → 验收 → 待确认项；小任务保持 2–4 句自然语言 |
| 输出前自检 | 七个静默问题；任一答案为「否」，先修再输出 |

> [!NOTE]
> 长草稿保留全部细节 —— 优化器只做重组、去重、补缺。灌水凑字数算失败，不算扩张。

## 安装

```sh
# ① npm（推荐）
dsh plugin --profile <name> add dsh-composer-prompt-optimizer

# ② Release 附件
curl -LO https://github.com/subisle/dsh-prompt-optimizer/releases/download/v0.2.0/dsh-composer-prompt-optimizer-0.2.0.tgz
dsh plugin --profile <name> add ./dsh-composer-prompt-optimizer-0.2.0.tgz

# ③ 本地目录
dsh plugin --profile <name> add /path/to/prompt-optimizer

# ④ git（执行 prepare 脚本自动构建）
dsh plugin --profile <name> add github:subisle/dsh-prompt-optimizer

# 验证组合层
dsh --profile <name> --dump-config | grep -A1 prompt-optimizer
```

> [!IMPORTANT]
> Desktop 应用安装到 `~/.dsh/profiles/desktop` 后需重启 —— 客户端条目随 HMR 热重载，Host 半边要重启才生效。

## 配置

所有字段可选；非法值会让插件加载即失败并指出字段（Schema 校验，不静默降级）。

```yaml
- id: prompt-optimizer
  name: dsh-composer-prompt-optimizer
  config:
    maxOutputTokens: 4096
    timeoutMs: 120000
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `maxDraftChars` | `8000` | 接受的草稿最大字符数（超出报 `draft-too-large`） |
| `maxContextTurns` | `6` | 携带为参考上下文的最近用户轮数 |
| `maxContextChars` | `600` | 单轮上下文截断上限 |
| `maxOutputTokens` | `2048` | 辅助调用输出 token 上限 |
| `timeoutMs` | `60000` | 辅助调用端到端超时（`prompt-optimizer/timeout`） |

## 包名与版本适配

**npm 包**：`dsh-composer-prompt-optimizer` · **GitHub 仓库**：[subisle/dsh-prompt-optimizer](https://github.com/subisle/dsh-prompt-optimizer)

两者不同名：npm 上的 `dsh-prompt-optimizer` 已被另一位作者的插件占用。`package.json` 的 `name` 是唯一来源：构建脚本据此生成插件行、浏览器闭包工厂 id 和两份 Typert 清单 —— 改一处，跑 `npm run build`。

所有 `dsh` 依赖都是 peer（无运行时 `dependencies`）；DSH 在组合时用 `semver.satisfies(runtime, range, { includePrerelease: true })` 校验。本包声明 `^0.2.0-rc.2` —— 范围外的 bundle 会被 profile 直接跳过，DSH 升到 0.3.x 时需同步更新 peer 范围。

## 开发

```sh
npm install        # 触发 prepare → 自动构建
npm run build      # lib/index.js, lib/client.js, lib/typert.*, lib/types/
npm test           # 发布前自检（81 项）
npm pack           # 可分发 tarball
```

浏览器 bundle 采用 DSH 闭包工厂格式（`window.__ModuleLoader__.load({id, factory})`），除声明的模块表（react、cordis、ui-primitives…）外全部内联；CSS Modules 编译为插件自有的样式注入器。

### 目录结构

```
prompt-optimizer/
├── package.json            # dsh.bundle(patch) + dsh.client(web) + peer 契约
├── cordis.patch.yml        # 组合层：插入插件行
├── build.mjs               # 自包含构建：tsc 类型 + esbuild bundle + Typert 工件
├── test/check.mjs          # 发布前自检
└── src/
    ├── index.ts                # Host 入口：挂载 Remote 控制器（导出 Config）
    ├── host-controller.ts      # promptOptimizer.optimize + 路由解析 + 输出清洗
    ├── types.ts                # 线上类型 + RemoteErrorDetailsMap 扩展
    └── client/
        ├── index.ts            # 浏览器入口：$mount Remote + 槽位注册
        ├── PromptOptimizer.tsx # 工具栏组件
        ├── context.ts          # 会话上下文提取
        └── locales.ts          # zh/en 词典
```

### 自检覆盖（`npm test`）

1. **清单契约** — name/version/`type`/`dsh.bundle.patch`/`dsh.client.platform`、每个 `exports` 子路径、`files` 覆盖、无运行时依赖
2. **组合层** — `cordis.patch.yml` 恰好一条 `insert` 行，按包名引用
3. **Peer 适配** — 全部 dsh peer 满足 0.2.0-rc.2 与 0.2.1-alpha.2，无 `workspace:` 协议
4. **Host 半边** — `apply`/`name`/`inject`；Config 默认值与非法值拒绝；`normalizePrompt` 与 `userText` 行为；全部错误码；不发送 `temperature`
5. **优化契约** — 证据包装、标记转义、分层系统提示词各节、扩张策略条款
6. **浏览器半边** — 闭包工厂格式、仅声明的 externals、无 Node 内置模块、真实 Cordis 语义下可激活

> [!TIP]
> 三条 Cordis 约束塑造了本代码库：`ctx` 只能访问 `inject` 声明的服务；自挂载的 Remote 命名空间必须在 `$mount` 之后惰性解析（写进模块级 `inject` 会死锁）；单占槽位拒绝同级注册 —— 所以用可叠加的 `conversation.input.right`。
