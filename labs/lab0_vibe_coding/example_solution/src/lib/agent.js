// ── 에이전트 루프 (BUILD_SPEC §4-3) ─────────────────────────────
// 의사코드:
//   user → LLM → (functionCall? 도구 실행 → 결과 붙여 다시 LLM : text → 끝)
// 안전망: MAX_STEPS 회 안에 끝나지 않으면 도구 없이 한 번 더 호출해 최선의 답을 받는다.

import { callGemini } from './chat.js'
import { TOOL_DECLARATIONS, TOOLBOX } from './tools.js'

const MAX_STEPS = 6

/** Gemini 응답에서 텍스트와 functionCall 들을 뽑아낸다. */
function parseReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts || []
  const text = parts.map((p) => p.text).filter(Boolean).join('')
  const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall)
  return { text, calls }
}

/** 도구 하나 실행. 에러는 *던지지 않고* 결과로 돌려준다 — 모델이 보고 복구할 수 있게. */
function runTool(name, args) {
  const fn = TOOLBOX[name]
  if (!fn) return { error: `unknown tool: ${name}` }
  try {
    return fn(args || {})
  } catch (e) {
    return { error: `${e.name}: ${e.message}` }
  }
}

/**
 * 에이전트 루프. 한 번 호출하면 한 사용자 질문을 끝까지 처리한다.
 *
 * @param {string} question      이번 사용자 질문
 * @param {Array}  history       이전 대화의 contents (멀티턴 유지용; 처음엔 [])
 * @returns {Promise<{text, trace, history}>}
 *           text    : 최종 답변 텍스트
 *           trace   : 부른 도구들의 기록 [{name, args, result}, …]
 *           history : 다음 턴에 그대로 넘길 누적 contents
 */
export async function runAgent(question, history = []) {
  const contents = [
    ...history,
    { role: 'user', parts: [{ text: question }] },
  ]
  const trace = []

  for (let step = 0; step < MAX_STEPS; step++) {
    const data = await callGemini({ contents, tools: TOOL_DECLARATIONS })
    const { text, calls } = parseReply(data)

    // 도구를 더 안 부르면 끝
    if (calls.length === 0) {
      contents.push({ role: 'model', parts: [{ text }] })
      return { text, trace, history: contents }
    }

    // 모델 턴 기록 (functionCall 들)
    contents.push({
      role: 'model',
      parts: calls.map((c) => ({ functionCall: c })),
    })

    // 도구를 모두 실행하고 결과를 functionResponse 로 붙임
    for (const c of calls) {
      const result = runTool(c.name, c.args)
      trace.push({ name: c.name, args: c.args || {}, result })
      contents.push({
        role: 'user',
        parts: [
          { functionResponse: { name: c.name, response: { result } } },
        ],
      })
    }
  }

  // 안전망: 도구 없이 한 번 더 호출
  const finalData = await callGemini({ contents, tools: [] })
  const { text } = parseReply(finalData)
  const finalText = text || '(최대 스텝에 도달했습니다.)'
  contents.push({ role: 'model', parts: [{ text: finalText }] })
  return { text: finalText, trace, history: contents }
}
