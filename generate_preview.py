import os
import glob
import re
import yaml

with open('_config.yml', 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

# Load library data
with open('_data/library.yml', 'r', encoding='utf-8') as f:
    library_data = yaml.safe_load(f)

# Load posts
posts = []
for pfile in sorted(glob.glob('_posts/*.md'), reverse=True):
    with open(pfile, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    parts = text.split('---')
    if len(parts) >= 3:
        fm_text = parts[1]
        content_text = '---'.join(parts[2:])
        try:
            data = yaml.safe_load(fm_text) or {}
            data['content'] = content_text
            # generate sample url
            basename = os.path.basename(pfile).replace('.md', '.html')
            data['url'] = '/posts/' + basename
            posts.append(data)
        except Exception as e:
            print("Error parsing", pfile, e)

print(f"Loaded {len(posts)} posts and {len(library_data)} books.")

# Let's inspect the first 6 posts (page 1)
page_posts = posts[:6]
total_posts = len(posts)

# Create rendered HTML simulating Jekyll
with open('index.html', 'r', encoding='utf-8') as f:
    index_tpl = f.read()

# Remove front matter
index_body = index_tpl.split('---')[2]

# Let's write a small script that replaces liquid tags with realistic HTML for preview
preview_html = f"""<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>indexGin's Space | Butterfly Theme Preview</title>
    <link rel="stylesheet" href="./css/bootstrap.min.css">
    <link rel="stylesheet" href="./css/hux-blog.min.css">
    <link rel="stylesheet" href="./css/custom-modern.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Theme switcher test button -->
    <div style="position:fixed; bottom:20px; right:20px; z-index:99999; display:flex; gap:10px;">
        <button onclick="toggleTheme()" style="padding:10px 16px; border-radius:30px; background:#7c3aed; color:#fff; border:none; box-shadow:0 4px 14px rgba(0,0,0,0.3); font-weight:bold; cursor:pointer;">
            🌓 切换浅色/深色模式
        </button>
    </div>
    <script>
        function toggleTheme() {{
            var curr = document.documentElement.getAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', curr === 'dark' ? 'light' : 'dark');
        }}
    </script>
"""

# Include Nav
with open('_includes/nav.html', 'r', encoding='utf-8') as f:
    nav_html = f.read()
# Replace basic liquid in nav
nav_html = nav_html.replace('{{ site.baseurl }}', '.')
nav_html = nav_html.replace('{{ site.github_username }}', 'indexGin')
preview_html += nav_html

# Build posts HTML
posts_html = ""
default_covers = [
    "img/post-bg-digital-native.jpg",
    "img/post-bg-unix-linux.jpg",
    "img/post-bg-os-metro.jpg",
    "img/post-bg-universe.jpg",
    "img/home-bg.jpg",
    "img/post-bg-e2e-ux.jpg"
]

for idx, p in enumerate(page_posts):
    mod = idx % 2
    direction = "left" if mod == 0 else "right"
    cover = p.get('header-img') or p.get('cover') or default_covers[idx % len(default_covers)]
    sticky_badge = '<span class="post-sticky-badge font-mono"><i class="fa fa-thumb-tack"></i> 置顶精选</span>' if idx == 0 else ''
    
    # Excerpt cleanup
    content_raw = re.sub(r'<[^>]+>', '', p.get('content', ''))
    content_raw = re.sub(r'#+\s+[^\n]+', '', content_raw)
    content_raw = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content_raw).strip()
    excerpt = content_raw[:110] + '...' if len(content_raw) > 110 else content_raw

    subtitle_p = f'<p class="post-desc-subtitle font-mono">{p.get("subtitle")}</p>' if p.get('subtitle') else ''
    
    tags_html = ""
    for t in (p.get('tags') or [])[:3]:
        tags_html += f'<span class="post-tag-pill">#{t}</span>'
        
    date_str = str(p.get('date', '2026-10-23'))[:10]

    posts_html += f"""
    <article class="recent-post-item">
        <div class="recent-post-content {direction}">
            <div class="recent-post-cover">
                <a href="{p.get('url', '#')}" title="{p.get('title')}">
                    <img src="./{cover}" alt="{p.get('title')}" class="article-cover" loading="lazy">
                </a>
                {sticky_badge}
            </div>
            <div class="recent-post-info">
                <a class="article-title font-editorial" href="{p.get('url', '#')}" title="{p.get('title')}">
                    {p.get('title')}
                </a>
                <div class="recent-post-meta font-mono">
                    <span class="meta-item">
                        <i class="fa fa-calendar"></i>
                        <time datetime="{date_str}">{date_str}</time>
                    </span>
                    <span class="meta-separator">|</span>
                    <span class="meta-item">
                        <i class="fa fa-tags"></i>
                        <span>{(p.get('tags') or ['AI'])[0]}</span>
                    </span>
                    <span class="meta-separator">|</span>
                    <span class="meta-item">
                        <i class="fa fa-clock-o"></i>
                        <span>5 分钟</span>
                    </span>
                </div>
                <div class="article-content-text">
                    {subtitle_p}
                    <p class="post-desc-excerpt font-editorial">
                        {excerpt}
                    </p>
                </div>
                <div class="recent-post-footer">
                    <div class="recent-post-tags font-mono">
                        {tags_html}
                    </div>
                    <a href="{p.get('url', '#')}" class="read-more-link font-mono">
                        阅读全文 <i class="fa fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>
    </article>
    """

# Build Books HTML
books_html = ""
for b in library_data[:4]:
    cover = b.get('cover', '')
    if cover.startswith('/'):
        cover = '.' + cover
    books_html += f"""
    <a href="{b.get('douban_url', '#')}" target="_blank" rel="noopener noreferrer" class="mini-book-card" title="{b.get('title')}">
        <div class="mini-book-cover-wrap">
            <img src="{cover}" alt="{b.get('title')}" class="mini-cover-thumb">
        </div>
        <h5 class="mini-title font-editorial">{b.get('title')}</h5>
        <span class="mini-author font-mono">{b.get('author')}</span>
    </a>
    """

# Insert into template structure
rendered_body = f"""
<header id="page-header" class="full_page">
    <div id="site-info">
        <div class="hero-status-pill font-mono">
            <span class="status-indicator-dot"></span>
            <span>AI &amp; OPERATIONS RESEARCH // INDEXGIN'S SPACE</span>
        </div>
        <h1 id="site-title" class="font-editorial">indexGin</h1>
        <div id="site-subtitle">
            <span id="subtitle" class="typed-text"></span>
            <span class="typed-cursor">|</span>
        </div>
        <div id="site_social_icons">
            <a href="https://github.com/indexGin" target="_blank" rel="noopener" title="GitHub @indexGin" class="social-icon">
                <i class="fa fa-github"></i>
            </a>
            <a href="mailto:indexGin@example.com" title="Email 博主" class="social-icon">
                <i class="fa fa-envelope-o"></i>
            </a>
            <a href="./about/" title="关于博主" class="social-icon">
                <i class="fa fa-user-circle-o"></i>
            </a>
            <a href="./archive/" title="归档日志" class="social-icon">
                <i class="fa fa-archive"></i>
            </a>
            <a href="./library/" title="数字书架" class="social-icon">
                <i class="fa fa-book"></i>
            </a>
        </div>
    </div>
    <div id="scroll-down" title="向下滚动浏览文章">
        <i class="fa fa-angle-down scroll-down-effects"></i>
    </div>
</header>

<div id="content-inner" class="butterfly-container">
    <main class="butterfly-recent-posts">
        <div class="butterfly-feed-bar">
            <div class="butterfly-feed-title font-mono">
                <i class="fa fa-newspaper-o"></i>
                <span>最新博文与研究记录 // ARTICLES</span>
            </div>
            <span class="butterfly-feed-count font-mono">{total_posts} 篇日志</span>
        </div>

        <div class="recent-posts-stream">
            {posts_html}
        </div>

        <nav id="pagination" class="butterfly-pagination font-mono" aria-label="分页导航">
            <div class="pagination-track">
                <span class="page-prev-btn disabled"><i class="fa fa-chevron-left"></i></span>
                <span class="page-number current">1</span>
                <a href="#page-2" class="page-number">2</a>
                <a href="#page-2" class="page-next-btn" title="下一页"><i class="fa fa-chevron-right"></i></a>
            </div>
            <div class="pagination-info">
                第 1 / 2 页 · 共 {total_posts} 篇研究日志
            </div>
        </nav>
    </main>

    <aside id="aside-content" class="butterfly-aside">
        <div class="card-widget card-info">
            <div class="card-info-avatar">
                <div class="avatar-img">
                    <img src="https://github.com/indexGin.png" alt="indexGin" onerror="this.onerror=null;this.src='./img/avatar.png';">
                </div>
                <div class="author-status-box" title="当前状态">
                    <div class="author-status font-mono">
                        <span class="status-emoji">💡</span>
                        <span class="status-text">LLM4OR &amp; Multi-Agent</span>
                    </div>
                </div>
            </div>
            <div class="author-info__name font-mono">indexGin</div>
            <div class="author-info__description">
                专注于大模型运筹自动建模、形式化验证与智能体系统。追求数学严谨与工程落地的共鸣。
            </div>
            <div class="card-info-data font-mono">
                <a href="./archive/" title="查看全部日志">
                    <div class="headline">文章</div>
                    <div class="length-num">{total_posts}</div>
                </a>
                <a href="./archive/?tag=all" title="查看所有标签">
                    <div class="headline">标签</div>
                    <div class="length-num">14</div>
                </a>
                <a href="./library/" title="进入数字书架">
                    <div class="headline">在读</div>
                    <div class="length-num">{len(library_data)}</div>
                </a>
            </div>
            <a href="https://github.com/indexGin" id="card-info-btn" target="_blank" rel="noopener" class="font-mono">
                <i class="fa fa-github"></i>
                <span>前往 GitHub</span>
                <i class="fa fa-arrow-right"></i>
            </a>
            <div class="card-info-social-icons">
                <a href="https://github.com/indexGin" target="_blank" class="social-icon-sm" title="GitHub @indexGin">
                    <i class="fa fa-github"></i>
                </a>
                <a href="mailto:test@example.com" class="social-icon-sm" title="邮箱联系">
                    <i class="fa fa-envelope-o"></i>
                </a>
                <a href="./about/" class="social-icon-sm" title="关于博主">
                    <i class="fa fa-user-circle-o"></i>
                </a>
                <a href="./library/" class="social-icon-sm" title="数字书架">
                    <i class="fa fa-book"></i>
                </a>
            </div>
        </div>

        <div class="card-widget card-announcement">
            <div class="item-headline font-mono">
                <i class="fa fa-bullhorn"></i>
                <span>公告栏 // BULLETIN</span>
            </div>
            <div class="announcement_content">
                <p>👋 欢迎来到 <strong class="announcement-highlight">indexGin's Space</strong>！</p>
                <p>本站聚焦大语言模型 (LLM)、运筹优化 (OR) 与智能体系统的交叉融合，持续记录学术笔记与真实开源沉淀。</p>
                <div class="announcement-tags-row font-mono">
                    <span class="announcement-badge">⚡ LLM4OR</span>
                    <span class="announcement-badge">🤖 Multi-Agent</span>
                    <span class="announcement-badge">🛠️ OSS</span>
                </div>
            </div>
        </div>

        <div class="sticky_layout">
            <div class="card-widget card-oss">
                <div class="item-headline font-mono">
                    <i class="fa fa-code-fork"></i>
                    <span>开源贡献 // UPSTREAM PRs</span>
                </div>
                <div class="oss-widget-list">
                    <a href="https://github.com/bytedance/deer-flow" target="_blank" rel="noopener noreferrer" class="oss-widget-item">
                        <div class="oss-item-top font-mono">
                            <span class="oss-repo-name"><i class="fa fa-github"></i> deer-flow</span>
                            <span class="badge-star"><i class="fa fa-star"></i> 84k★</span>
                        </div>
                        <p class="oss-item-brief">字节跳动开源长程自主智能体平台，贡献 3 个已合并核心 PR。</p>
                        <div class="oss-item-bottom font-mono">
                            <span class="badge-merged"><i class="fa fa-check"></i> 3 Merged PRs</span>
                        </div>
                    </a>

                    <a href="https://github.com/agno-agi/agno" target="_blank" rel="noopener noreferrer" class="oss-widget-item">
                        <div class="oss-item-top font-mono">
                            <span class="oss-repo-name"><i class="fa fa-github"></i> agno</span>
                            <span class="badge-star"><i class="fa fa-star"></i> 42k★</span>
                        </div>
                        <p class="oss-item-brief">高并发轻量级 Multi-modal Agent 框架异步调度优化。</p>
                        <div class="oss-item-bottom font-mono">
                            <span class="badge-merged"><i class="fa fa-check"></i> Merged PR</span>
                        </div>
                    </a>

                    <a href="https://github.com/Kludex/starlette" target="_blank" rel="noopener noreferrer" class="oss-widget-item">
                        <div class="oss-item-top font-mono">
                            <span class="oss-repo-name"><i class="fa fa-github"></i> starlette</span>
                            <span class="badge-star"><i class="fa fa-star"></i> 12k★</span>
                        </div>
                        <p class="oss-item-brief">Python 生态 ASGI 高性能异步 Web 核心框架路由参数解析。</p>
                        <div class="oss-item-bottom font-mono">
                            <span class="badge-merged"><i class="fa fa-check"></i> Merged PR</span>
                        </div>
                    </a>
                </div>
                <div class="card-more-footer font-mono">
                    <a href="./projects/">
                        查看全部项目与算法工具集 <i class="fa fa-angle-right"></i>
                    </a>
                </div>
            </div>

            <div class="card-widget card-reading">
                <div class="item-headline font-mono">
                    <i class="fa fa-book"></i>
                    <span>近期在读 // READING</span>
                </div>
                <div class="mini-books-grid">
                    {books_html}
                </div>
                <div class="card-more-footer font-mono">
                    <a href="./library/">
                        进入完整数字书架 <i class="fa fa-angle-right"></i>
                    </a>
                </div>
            </div>
        </div>
    </aside>
</div>

<script>
(function() {{
    var subtitleElem = document.getElementById('subtitle');
    if (subtitleElem) {{
        var phrases = [
            "聚焦大语言模型 (LLM)、运筹优化 (OR) 与 Multi-Agent 系统",
            "从 AI Coding 到 AI Workflow：工程沉淀与能力闭环",
            "追求数学严谨与工程落地的学术技术空间",
            "运筹自动建模 · 双向形式化验证 · 离散制造调度"
        ];
        var phraseIdx = 0;
        var charIdx = 0;
        var isDeleting = false;
        var typeSpeed = 90;

        function typeLoop() {{
            var current = phrases[phraseIdx];
            if (isDeleting) {{
                subtitleElem.textContent = current.substring(0, charIdx - 1);
                charIdx--;
                typeSpeed = 35;
            }} else {{
                subtitleElem.textContent = current.substring(0, charIdx + 1);
                charIdx++;
                typeSpeed = 80;
            }}

            if (!isDeleting && charIdx === current.length) {{
                isDeleting = true;
                typeSpeed = 2200;
            }} else if (isDeleting && charIdx === 0) {{
                isDeleting = false;
                phraseIdx = (phraseIdx + 1) % phrases.length;
                typeSpeed = 400;
            }}

            setTimeout(typeLoop, typeSpeed);
        }}

        typeLoop();
    }}

    var scrollBtn = document.getElementById('scroll-down');
    if (scrollBtn) {{
        scrollBtn.addEventListener('click', function() {{
            var target = document.getElementById('content-inner');
            if (target) {{
                target.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
            }}
        }});
    }}
}})();
</script>
</body>
</html>
"""

preview_html += rendered_body

with open('preview_butterfly.html', 'w', encoding='utf-8') as f:
    f.write(preview_html)

print("Generated preview_butterfly.html successfully!")
