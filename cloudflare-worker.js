/**
 * Cloudflare Worker Proxy for Zhipu AI (GLM-4-Flash)
 * 部署至 Cloudflare Workers，保护 API Key 并解决浏览器跨域 (CORS) 问题
 */

export default {
  async fetch(request, env) {
    // 1. 处理浏览器跨域预检请求 (CORS OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const body = await request.json();

      // 2. 将前端请求安全转发给智谱 AI 开放平台
      const upstreamRes = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.ZHIPU_API_KEY}` // 在 Worker Settings -> Variables 中添加 ZHIPU_API_KEY
        },
        body: JSON.stringify({
          model: body.model || "glm-4-flash",
          messages: body.messages || [
            { role: "user", content: body.userQuery || "你好" }
          ],
          stream: false
        })
      });

      const data = await upstreamRes.text();

      // 3. 返回智谱响应并附带 CORS 头
      return new Response(data, {
        status: upstreamRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
