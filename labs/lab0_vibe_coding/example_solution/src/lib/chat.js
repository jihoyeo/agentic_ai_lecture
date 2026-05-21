// ── AI 채팅 로직 ────────────────────────────────────────────────────
// 이 파일에 BUILD_SPEC §4 의 "AI Agent 요구사항" 이 모두 들어 있다.
//   1) buildSystemPrompt() — AI 의 역할·동작·응답 규칙(시스템 프롬프트)
//   2) askGemini()         — Gemini 호출 (Vite 프록시 /api/chat 경유)
//
// ※ lab1~lab5 에서 뜯어볼 "시스템 프롬프트 · LLM 호출 · 데이터 처리" 가
//    바로 이 파일이다.

import { buildStatsSummary } from './stats.js'

/**
 * 시스템 프롬프트를 만든다.
 * BUILD_SPEC §4-1~§4-3 의 역할·동작·응답 규칙을 그대로 글로 옮기고,
 * 거기에 데이터 전체(cities, flows)와 검증된 계산 결과를 함께 박아 넣는다.
 */
export function buildSystemPrompt(cities, flows) {
  const stats = buildStatsSummary(cities, flows)

  return `당신은 "수도권 통근 데이터 안내 도우미"입니다.
아래에 주어진 두 데이터(cities, flows)에 대한 질문에 답하는 것이 당신의 유일한 임무입니다.

[동작 규칙]
- 데이터에 그대로 있는 것을 물으면 → 데이터에서 찾아 바로 답합니다.
- 계산이 필요한 것을 물으면 → 데이터로 직접 계산해서 답합니다. 절대 추측하지 않습니다.
- 데이터에 없는 것을 물으면 → 모른다고 솔직히 말합니다. 지어내지 않습니다.
- flows 는 방향이 있습니다. SEO→INC 와 INC→SEO 는 서로 다른 항목입니다.

[응답 규칙]
- 항상 한국어로, 2~4문장으로 간결하게 답합니다.
- 숫자를 답할 때는 그 값을 어떻게 얻었는지 한 줄로 함께 밝힙니다.
  예: "서울로 들어오는 통근량은 총 4,040입니다 — 도착지가 서울인 17개 흐름의 합계입니다."
- 친근하고 쉬운 말투를 씁니다.

[도시 데이터 cities] (id, 한글이름, 위도, 경도)
${cities.map((c) => `${c.id} ${c.name_ko} (${c.lat}, ${c.lon})`).join('\n')}

[통근 흐름 데이터 flows] (출발 id → 도착 id : 통근량)
${flows.map((f) => `${f.origin}→${f.dest}: ${f.count}`).join('\n')}

[코드가 미리 계산해 둔 검증된 값] — 합계·최댓값 질문은 이 값을 신뢰해 인용하세요.
- 전체 흐름 개수: ${stats.flowCount}개
- 전체 통근량 합계: ${stats.totalCommuters.toLocaleString()}
- 통근량이 가장 많은 구간: ${stats.busiest.label} (${stats.busiest.count})
- 통근량이 가장 적은 구간: ${stats.quietest.label} (${stats.quietest.count})
- 도시별 통근량 (들어옴 inflow / 나감 outflow / 합계 total):
${stats.cityTotals
  .map(
    (c) =>
      `  ${c.name_ko}: inflow ${c.inflow}, outflow ${c.outflow}, total ${c.total}`,
  )
  .join('\n')}

위 데이터와 계산 값만 근거로 답하세요.`
}

/**
 * Gemini 에 질문하고 답변 텍스트를 돌려준다.
 * @param {string} systemPrompt  buildSystemPrompt() 의 결과
 * @param {Array<{role:'user'|'model', text:string}>} history  지금까지의 대화
 * @returns {Promise<string>} 모델의 답변 텍스트
 */
export async function askGemini(systemPrompt, history) {
  // Gemini REST 요청 형식으로 변환한다.
  const requestBody = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: history.map((m) => ({
      role: m.role, // 'user' 또는 'model'
      parts: [{ text: m.text }],
    })),
    generationConfig: {
      temperature: 0.2, // 데이터 질의응답이므로 낮게 — 일관된 답
      thinkingConfig: { thinkingBudget: 0 }, // 단순 조회/계산이라 추론 단계 생략 → 빠른 응답
    },
  }

  // Gemini 를 직접 부르지 않는다. 같은 출처의 프록시(/api/chat)로 보낸다.
  // → Gemini 키는 브라우저 코드 어디에도 나타나지 않는다 (BUILD_SPEC §5).
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error || 'Gemini 응답 오류')
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .join('')
  if (!text) throw new Error('Gemini 가 빈 응답을 보냈습니다.')
  return text.trim()
}
