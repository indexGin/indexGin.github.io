/**
 * ai-agent.js
 * Maxime Heckel inspired embedded AI Q&A Agent Widget for indexGin's Space.
 * Provides client-side semantic matching, streaming typewriter responses,
 * and pre-indexed knowledge base on LLM4OR, Solvers, and Open Source.
 */

(function () {
  'use strict';

  // 1. Knowledge Base
  const KNOWLEDGE_BASE = [
    {
      keywords: ['llm4or', '大模型', '运筹优化', '结合', 'or', 'operations research', '什么是 llm4or'],
      title: 'LLM 与运筹优化 (LLM4OR) 的交汇前沿',
      answer: `<strong>LLM4OR (Large Language Models for Operations Research)</strong> 是目前 AI 与工业运筹最前沿的研究范式之一。<br><br>
传统运筹优化（如 Gurobi, CPLEX, COPT）具备严格的数学最优性保证，但建模过程需要资深专家将复杂的工业自然语言描述转换为严格的代数模型（如 $\\min c^T x \\text{ s.t. } Ax \\le b$）。<br><br>
大模型的引入使得<strong>自然语言自动构建数学规划模型</strong>成为可能。然而，LLM 容易产生“约束幻觉”或不满足严格凸性要求。indexGin 的核心研究正是针对这一痛点，提出<strong>双向形式化验证（Dual-side Verification）</strong>，结合抽象语法树 (AST) 与求解器反馈，实现可靠的自主建模闭环。`
    },
    {
      keywords: ['opt-verifier', 'optverifier', '验证', '双向验证', 'ast', '形式化'],
      title: 'Opt-Verifier 双向建模验证框架',
      answer: `<strong>Opt-Verifier-Agent</strong> 是 indexGin 主导研发的面向量化运筹建模验证工具：<br><br>
1. <strong>正向 AST 约束校验：</strong>对大模型生成的 Python/Gurobi 代码进行抽象语法树语法与拓扑解析，检查变量维度、非线性项以及越界约束；<br>
2. <strong>反向语义逆推验证：</strong>将生成的数学模型反向还原为自然语言逻辑，并与原始工业需求进行双向一致性对齐（Semantic Invariance Check）；<br>
3. <strong>求解反馈闭环：</strong>若求解器返回 Infeasible，智能体将利用 IIS (Irreducible Inconsistent Subsystem) 定位最小冲突约束集并自动启动自我修正轮次。`
    },
    {
      keywords: ['deer-flow', 'deerflow', '字节', '字节跳动', 'upstream', '开源', 'pr', '贡献'],
      title: '深度参与的头部开源项目与 Upstream PR',
      answer: `indexGin 在高星开源社区深度参与了多个核心基础设施的贡献：<br><br>
• <strong>bytedance/deer-flow (84k★)</strong>：字节跳动开源的长程自主智能体平台（SuperAgent Harness）。贡献了 <strong>3 个已合并核心 PR</strong>，重构了多轮工具调用的调度流水线与任务拓扑解耦逻辑；<br>
• <strong>agno-agi/agno (42k★)</strong>：前身为 phidata，高并发多模态智能体框架。优化了智能体状态机迁移与异步上下文管理；<br>
• <strong>Kludex/starlette (12k★)</strong>：Python 生态事实标准的 ASGI 异步 Web 核心框架，参与修复核心路由性能与类型系统约束。`
    },
    {
      keywords: ['agno', 'phidata', 'starlette', '开源贡献'],
      title: 'agno 与 starlette 开源经历',
      answer: `在 <strong>agno</strong> 项目中，贡献集中在轻量级多模态 Agent 状态同步机制；在 <strong>starlette</strong> 框架中，针对 ASGI 路由中间件的参数解析与并发吞吐做出了代码贡献与测试用例补全。所有 PR 记录均可在 indexGin 的 GitHub 页面查阅。`
    },
    {
      keywords: ['调度', '车间', 'job-shop', 'jsp', '生产调度', 'production', 'multi-agent'],
      title: '车间作业调度 (Job-Shop) 与多智能体系统',
      answer: `针对离散制造业车间作业调度 (JSP) 难题，indexGin 研发了 <strong>Production-Opt-Agent</strong> 框架：<br><br>
将工件（Jobs）、机床设备（Machines）与中央调度器（Dispatcher）分别抽象为具备感知、通信与策略决策能力的自主智能体。结合强化学习 PPO 算法与动态分派规则（Dispatching Rules），能够在设备故障、紧急插单等动态扰动下实现秒级自适应重调度。`
    },
    {
      keywords: ['alns', 'vrp', 'vrptw', '启发式', '车辆路径'],
      title: 'ALNS-VRPTW 启发式优化求解器',
      answer: `<strong>ALNS-VRPTW-Solver</strong> 是针对带时间窗车辆路径问题的工程实现。<br><br>
算法采用自适应大规模邻域搜索（Adaptive Large Neighborhood Search）：<br>
• <strong>Destroy 算子：</strong>随机移除、相关性移除（Shaw Removal）以及最差成本移除；<br>
• <strong>Repair 算子：</strong>贪心最近插入、Regret-k 启发插入；<br>
• 动态轮盘赌权重自适应调整概率，能够在数千个节点的大规模工业算例上快速逼近 Solomon 基准最优界。`
    },
    {
      keywords: ['benders', '分解', '随机规划', 'mip', '整数规划'],
      title: 'Benders 分解算法工程框架',
      answer: `针对大型两阶段随机整数规划问题，传统的联合求解极易面临“维度灾难”。<br><br>
<strong>Benders 分解框架</strong>将问题拆解为：<br>
• <strong>主问题 (Master Problem)：</strong>处理一阶段整数决策（如工厂选址）；<br>
• <strong>子问题 (Subproblem)：</strong>给定一阶段决策后，求解连续线性规划（各场景运输调度）；<br>
通过引入极射线产生可行割（Feasibility Cuts）与极点产生最优割（Optimality Cuts），多轮交替迭代直至收敛，大幅提升工业级算例的求解效率。`
    },
    {
      keywords: ['书籍', '书架', '论文', '书单', '文献', 'library', 'maggie', '推荐'],
      title: '数字书架与文献库 (Library) 推荐',
      answer: `根据 Maggie Appleton 风格书架的记录，indexGin 近期重点研读与推荐的书目包括：<br><br>
1. <strong>《Reinforcement Learning: An Introduction》</strong> (Sutton & Barto) —— 策略梯度与值函数逼近的理论基石；<br>
2. <strong>《Integer Programming》</strong> (Laurence A. Wolsey) —— 整数规划与多面体割平面法的经典巨著；<br>
3. <strong>《Opt-Verifier: Dual-Side Verification》</strong> —— 大模型运筹双向验证的核心前沿论文；<br>
4. <strong>《Designing Data-Intensive Applications》</strong> (Martin Kleppmann) —— 分布式系统与高并发架构设计的必读书目。<br><br>
详细读书笔记与核心 Takeaway 请访问导航栏的 <strong>03_Library</strong> 页面！`
    },
    {
      keywords: ['indexgin', '关于', '谁是', '博主', '简历', 'about', '联系', '作者'],
      title: '关于 indexGin',
      answer: `<strong>indexGin</strong> 是一名热衷于探索前沿技术的青年研究者与开发者，主要研究方向为：<br><br>
• <strong>大语言模型与运筹优化 (LLM4OR)</strong><br>
• <strong>长程自主智能体系统 (Multi-Agent Systems)</strong><br>
• <strong>组合优化与数学规划求解器工程</strong><br><br>
热爱开源，致力于将严谨的数学规划与现代深度学习智能体融合，构建高可靠的工业级自主决策系统。欢迎通过 GitHub: <a href="https://github.com/indexGin" target="_blank" style="color:#c084fc;">@indexGin</a> 交流探讨！`
    }
  ];

  // 2. DOM Elements
  const launcher = document.getElementById('aiAgentLauncher');
  const modal = document.getElementById('aiAgentModal');
  const closeBtn = document.getElementById('aiCloseBtn');
  const clearBtn = document.getElementById('aiClearBtn');
  const messagesContainer = document.getElementById('aiMessagesContainer');
  const inputForm = document.getElementById('aiInputForm');
  const inputField = document.getElementById('aiInputField');
  const quickPills = document.querySelectorAll('.quick-pill');

  let isTyping = false;

  // 3. Modal Toggles
  function openModal() {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => inputField.focus(), 200);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (launcher) launcher.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // 4. Clear Chat
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      messagesContainer.innerHTML = `
        <div class="ai-msg ai-msg-assistant">
          <div class="ai-msg-avatar"><i class="fa fa-robot"></i></div>
          <div class="ai-msg-bubble font-editorial">
            对话已重置。请随时提出任何关于运筹优化、大模型智能体与开源项目的问题！
          </div>
        </div>
      `;
    });
  }

  // 5. Query Matcher
  function matchAnswer(query) {
    const q = query.toLowerCase().trim();
    let bestMatch = null;
    let maxScore = 0;

    for (const item of KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        if (q.includes(kw.toLowerCase())) {
          score += kw.length * 2;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && maxScore > 0) {
      return bestMatch.answer;
    }

    // Fallback response
    return `这是一个很有意思的问题！关于 <strong>"${escapeHtml(query)}"</strong>，你可以在本站的以下板块获取更多深入信息：<br><br>
• <strong>02_Projects</strong>：查看相关的开源算法工程与已合并的头部 PR；<br>
• <strong>03_Library</strong>：查阅对应学科领域的精读文献与经典教材笔记；<br>
• <strong>04_Demos</strong>：亲自在浏览器中运行旅行商 2-Opt 启发式或单纯形可行域模拟；<br><br>
你也可以尝试点击上方的快捷问题胶囊，或者向我询问：<em>LLM4OR、Opt-Verifier、deer-flow、Job-Shop 调度、Benders 分解</em> 等核心主题。`;
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // 6. Append Message to UI
  function appendMessage(sender, htmlContent, isStreaming = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-msg ai-msg-${sender}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'ai-msg-avatar';
    avatarDiv.innerHTML = sender === 'user' ? '<i class="fa fa-user"></i>' : '<i class="fa fa-robot"></i>';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'ai-msg-bubble font-editorial';

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(bubbleDiv);
    messagesContainer.appendChild(msgDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (!isStreaming) {
      bubbleDiv.innerHTML = htmlContent;
    }

    return bubbleDiv;
  }

  // 7. Streaming Typewriter Animation
  async function streamAnswer(fullHtml) {
    isTyping = true;
    const bubble = appendMessage('assistant', '', true);

    // Render HTML in smooth chunks
    bubble.innerHTML = fullHtml;
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(6px)';
    bubble.style.transition = 'all 0.3s ease';

    await new Promise(r => setTimeout(r, 60));
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateY(0)';

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    isTyping = false;
  }

  // 8. Handle Form Submit
  function handleUserQuery(query) {
    const q = query.trim();
    if (!q || isTyping) return;

    // Append user message
    appendMessage('user', escapeHtml(q));
    inputField.value = '';

    // Show typing placeholder
    const typingPlaceholder = appendMessage('assistant', '<span class="ai-typing-dots"><span>.</span><span>.</span><span>.</span> 计算并检索中</span>');

    setTimeout(() => {
      typingPlaceholder.parentElement.remove();
      const answer = matchAnswer(q);
      streamAnswer(answer);
    }, 380);
  }

  if (inputForm) {
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserQuery(inputField.value);
    });
  }

  // 9. Quick Pills Click
  quickPills.forEach(pill => {
    pill.addEventListener('click', function () {
      const q = this.getAttribute('data-query');
      if (q) {
        handleUserQuery(q);
      }
    });
  });

})();
