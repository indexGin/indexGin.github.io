/**
 * ai-agent.js
 * indexGin Personal Space Assistant Widget (Maxime Heckel Inspired)
 * 
 * Features:
 * 1. Pluggable Architecture: Supports future real LLMs (DeepSeek / OpenAI / Cloudflare Workers AI)
 * 2. Client-side Semantic Match Engine & Offline Knowledge Base
 * 3. Smooth streaming typewriter animation & responsive modal
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Agent Configuration & Real LLM Extension Hook (智谱 GLM-4-Flash)
  // =========================================================================
  // 已配置为对接 智谱 AI 官方永久免费大模型 GLM-4-Flash：
  // 1. 请在 Cloudflare Workers 中部署代理（代码见根目录 cloudflare-worker.js），配置 ZHIPU_API_KEY
  // 2. 将下方 apiEndpoint 替换为你的 Cloudflare Worker 域名
  // 3. 若尚未配置 Worker 或网络离线，小助手会自动平滑回退至本地离线知识库
  // =========================================================================
  const AGENT_CONFIG = {
    botName: "indexGin 小助手",
    botVersion: "v2.1",
    useRemoteLLM: true, // 已开启真实大模型
    remoteConfig: {
      // 已配置为你在 Cloudflare Worker 部署的代理端点
      apiEndpoint: "https://zhipu.lichengfa7.workers.dev",
      apiKey: "", // Key 安全保存在 Worker 环境变量中，前端留空
      model: "glm-4-flash", // 智谱官方永久免费大模型
      systemPrompt: "你是 indexGin 个人主页的智能助手，你叫Simple，请用亲切、清晰、严谨且富有智慧的口吻回答访客。"
    }
  };

  // =========================================================================
  // 2. Offline Knowledge Base (本地离线预索引知识库)
  // =========================================================================
  const KNOWLEDGE_BASE = [
    {
      keywords: ['书单', '书籍', '万历十五年', '黄仁宇', '普鲁斯特', '荷马', '追忆似水年华', '奥德修纪', '伊利亚特', '豆瓣', 'library', '阅读'],
      title: '数字书架与精选书单',
      answer: `indexGin 的数字书架展示了大历史观、古典哲学与前沿思想的精选作品（格式为封面、书名、作者，点击可直达豆瓣读书）：<br><br>
• <strong>《万历十五年》</strong>（[美] 黄仁宇 著）：大历史观开山经典，从无关紧要的细微事件解构帝国体制溃败的必然脉络；<br>
• <strong>《追忆似水年华·第二卷：在少女们身旁》</strong>（[法] 马塞尔·普鲁斯特 著）：解构时间与记忆的意识流巨著；<br>
• <strong>《奥德修纪》</strong>（[古希腊] 荷马 著）：关于归乡、流亡与追寻自我的永恒英雄史诗；<br>
• <strong>《伊利亚特》</strong>（[古希腊] 荷马 著）：关于阿基琉斯之怒与凡人命运枷锁的悲壮史诗。<br><br>
点击顶部导航的 <strong>03_Library</strong> 或主页左侧书架，即可浏览 3D 实体书架并直达对应<strong>豆瓣读书主页</strong>！`
    },
    {
      keywords: ['开源', '贡献', 'pr', 'deer-flow', 'agno', 'starlette', 'upstream', '字节', 'github'],
      title: '深度参与的头部开源项目贡献',
      answer: `indexGin 在高星开源社区深度参与了多个关键基础设施的代码贡献：<br><br>
• <strong>bytedance/deer-flow (84k★)</strong>：字节跳动开源的长程自主智能体平台。贡献了 <strong>3 个已合并核心 PR</strong>，深度重构了智能体多轮调度的任务流与拓扑解耦逻辑；<br>
• <strong>agno-agi/agno (42k★)</strong>：高并发轻量级多模态 Agent 框架，参与优化了智能体状态机迁移与异步调用上下文；<br>
• <strong>Kludex/starlette (12k★)</strong>：Python 事实标准的 ASGI 高性能异步 Web 框架，优化了核心路由吞吐与类型系统。<br><br>
点击顶部导航的 <strong>02_Projects</strong> 或主页左侧开源栏目可查看详细 PR 记录与代码仓库。`
    },
    {
      keywords: ['功能', '特色', '好玩', 'demo', '演示', '主题', '暗色', '亮色', '沙盒'],
      title: '本站特色与交互功能指引',
      answer: `欢迎探索 indexGin 个人空间的诸多硬核与美学特色：<br><br>
1. <strong>右上角双套主题切换</strong>：点击右上角 🌙/☀️ 按钮，可即时在“深空代码黑”与“纯净纸质白”之间无缝切换，并自动记忆偏好；<br>
2. <strong>04_Demos 交互式算法沙盒</strong>：纯前端 Canvas 实现，可实时运行<strong>旅行商问题 (TSP) 2-Opt 启发式</strong>（支持点击加点与实时求解动画）以及<strong>二维线性规划 (LP) 可行域与单纯形顶点</strong>探索；<br>
3. <strong>03_Library 豆瓣书架</strong>：Maggie Appleton 风格的拟真书架，沉淀阅读感想与豆瓣跳转；<br>
4. <strong>前沿数学矢量环境底图</strong>：由凸多面体、KKT 运筹公式、矩阵中括号点阵、神经网络拓扑与智能体循环构成的数学美学水印。`
    },
    {
      keywords: ['添加新书', '怎么上传', '更新书籍', '如何添加', '新增书'],
      title: '如何在书架中添加新书？',
      answer: `为书架添加新书非常简单，全流程只需 2 步：<br><br>
1. 打开项目根目录下的 <code>_data/library.yml</code> 文件；<br>
2. 复制文件顶部的标准书籍模板，填入书名、作者、封面路径及豆瓣链接（<code>douban_url</code>）即可；<br><br>
保存提交后，页面会自动根据 Maggie Appleton 风格渲染出包含 3D 书脊与豆瓣直达的精美书卡，主页近期在读与数字书架将同步自动呈现！`
    },
    {
      keywords: ['indexgin', '关于', '谁是', '博主', '简历', 'about', '联系', '方向'],
      title: '关于博主 indexGin',
      answer: `<strong>indexGin</strong> 是一名热衷于前沿技术与人文经典的思想实践者。研究聚焦于：<br><br>
• <strong>大语言模型与运筹优化 (LLM4OR)</strong>：探索大模型自动构建数学规划与双向形式化验证；<br>
• <strong>长程自主智能体系统 (Multi-Agent Systems)</strong>：离散制造与工业车间自适应调度；<br>
• <strong>组合优化与数学规划求解器工程</strong>；<br>
• <strong>经典文学与思想沉淀</strong>。<br><br>
欢迎通过 GitHub <a href="https://github.com/indexGin" target="_blank" style="color:#c084fc;">@indexGin</a> 与博主交流合作！`
    },
    {
      keywords: ['llm4or', '大模型', '运筹', 'opt-verifier', '算法', '验证'],
      title: 'LLM4OR 与双向验证前沿',
      answer: `传统运筹求解器（Gurobi / COPT）具备数学严格性，但工业自然语言建模极易面临门槛高与幻觉风险。<br><br>
indexGin 主导的 <strong>Opt-Verifier</strong> 提出了<strong>“正向语法 AST 约束解析 + 反向语义一致性逆推”</strong>的双向验证机制，并在求解器 Infeasible 时结合 IIS 冲突集自动实现自愈迭代，推动运筹建模迈向可靠自主闭环。`
    },
    {
      keywords: ['rag', '检索增强', '知识库', 'chunk', 'bm25', 'rerank', 'embedding', 'graphrag'],
      title: '博主最新博文：《RAG总结与学习》',
      answer: `博主发布了全景架构技术长文 <strong>《RAG总结与学习》</strong>：<br><br>
• <strong>核心流程</strong>：系统解构了“多路召回 (BM25 + 向量) ➔ RRF 倒数融合 ➔ Cross-Encoder 重排 ➔ 上下文防遗忘组装”的标准企业级方案；<br>
• <strong>高级范式</strong>：深入对比了 Self-RAG 自省循环、CRAG 质量纠错评估与微软 GraphRAG 社区知识图谱；<br>
• <strong>评测与避坑</strong>：梳理了 Context Relevance、Groundedness 与 Answer Relevance 评测指标与失败模式排查。<br><br>
可在首页文章流或点击导航 <strong>05_Archive</strong> 直接阅读全文！`
    }
  ];

  // =========================================================================
  // 3. DOM Elements & State Management
  // =========================================================================
  const launcher = document.getElementById('aiAgentLauncher');
  const modal = document.getElementById('aiAgentModal');
  const closeBtn = document.getElementById('aiCloseBtn');
  const clearBtn = document.getElementById('aiClearBtn');
  const messagesContainer = document.getElementById('aiMessagesContainer');
  const inputForm = document.getElementById('aiInputForm');
  const inputField = document.getElementById('aiInputField');
  const quickPills = document.querySelectorAll('.quick-pill');

  let isTyping = false;
  let conversationHistory = []; // 维护多轮对话上下文历史

  function openModal() {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => inputField && inputField.focus(), 200);
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (launcher) launcher.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      conversationHistory = []; // 清空多轮对话记忆
      messagesContainer.innerHTML = `
        <div class="ai-msg ai-msg-assistant">
          <div class="ai-msg-avatar"><i class="fa fa-smile-o"></i></div>
          <div class="ai-msg-bubble font-editorial">
            对话已重置。我是 indexGin 空间小助手，随时为你解答关于博主背景、运筹算法、开源贡献或豆瓣书单的任何问题！
          </div>
        </div>
      `;
    });
  }

  // =========================================================================
  // 4. Remote Real LLM Fetcher (云端大模型接口 & Markdown 解析)
  // =========================================================================
  function renderMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 代码块 ```code```
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.35);padding:8px 10px;border-radius:6px;overflow-x:auto;margin:6px 0;font-family:monospace;font-size:12px;"><code>$1</code></pre>');
    // 行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.12);padding:2px 5px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>');
    // 粗体 **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *italic*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 链接 [title](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#c084fc;text-decoration:underline;">$1</a>');
    // 无序列表项 - item 或 * item
    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin-left:14px;list-style-type:disc;">$1</li>');
    // 换行
    html = html.replace(/\n\n+/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  async function callRemoteLLM(userQuery) {
    const config = AGENT_CONFIG.remoteConfig;
    if (!config.apiEndpoint) {
      throw new Error("No remote API endpoint configured");
    }

    // 记录用户消息至多轮对话历史
    conversationHistory.push({ role: "user", content: userQuery });

    // 保留最近 6 轮对话以维持上下文并控制 Token
    const recentHistory = conversationHistory.slice(-6);

    const payload = {
      model: config.model,
      messages: [
        { role: "system", content: config.systemPrompt },
        ...recentHistory
      ],
      stream: false
    };

    const headers = {
      "Content-Type": "application/json"
    };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.apiEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Remote API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "未能从大模型接收到有效回复。";

    // 记录助手回复至历史
    conversationHistory.push({ role: "assistant", content: reply });

    return reply;
  }

  // =========================================================================
  // 5. Query Matcher (离线本地语义匹配引擎)
  // =========================================================================
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

    // Default intelligent friendly fallback
    return `我收到了你关于 <strong>"${escapeHtml(query)}"</strong> 的提问！作为 indexGin 空间小助手，我建议你：<br><br>
• <strong>查阅 02_Projects</strong>：浏览开源高星项目（如 deer-flow、agno）与算法求解器；<br>
• <strong>查阅 03_Library</strong>：发现普鲁斯特《追忆似水年华》、荷马史诗等精选豆瓣书单与读书笔记；<br>
• <strong>查阅 04_Demos</strong>：亲自体验交互式旅行商 2-Opt 与单纯形算法沙盒；<br><br>
你也可以点击上方的快捷胶囊，或向我询问关于<em>“近期书单”、“开源贡献”、“关于博主”</em>等内容！`;
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

  // =========================================================================
  // 6. Message UI Renderer & Typewriter Streaming
  // =========================================================================
  function appendMessage(sender, htmlContent, isStreaming = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-msg ai-msg-${sender}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'ai-msg-avatar';
    avatarDiv.innerHTML = sender === 'user' ? '<i class="fa fa-user"></i>' : '<i class="fa fa-smile-o"></i>';

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

  async function streamAnswer(fullHtml) {
    isTyping = true;
    const bubble = appendMessage('assistant', '', true);

    bubble.innerHTML = fullHtml;
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateY(6px)';
    bubble.style.transition = 'all 0.25s ease';

    await new Promise(r => setTimeout(r, 50));
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateY(0)';

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    isTyping = false;
  }

  async function handleUserQuery(query) {
    const q = query.trim();
    if (!q || isTyping) return;

    appendMessage('user', escapeHtml(q));
    inputField.value = '';

    const typingPlaceholder = appendMessage('assistant', '<span class="ai-typing-dots"><span>.</span><span>.</span><span>.</span> 小助手思考中</span>');

    try {
      if (AGENT_CONFIG.useRemoteLLM) {
        const remoteAns = await callRemoteLLM(q);
        typingPlaceholder.parentElement.remove();
        streamAnswer(renderMarkdown(remoteAns));
      } else {
        setTimeout(() => {
          typingPlaceholder.parentElement.remove();
          const answer = matchAnswer(q);
          streamAnswer(answer);
        }, 320);
      }
    } catch (err) {
      console.warn("Remote LLM failed or not available, falling back to local engine:", err);
      typingPlaceholder.parentElement.remove();
      const fallbackAns = matchAnswer(q);
      streamAnswer(fallbackAns);
    }
  }

  if (inputForm) {
    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserQuery(inputField.value);
    });
  }

  quickPills.forEach(pill => {
    pill.addEventListener('click', function () {
      const q = this.getAttribute('data-query');
      if (q) {
        handleUserQuery(q);
      }
    });
  });

})();
