// ── 채팅 패널 (BUILD_SPEC §4) ───────────────────────────────────────
// 오른쪽 35% 영역. 말풍선 + 입력창. Gemini 에 질문을 보내고 답을 받는다.

import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSystemPrompt, askGemini } from '../lib/chat.js'

// BUILD_SPEC §4-4 의 예시 대화 6개 — 데모용 추천 질문 칩
const SUGGESTIONS = [
  '서울에서 인천으로 가는 통근량은?',
  '데이터에 어떤 도시들이 있어?',
  '용인은 어디쯤이야?',
  '서울로 들어오는 통근량 총합은?',
  '통근량이 가장 많은 구간은?',
  '수원과 용인 사이 왕복 통근량은?',
]

const GREETING =
  '안녕하세요! 수도권 18개 도시의 통근 흐름 데이터를 안내해 드려요. 도시 간 통근량이나 합계·최댓값 같은 걸 물어보세요.'

export default function ChatPanel({ cities, flows, onHighlight }) {
  const [messages, setMessages] = useState([]) // {role:'user'|'model', text}
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  // 시스템 프롬프트는 데이터가 안 바뀌므로 한 번만 만든다.
  const systemPrompt = useMemo(
    () => buildSystemPrompt(cities, flows),
    [cities, flows],
  )

  // 새 메시지가 생기면 맨 아래로 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, loading])

  // 질문 글에 등장하는 도시를 찾아 지도에서 강조한다 (BUILD_SPEC §4-5 선택 기능)
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
    onHighlight(findMentionedCities(q)) // 지도 강조
    setInput('')

    const nextHistory = [...messages, { role: 'user', text: q }]
    setMessages(nextHistory)
    setLoading(true)

    try {
      const answer = await askGemini(systemPrompt, nextHistory)
      setMessages([...nextHistory, { role: 'model', text: answer }])
    } catch (err) {
      setError(String(err.message || err))
      setMessages(nextHistory) // 실패 시 사용자 질문은 남겨둔다
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="chat">
      <header className="chat__header">
        <h1>수도권 통근 도우미</h1>
        <p>도시 18개 · 통근 흐름 {flows.length}개 · Gemini 2.5 Flash</p>
      </header>

      <div className="chat__log" ref={scrollRef}>
        <Bubble role="model" text={GREETING} />

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.text} />
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

function Bubble({ role, text }) {
  return (
    <div className={`bubble bubble--${role}`}>
      {role === 'model' && <span className="bubble__tag">도우미</span>}
      <p>{text}</p>
    </div>
  )
}
