---
layout: post
title: "万字长文 | 深度解读 OpenAI Codex Harness 源码"
subtitle: "从一次模型调用，到一个真正可控、可观察、能干活的 Agent 运行时"
date: 2026-10-22 14:15:00
author: "阿甘兄"
header-img: "img/post-bg-unix-linux.jpg"
header-mask: 0.4
catalog: true
tags:
    - Agent
    - OpenAI
    - Codex
    - LLM
    - 系统架构
    - 技术转载
---

> **转载说明**  
> **出处**：微信公众号 **「阿甘兄」**（2026年9月3日推文）  
> **作者**：阿甘兄  
> **原文链接**：[万字长文 | 深度解读 Codex Harness 源码](https://mp.weixin.qq.com/s/xa2xrK-LyM5Ktow2hq1vWQ)  
> *声明：本文仅供个人技术学习与交流分享，版权归原作者所有。*

---

> **核心导读**  
> 继 DeepSeek 开源 DSH 之后，OpenAI 也发布了《Codex as a platform: build on the open agent harness》文章，并宣布开源 Codex Harness。  
> **Codex 是怎样把模型输出变成一个可持续运行、可观察、可打断的 Agent 的？**  
> 这篇文章，我们就沿着源码一路往下拆，看看 OpenAI 是如何把一次次模型调用，组织成一个**真正可运行、可控制、可观察**的 Agent。
> 
> * **源码地址**：[https://github.com/openai/codex](https://github.com/openai/codex)
> * **Commit ID**：`633ab199cf`

![Codex Harness](/img/in-post/post-codex-harness/img-0.png)

---

## 01. Harness 是什么？

在阅读本文前，有几个概念需要先明确厘清。

### 1.1 Model、Harness 与 Host

讨论 Agent 时最常见的混乱，是把这三层揉成一个词。先把边界画清楚，后面的源码就不会看得很吃力：

![Model、Harness 与 Host 边界划分](/img/in-post/post-codex-harness/img-1.png)

* **Host（宿主）**：可以理解为外壳。Codex CLI 是 Host，IDE 插件是 Host，未来在业务系统中嵌入的“帮我排查异常”操作面板也可以是 Host。
* **Harness（马具/线束/底盘）**：是可复用的中间层。它不拥有业务页面，但让 Host 获得一个能真正干活的 Agent。
* **Model（模型）**：输出只是“建议说什么、调用什么工具”。没有 Harness，模型无法可靠地把建议转化为真实系统动作。

官方文章把这种分工描述为：**应用负责产品上下文、业务规则和工具，Codex app-server 提供 Agent loop 和受控执行。**

---

### 1.2 Thread、Turn、Step 与 Item

源码里几乎所有对象都围绕着 **Thread、Turn、Step、Item** 这四种不同粒度的“上下文”展开，按时间尺度分层如下：

![Thread、Turn、Step 与 Item 分层](/img/in-post/post-codex-harness/img-2.png)

> **直观比喻**：  
> **Thread** 像一个**项目文件夹**；  
> **Turn** 像一次**业务工单**；  
> **Step** 像工单里的一次**独立思考/采样**；  
> **Item** 像工单流水里的**单条日志/事实**。

这里需要补充一个极易混淆却关键的源码边界：
* **Thread** 是 `app-server` 协议层对外暴露的长期对象；
* **Core** 内部真正保存活动状态、输入队列和历史的运行时对象叫 `Session`。

#### 为什么要额外引入 Step？
一个 Turn（用户发来一句话）往往要让模型思考很多次。例如：先检索、再读文件、再修改代码、最后运行测试，中间至少经历四到五次模型采样。每次采样的工具可用性和上下文窗口都可能不同，因此 **Step 是一个必须存在的中间快照**。

---

### 1.3 模型调用工具的闭环

严格来说，模型不会直接在系统上运行 shell，也不会直接写本地文件。它只会在响应流中产生 `FunctionCall`、`CustomToolCall` 等结构化 Item。

Harness 读取到这个 Item 后，再根据当前 Step 的 `ToolRouter` 找到对应实现、执行并收集结果，随后生成 `FunctionCallOutput` 写回模型历史。

因此，工具调用的完整闭环为：

![工具调用完整闭环](/img/in-post/post-codex-harness/img-3.png)

> **“模型拥有工具”只是体验上的简写**。从源码视角看，真正的所有者是 **Harness**，模型只是一个被授予了有限调用权的决策者。

---

## 02. 项目结构

克隆仓库到本地后，目录结构如下：

![仓库目录概览](/img/in-post/post-codex-harness/img-4.png)

理解 Harness 时主要关注以下分层：

![核心组件分层](/img/in-post/post-codex-harness/img-5.png)

`app-server` 的 README 明确把核心对象定义为 `Thread → Turn → Item`：
* **Thread**：长期对话会话；
* **Turn**：单次任务交互；
* **Item**：该轮中可持久化的用户消息、推理、命令、文件编辑等可验证事实。

### 2.1 根目录

```powershell
codex/
├── codex-cli/               # Node.js 包装层、分发入口
├── codex-rs/                # 真正的 Rust 工作区：Harness 主体在这里
│   ├── cli/                 # 命令行前端
│   ├── tui/                 # 终端 TUI
│   ├── core/                # 会话、Turn、Agent loop、工具与上下文
│   ├── app-server/          # 给桌面端/IDE/自建应用使用的 JSON-RPC 服务
│   ├── app-server-protocol/ # app-server 对外协议
│   ├── protocol/            # Core 内部 Thread/Turn/Item/事件协议
│   ├── tools/               # 工具定义与相关运行时能力
│   ├── sandboxing/          # 沙箱能力
│   ├── exec-server/         # 命令执行服务
│   ├── rollout/             # 任务记录、恢复相关能力
│   ├── thread-store/        # Thread 持久化存储
│   └── codex-mcp/           # MCP 连接与管理
├── sdk/                     # Python / TypeScript SDK
├── docs/                    # 用户和贡献文档
├── scripts/                 # 安装、打包、测试脚本
└── bazel/                   # Bazel 构建规则与平台支持
```

`codex-rs` 下的 crate 特别多，因为它不是把“一次聊天”拆碎，而是把系统边界划清：协议、存储、沙箱、MCP、前端、执行器都可以独立演进。回答“Harness 怎么工作”的主线集中在 **core、tools、protocol 和 app-server** 四处。

### 2.2 Core 的关键入口

`codex-rs/core/src` 是最核心的目录：

```bash
core/src/
├── session/
│   ├── turn_input.rs      # 用户输入准入：启动、插话还是拒绝
│   ├── turn.rs            # run_turn：Agent 主循环核心
│   ├── turn_context.rs    # 本轮任务的固定上下文
│   ├── step_context.rs    # 一次模型采样的快照
│   ├── input_queue.rs     # 任务执行中收到的新输入
│   ├── inject.rs          # 将 Item 写回历史
│   └── mcp*.rs            # MCP 解析、预热与刷新
├── tasks/                 # RegularTask 等后台任务生命周期
├── tools/
│   ├── spec_plan.rs       # 生成本轮工具计划
│   ├── router.rs          # ToolRouter：可见工具与真实 handler 映射
│   ├── parallel.rs        # 工具并发、独占与取消
│   └── handlers/          # exec、apply_patch、MCP 等具体 handler
├── context_manager/       # 模型可见上下文管理
├── compact*.rs            # 上下文压缩
├── exec_policy/           # 命令策略
└── sandboxing/            # 沙箱接入
```

**建议阅读路径**：
```bash
app-server/README.md
    ↓  先理解协议与生命周期
session/turn_input.rs
    ↓  看输入如何启动/转向一个 Turn
tasks/regular.rs + tasks/mod.rs
    ↓  看后台任务如何获得取消与完成生命周期
session/turn.rs::run_turn
    ↓  看主循环如何反复采样
tools/spec_plan.rs + tools/router.rs + tools/parallel.rs
    ↓  看工具计划、分派与并发控制
session/mod.rs::request_*_approval
    ↓  看人工审批怎样卡住真实执行
```

---

## 03. 一条任务如何运行？

以“**修复登录接口偶发 500，并运行测试**”为例，对象和事件的时间线如下：

![任务运行完整时序图](/img/in-post/post-codex-harness/img-6.png)

1. **同一次用户 Turn 对应多次模型请求**：模型先决定读什么，读完再决定改什么，改完再决定跑什么测试，每一次工具结果都是下一次“思考”的输入。
2. **UI 无需等最终答案就知道进度**：`app-server` 持续以事件流推送 Turn 开始、Item 增量、工具进度与审批请求。

---

### 3.1 接收任务：启动一个 Turn

> **对应源码**：`codex-rs/core/src/session/turn_input.rs` 中的 `start_or_steer` 与 `start_if_idle`。

宿主发送 `turn/start`，并不会同步阻塞等待，而是快速创建并异步运行：

```bash
initialize 
  → thread/start 或 thread/resume 
  → turn/start 
  → 持续接收 item/* 与 delta 事件 
  → turn/completed
```

`start_or_steer` 会先判断输入应当：
* 启动新 Turn；
* 注入给正在运行的 Turn（steer，中途补充要求）；
* 或因状态不满足而拒绝。

若当前无任务，构造 `TurnContext`，调用 `session.spawn_task(...)`：模型请求从此不是 UI 线程的阻塞调用，而是一个**带取消令牌的后台 `SessionTask`**。

#### 3.1.1 任务准入：Start、Steer 与 StartIfIdle

![任务准入机制](/img/in-post/post-codex-harness/img-7.png)

Core 在入口处统一定夺输入是启动、转向还是拒绝，立即向 UI 返回请求的受纳状态，以便 UI 迅速更新按钮和加载态。

#### 3.1.2 请求快照：TurnContext 与 StepContext

* **`TurnContext`**：本次任务的长期身份（Turn ID、来源、环境快照、扩展数据、遥测状态及初始设置）。
* **`StepContext`**：在具体请求发起前捕获的**不可变设置快照**（包含当次生效的模型、服务等级、审批规则、环境与 `ToolRouter`）。

```text
TurnContext：本次任务是谁、从哪里来、长期共享什么状态
    │
    └── StepContext：这一次模型请求看到并可执行什么
```

> **设计价值**：设置变化可以影响后续 Step，但绝不会导致一个按旧规则发出的工具调用在执行瞬间动态突变。

#### 3.1.3 任务生命周期：SessionTask
`tasks/mod.rs` 中的 `SessionTask` trait 抽象了异步任务生命周期，无论是常规对话 `RegularTask`、上下文压缩，还是后台命令，统一纳入：
* Tokio task 启停；
* 全链路协同取消；
* 统一的事态事件流派发。

---

### 3.2 运行主循环：run_turn

> **对应源码**：`codex-rs/core/src/session/turn.rs` 的 `run_turn`。

核心调度逻辑的简化伪代码：

```rust
async fn run_turn(...) {
    预先压缩过长上下文;
    解析本轮需要的 MCP / 技能 / 插件;
    记录用户输入和上下文注入;

    loop {
        取出用户在运行期间追加的输入;
        捕获当前时刻的 StepContext;
        从 Session 会话历史生成本次 prompt;
        let result = run_sampling_request(prompt).await;

        if 需要继续 (needs_follow_up) {
            如有必要则压缩上下文;
            continue;
        }
        break;
    }
}
```

#### 3.2.1 三个关键机制
1. **StepContext 快照约束**：同一个 request view 必须同时用于上下文组装、向模型广播的工具声明、以及运行时的工具执行分发，杜绝权限漂移竞态。
2. **结构化 Item 历史回填**：工具执行结果与中途指令全量以 `ResponseItem` 形式入库。下一轮采样不是手动拼凑字符串，而是严谨的事件累加。
3. **自适应上下文压缩**：Token 触及红线时触发 `run_auto_compact`，精炼历史后继续任务，而非粗暴抛错断开。

#### 3.2.2 一次 Turn 的七个阶段

![Turn 的七个阶段](/img/in-post/post-codex-harness/img-8.png)

* **`needs_follow_up` 的判断依据**：工具执行待回填、服务端 `end_turn: false`、执行中途用户插话、Stop hook 要求附加检查或上下文压缩后续跑。
* **Hooks 的集成价值**：允许宿主在任务前后插入仓库规则注入、测试合规核验与审计，由 Runtime 在受控时机触发。

---

### 3.3 汇合模型、工具与 UI 事件

`run_sampling_request` 通过 `client_session.stream(...)` 获得流式事件，不只是接收文本 Token，而是分派完整的响应事件集合：

![响应事件分流机制](/img/in-post/post-codex-harness/img-9.png)

```text
模型流 ResponseEvent
    │
    ├─ 文本 delta ────────► AgentMessageContentDeltaEvent ──► UI 显示
    ├─ 工具项完成 ────────► ToolCallRuntime ───────────────► 启动执行
    └─ response completed ─► 判定本轮结束 / 续跑 / 压缩
```

* **Delta 与 Item 职责分离**：Delta 仅供低延迟前端流式渲染；已完成的 Item 才是用于恢复、审计与后续推理的权威事实。
* **参数流式翻译**：`ToolArgumentDiffConsumer` 实时解构正在拼装的参数，向 UI 展示“即将调用什么”，但执行必须严格等待校验完成的完整 Item。

---

### 3.4 调度工具：从调用到回填

![工具调度与分派体系](/img/in-post/post-codex-harness/img-10.png)

#### 3.4.1 工具路由：ToolRouter
同时维护 `model_visible_specs`（对外声明）与 `ToolRegistry`（真实 Handler）。确保**“广告给模型的工具列表”与“底层真正能调度的实现”严格对称**。

#### 3.4.2 并发、独占与取消：ToolCallRuntime
通过 Tokio `RwLock` 管理并发：
* **只读/可并行工具**：获取读锁，支持安全并发；
* **有状态/写操作工具**：获取写锁，严格串行排他。
* **绑定 `CancellationToken`**：Turn 中断时，正在飞行的任务安全中止，并回填“已取消”事实给上下文。

#### 3.4.3 一次工具调用的四层形态

| 层次 | 形态 | 示例 |
| :--- | :--- | :--- |
| **模型协议层** | `ResponseItem::FunctionCall` | `exec_command({ cmd: "rg login" })` |
| **路由层** | `ToolCall` | 解析工具名、call_id 与实参 |
| **执行层** | `handler / runtime` | 调用真实 Shell、MCP 或 Patch 引擎 |
| **回填层** | `FunctionCallOutput` | 输出 stdout、stderr 或结构化结果 |

> **容错哲学**：命令失败或找不到文件包装为普通模型错误回填，赋予模型解释与换路径纠错的自主权；仅 Runtime 致命错误才向上抛出中断。

---

### 3.5 执行前的安全边界

![分层安全与审批机制](/img/in-post/post-codex-harness/img-11.png)

#### 3.5.1 异步审批模式

```text
工具准备执行命令
    │
    ▼
Session 创建 oneshot channel，以 approval_id 挂起登记
    │
    ▼
向 Host 发送 ExecApprovalRequest 事件
    │
    ▼
执行器异步 await 决策
    ├─ 批准：继续执行
    ├─ 拒绝：生成拒绝结果回填上下文
    └─ 链路中断/超时：默认回退 ReviewDecision::Abort（Fail Closed 原则）
```

#### 3.5.2 四重安全防线对照

| 机制 | 核心职责 | 典型表现 |
| :--- | :--- | :--- |
| **工具 Schema** | 约束模型能感知到的能力表面 | 不可见的工具无法被模型调用 |
| **执行策略 (Exec Policy)** | 基于预设规则的自动化判定 | 自动放行、强制阻断或标记需审批 |
| **沙箱隔离 (Sandbox)** | 限制系统调用的实际破坏范围 | 限制文件目录读写与网络出向 |
| **人工审批 (Approval)** | 关键节点的人工决策接入 | 阻断等待人工显式确认 |

---

### 3.6 保存任务事实：历史、压缩与恢复

![历史管理与压缩流](/img/in-post/post-codex-harness/img-12.png)

1. **两类历史共存**：模型推理可见历史（Item 序列）与系统审计事件流。
2. **Rollout 状态机重放**：`RolloutItem` 完整快照会话，支持 Thread 的随时断点恢复、分叉（Fork）与历史审计。
3. **智能上下文压缩**：非朴素摘要，而是在精简历史的同时，严密锚定已修改的文件列表与测试结论，避免动作遗忘和反复撞墙。

---

### 3.7 处理运行中的变化：取消、失败、重试与插话

![异常与变化处理流](/img/in-post/post-codex-harness/img-13.png)

* **取消沿整链传导**：取消信号无缝贯通模型流、后台工具子进程与人工审批通道，杜绝“UI 显示已停止但后台仍在静默改文件”的事故。
* **优雅中途插话（Steer）**：用户在执行中途输入的内容缓存在 `input_queue`，在下一次采样前安全排水（Drain）写回上下文，兼顾响应灵敏度与上下文自洽。

---

### 3.8 app-server：Harness 的控制面

`app-server` 通过双向 JSON-RPC 将 Core 封装为平台级本地服务：

![app-server 架构](/img/in-post/post-codex-harness/img-14.png)

* **客户端能力**：调用 `thread/start`、`turn/start`、`turn/interrupt`、提交审批响应。
* **服务端能力**：主动反向推送增量文本、工具进度、Item 完成与审批阻断事件。
* **内建有界队列背压**：在高频调用与海量日志下保护系统内存稳定性。

#### 接入形态选型

| 场景需求 | 推荐接入层 | 选型优势 |
| :--- | :--- | :--- |
| **CI / CD、自动化脚本** | `codex exec` | 命令行边界清晰，关注最终退出码与结果 |
| **Python / TS 自动化流程** | SDK | 免去手动处理进程与 JSON-RPC 编解码 |
| **桌面端、IDE、企业定制平台** | `app-server` | 全面掌控 Thread 生命周期、审批与事件总线 |

---

### 3.9 扩展能力：MCP、Skills、Plugins 与多 Agent

![扩展能力体系](/img/in-post/post-codex-harness/img-16.png)

* **MCP（模型上下文协议）**：通用的能力连接器，充当统一工具接入插座。
* **Skills**：受控注入的专业作业 SOP 与指南说明书。
* **Plugins**：将 Skills、MCP 工具与依赖项一体化打包发布的分发件。
* **多 Agent 协同**：共享父级运行时边界，严密继承权限与沙箱规则，杜绝通过子 Agent 越权渗透。

---

## 04. Harness 为什么这样设计？

![Harness 核心架构精髓](/img/in-post/post-codex-harness/img-17.png)

1. **从单次调用走向持久任务**：将静态 prompt 转换为由 `Thread → Turn → Step → Item` 驱动的可推进状态机。
2. **`StepContext` 快照防漂移**：锁定当次采样的工具、模型与策略一致性，解决动态配置下的越权与分派混乱。
3. **以 Item 固化证据链**：让行动后果反哺为下一次思考的前提输入。
4. **状态机吸收系统不确定性**：将断网、超时、拒绝、插话收敛为确定性的有限状态流转。
5. **分层立体安全**：以策略、沙箱、Schema 与审批构建纵深防御，非盲目信任模型的主观判断。
6. **UI 纯粹订阅事实**：解耦前端界面与业务执行，同一套 Engine 驱动全平台生态。

![完整运行生命周期总结](/img/in-post/post-codex-harness/img-18.png)

---

## 05. 如何把 Harness 接入产品？

![企业级产品接入职责分工](/img/in-post/post-codex-harness/img-19.png)

### 5.1 职责边界核心原则
> **业务系统仍是核心记录体系（System of Record），Harness 绝不是你的业务数据库。**  
> Harness 专注编排 Agent 的思考与动作回路；业务系统专心维系业务数据资产、鉴权与最终入库约束。

### 5.2 落地接入五大军规
1. **结构化提供业务上下文**：给精准 ID、实体字段与只读查询接口，拒绝全量网页 HTML 暴力硬塞。
2. **写操作强封装为受控工具**：用 `create_ticket`、`revert_commit` 配合明确的 JSON Schema 与审批机制。
3. **过程事实全量透出**：在 UI 渲染 Item 过程流，让用户对 Agent 的检索与编辑细节保持知情与信任。
4. **持久化取消与断线重连**：核心状态沉淀于 Server 端 Session，拒绝仅保存在前端单页内存。
5. **策略先于提示词**：危险操作用执行策略（Policy）硬编码防线，不可依赖“请模型务必小心谨慎”。

---

## 06. 常见问题

* **Q1：Harness 就是 ReAct 框架吗？**  
  **不是**。ReAct 仅是一种推理范式（Thought-Action-Observation）；Harness 是将其工程化工业落地的完整底层系统，涵盖了并发锁、流式打字、会话压缩、故障恢复、沙箱与审批控制。
* **Q2：Harness 会让大模型更聪明吗？**  
  不会改变模型参数，但它决定了长任务中模型能否获取完整证据、正确使用工具、避免盲目死循环并在失败后自主修复。
* **Q3：最核心的源码入口到底看哪个？**  
  * 看执行主循环：`core/src/session/turn.rs::run_turn`
  * 看产品控制面：`app-server` 的 `turn/start`
  * 看执行安全：`tools/router.rs` 与 `request_command_approval`

---

## 07. 总结

如果只记住三句话：
1. **它是循环，不是单次调用**：`run_turn` 持续把输出转化为下一轮动作依据。
2. **它是运行时，不是提示词模板**：并发读写锁、取消令牌、沙箱与审批将“动口”变为可控的“动手”。
3. **它是集成层，不是固定 UI**：双向 JSON-RPC 协议让任何平台都能挂载强大的 Agent 引擎。

![Codex Harness 核心全景脑图](/img/in-post/post-codex-harness/img-20.png)

> **记住六大核心标识**：
> * `run_turn` ➔ **任务主循环**
> * `StepContext` ➔ **单次采样绝对快照**
> * `ToolRouter` ➔ **能力声明与执行对齐**
> * `CancellationToken` ➔ **全链路协同取消**
> * `RolloutItem` ➔ **可重放事实日志**
> * `app-server` ➔ **双向控制驱动协议**
