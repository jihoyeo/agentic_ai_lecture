import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ── Gemini 채팅 프록시 ───────────────────────────────────────────────
// BUILD_SPEC §5: Gemini 키는 브라우저 코드에 절대 노출하지 않는다.
// 그래서 클라이언트는 Gemini 를 직접 부르지 않고, 같은 출처(localhost)의
// /api/chat 으로 요청한다. 이 미들웨어가 .env 의 키를 붙여 대신 호출한다.
function geminiProxyPlugin(env) {
  const MODEL = 'gemini-2.5-flash' // BUILD_SPEC §5 가 지정한 모델
  return {
    name: 'gemini-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'POST 만 허용됩니다.' }))
          return
        }
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          try {
            const key = env.GEMINI_API_KEY
            if (!key || key.startsWith('여기에')) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: '.env 에 GEMINI_API_KEY 가 설정되지 않았습니다.' }))
              return
            }
            // 클라이언트가 보낸 Gemini 요청 본문(systemInstruction + contents)을
            // 그대로 전달한다. 키만 서버에서 덧붙인다.
            const payload = JSON.parse(body || '{}')
            const url =
              `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
            const r = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const data = await r.json()
            res.statusCode = r.status
            res.end(JSON.stringify(data))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Gemini 호출 실패: ' + String(err) }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv 의 3번째 인자를 '' 로 주면 VITE_ 접두사가 없는 키도 읽는다.
  // (이 값은 서버 쪽 플러그인에서만 쓰고 클라이언트 번들에는 넣지 않는다.)
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), geminiProxyPlugin(env)],
    server: { port: 5173 },
  }
})
