// ── LLM 호출 한 번 (BUILD_SPEC §5) ───────────────────────────────
// 시스템 프롬프트 + contents + 도구 스키마를 묶어 Vite 프록시(/api/chat)로 보낸다.
// Gemini 키는 브라우저 코드에 노출되지 않는다.
//
// 에이전트 루프(여러 번 호출)는 agent.js 에 있다. 이 파일은 "한 번" 만 책임진다.

// 시스템 프롬프트는 *역할/원칙* 만 담는다. 데이터는 박지 않는다 — 데이터는 도구가 다룬다.
export const SYSTEM_PROMPT = `당신은 "수도권 통근 데이터 안내 도우미"입니다.
cities/flows 두 데이터에 대한 질문에 답하는 것이 당신의 유일한 임무입니다.

[원칙]
- 데이터에 없는 건 지어내지 않습니다. 모르는 건 모른다고 합니다.
- 데이터 조회·합계·최댓값은 반드시 제공된 도구를 호출해서 얻은 값을 인용합니다.
  머릿속으로 계산하거나 추측하지 않습니다.
- flows 는 방향이 있습니다. SEO→INC 와 INC→SEO 는 서로 다른 항목입니다.

[응답]
- 한국어, 2~4문장, 친근한 말투.
- 숫자를 답할 때는 그 값을 어떻게 얻었는지 한 줄로 함께 밝힙니다.
  예: "통근량이 가장 많은 구간은 서울→성남(540)입니다 — get_top_flows(1) 결과입니다."
- 사용자가 멀티스텝 질문(여러 도구가 필요한 질문)을 하면 도구를 순서대로 호출한 뒤
  마지막에 한 번에 정리해서 답합니다.`

/**
 * Gemini 호출 한 번.
 * @param {object} args
 * @param {Array} args.contents  Gemini 의 contents 배열 (role: 'user'|'model', parts)
 * @param {Array} args.tools     도구 스키마 배열. 비우면 도구 없이 호출.
 * @returns {Promise<object>}    Gemini 원본 응답 JSON
 */
export async function callGemini({ contents, tools }) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  if (tools && tools.length) {
    body.tools = [{ functionDeclarations: tools }]
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || data.error || 'Gemini 응답 오류')
  }
  return data
}
