// ── 채팅 패널 (BUILD_SPEC §4) ───────────────────────────────────────
// 오른쪽 35% 영역. 말풍선 + 입력창. runAgent() 가 도구 호출 루프까지 처리한다.

import { useEffect, useRef, useState } from 'react'
import { runAgent } from '../lib/agent.js'

// BUILD_SPEC §4-4 검증 대화 — 데모용 추천 질문 칩
const SUGGESTIONS = [
  '서울에서 인천으로 가는 통근량은?',
  '데이터에 어떤 도시들이 있어?',
  '용인은 어디쯤이야?',
  '서울로 들어오는 통근량 총합은?',
  '통근량이 가장 많은 구간은?',
  '수원과 용인 사이 왕복 통근량은?',
  '가장 많은 구간을 찾고, 그 두 도시 왕복도 알려줘', // 멀티스텝
]

const GREETING =
  '안녕하세요! 수도권 18개 도시의 통근 흐름 데이터를 안내해 드려요. ' +
  '도시 간 통근량이나 합계·최댓값 같은 걸 물어보세요.'

export default function ChatPanel({ cities, flows, onHighlight }) {
  // 표시용 메시지: [{role:'user'|'model', text, trace?}]
  const [messages, setMessages] = useState([])
  // Gemini contents (멀티턴 유지용)
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, loading])

  // 질문 글에 등장하는 도시를 지도에서 강조 (BUILD_SPEC §4-5)
  function findMentionedCities(text) {
    const lower = text.toLowerCase()
    return cities
      .filter(
        (c) =>
          text.includes(c.name_ko) ||
          lower.includes(c.name.toLowerCase()) ||
          lower.includes(c.id.toLowerCase()),
      )
      .map((c) => c.id)
  }

  async function send(question) {
    const q = question.trim()
    if (!q || loading) return

    setError(null)
    onHighlight(findMentionedCities(q))
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)

    try {
      const result = await runAgent(q, history)
      setHistory(result.history)
      setMessages((m) => [
        ...m,
        { role: 'model', text: result.text, trace: result.trace },
      ])
      // 답변에 도구가 반환한 도시 id 가 있으면 추가로 강조
      const idsFromTools = result.trace
        .flatMap((t) => extractCityIds(t.result))
        .filter(Boolean)
      if (idsFromTools.length) onHighlight(idsFromTools)
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="chat">
      <header className="chat__header">
        <h1>수도권 통근 도우미</h1>
        <p>도시 18개 · 통근 흐름 {flows.length}개 · Gemini 2.5 Flash · tool use + agent loop</p>
      </header>

      <div className="chat__log" ref={scrollRef}>
        <Bubble role="model" text={GREETING} />

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.text} trace={m.trace} />
        ))}

        {loading && (
          <div className="bubble bubble--model">
            <span className="typing">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>
        )}

        {error && <div className="chat__error">⚠️ {error}</div>}
      </div>

      {messages.length === 0 && (
        <div className="chat__suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={loading}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat__form"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          type="text"
          value={input}
          placeholder="통근 데이터에 대해 물어보세요…"
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          전송
        </button>
      </form>
    </aside>
  )
}

// 도구 반환값에 들어 있는 city id 들을 회수해 지도 강조에 쓴다.
function extractCityIds(result) {
  if (!result || typeof result !== 'object') return []
  if (Array.isArray(result)) return result.flatMap(extractCityIds)
  const ids = []
  for (const k of ['id', 'city', 'origin', 'dest']) {
    if (typeof result[k] === 'string') ids.push(result[k])
  }
  return ids
}

function Bubble({ role, text, trace }) {
  return (
    <div className={`bubble bubble--${role}`}>
      {role === 'model' && <span className="bubble__tag">도우미</span>}
      <p>{text}</p>
      {trace && trace.length > 0 && (
        <details className="bubble__trace">
          <summary>🛠 도구 호출 {trace.length}회</summary>
          {trace.map((t, i) => (
            <div key={i} className="bubble__trace-row">
              <code>
                {t.name}({JSON.stringify(t.args)})
              </code>{' '}
              →{' '}
              <code>{JSON.stringify(t.result)}</code>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
