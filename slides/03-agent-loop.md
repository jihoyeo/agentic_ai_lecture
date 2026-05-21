---
marp: true
theme: default
paginate: true
header: "Agentic AI 워크샵 · Session 3"
footer: "에이전트 루프 · 기억 · 계획"
---

<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "" -->

# Session 3 — 에이전트 루프

## 추론 · 행동 · 관찰을 *반복*하기

`이론` 슬라이드 → `실습` Lab 3

---

# 지난 시간 복습

- 도구 = LLM이 호출하는 함수. 스키마로 알려준다.
- Function calling **한 바퀴**: 알려주기 → 결정 → 실행 → 돌려주기

<br>

> 그런데 — 도구를 **한 번** 부르면 끝나는 질문만 있을까요?

---

# 문제 — 한 번으로 끝나지 않는 질문

> "자족도가 가장 낮은 생활권을 찾고,
>  그 지역에서 통근 유출이 가장 많은 시군구를 알려줘"

이 질문 하나에 도구가 **두 번 이상** 필요합니다:

```
1) analyze_self_containment()      → 가장 낮은 곳 = 고양·파주 생활권
2) (그 결과를 보고) get_region_flows("고양시") → 최대 유출 시군구
```

> 1번의 **결과**를 알아야 2번을 부를 수 있다 → **반복**이 필요하다.

---

# 해법 — ReAct 패턴

> **Reason → Act → Observe** 를, 답이 나올 때까지 반복

| 단계 | 하는 일 |
|---|---|
| **Reason** (추론) | 지금 무엇이 필요한가? 도구를 부를까, 답할까? |
| **Act** (행동) | 도구를 호출한다 |
| **Observe** (관찰) | 도구 결과를 받아 메모리에 추가한다 |

<br>

이 세 단계를 한 번 도는 것이 **한 스텝(step)**.
모델이 "더 부를 도구 없음"이라 하면 멈추고 최종 답변.

---

# 에이전트 루프 — 의사코드

```python
messages = [{"role": "user", "content": question}]

for step in range(MAX_STEPS):
    reply = llm.generate_with_tools(messages, tools)   # ── Reason

    if not reply.wants_tool:          # 도구를 더 안 부른다 → 종료 조건
        return reply.text             #    최종 답변

    messages.append(assistant(reply.tool_calls))
    for call in reply.tool_calls:                      # ── Act
        result = call_tool(call.name, call.args)
        messages.append(tool_result(call, result))     # ── Observe
```

> Lab 3에서 이 루프를 **그대로** `Agent` 클래스로 만듭니다.

---

# 언제 멈출까? — 종료 조건

루프는 **반드시** 끝나야 합니다. 멈추는 경우는 두 가지:

```
정상 종료 :  모델이 도구를 더 부르지 않고, 텍스트 답변을 냈다
              → reply.wants_tool == False

강제 종료 :  스텝 수가 MAX_STEPS 에 도달했다
              → "단계 제한 초과" 로 마무리
```

- 정상 종료가 **기본**. 모델은 충분한 정보를 얻으면 스스로 답한다.
- 강제 종료는 **안전망**.

---

# 무한 루프 방지 — 최대 스텝

모델이 같은 도구를 계속 부르거나, 답을 못 내고 맴돌 수 있습니다.

```python
for step in range(MAX_STEPS):    # 예: MAX_STEPS = 6
    ...
# 루프를 빠져나왔다 = 제한 도달
return "단계 제한에 도달했습니다. 지금까지의 정보로 답하면 ..."
```

- `MAX_STEPS` 없이 `while True` 만 쓰면 — **비용 폭탄 + 멈추지 않는 에이전트**
- 모든 실무 에이전트 루프에는 이 상한선이 있다 (S4의 안전 주제와 연결).

---

# 메모리 ① — 대화 히스토리

에이전트의 기억은 거창하지 않습니다. **`messages` 리스트** 하나입니다.

```python
messages = [
  {"role": "user",      "content": "자족도 낮은 생활권은?"},
  {"role": "assistant", "tool_calls": [analyze_self_containment()]},
  {"role": "tool",      "content": "[{고양·파주: 0.79}, ...]"},
  {"role": "assistant", "content": "고양·파주 생활권입니다 ..."},
]
```

- 매 스텝 모델은 **이 리스트 전체**를 다시 본다 → 그래서 맥락을 "기억"한다.
- LLM 자체는 상태가 없다(stateless). 기억은 **우리가** 들고 다닌다.

---

# 메모리 ② — 도구 결과의 누적

관찰(Observe)은 곧 **도구 결과를 `messages` 에 쌓는 일**:

```
스텝 1:  analyze_self_containment() 호출
         → 결과를 'tool' 메시지로 append

스텝 2:  모델은 그 결과를 보고 다음을 결정
         get_region_flows("고양시") 호출
         → 결과를 또 append

스텝 3:  쌓인 정보가 충분 → 최종 답변
```

> 스텝이 진행될수록 메모리가 풍부해지고, 모델의 판단 근거가 늘어난다.

---

# 메모리 ③ — 컨텍스트 윈도우의 한계

`messages` 는 무한히 길어질 수 없습니다.

- 모델이 한 번에 볼 수 있는 토큰 양 = **컨텍스트 윈도우** (유한)
- 대화·도구 결과가 쌓이면 한계에 부딪힌다.

**관리 기법**
- 오래된 메시지 **요약**해서 압축
- 큰 도구 결과는 **핵심만** 추려 넣기 (도구가 간결히 반환하도록 설계)
- 정말 필요한 것만 메모리에 유지

> 이번 실습은 짧아 문제없지만, 개념은 알아 둡니다.

---

# 계획(Planning) — 큰 질문을 단계로 쪼개기

복잡한 질문일수록, 에이전트는 **작은 단계의 연쇄**로 푼다.

```
"부산 생활권과 서울 생활권 중 어디가 더 자족적이고,
 두 지역 사이 통행량은 얼마야?"

  → analyze_self_containment()        (두 곳의 자족도 비교)
  → get_inter_area_flows("부산..","서울..")  (두 지역 간 통행)
  → 두 결과를 종합해 답변
```

- 모델이 **스스로** 단계를 정한다 (우리가 순서를 코딩하지 않는다).
- 이것이 Workflow와 Agent의 차이 — 경로를 LLM이 정한다.

---

# 에러 처리 — 도구가 실패하면?

도구 호출은 실패할 수 있다 — 잘못된 인자, 없는 지역, 예외…

```python
result = call_tool(name, args)
# call_tool 은 예외를 raise 하지 않고 값으로 돌려준다:
#   {"error": "region not found: 강남시"}
messages.append(tool_result(call, result))   # 에러도 그대로 관찰
```

- 에러를 **메시지로** 모델에 보여주면, 모델이 읽고 **스스로 고쳐** 다시 시도한다.
  (예: `"강남시"` → `"강남구"` 로 바꿔 재호출)
- 루프를 죽이지 말고, 에러도 하나의 *관찰*로 다룬다.

---

# 사례 ① — mega-region-ai 의 루프

`AgentProvider.tsx` 의 실제 구조도 똑같은 루프입니다:

```
사용자 메시지 전송
   → LLM 응답을 스트리밍으로 받음
   → finish_reason 이 'tool_calls' 이면:
        도구 실행 → 결과를 히스토리에 append
        → 같은 함수를 다시 호출 (재귀)
   → finish_reason 이 'stop' 이면:
        최종 답변 표시 (종료)
```

> 우리 `for` 루프 = 그들의 재귀. **같은 패턴**입니다.

---

# 사례 ② — 두 개의 "루프"

```
DTUMOS 시뮬레이션 루프          에이전트 루프
─────────────────────         ─────────────────────
for t in 시간:                 for step in 스텝:
   수요 발생                       추론 (Reason)
   배차 결정                       행동 (Act)
   상태 갱신                       관찰 (Observe)
   지표 기록                       종료 조건 검사
```

- 둘 다 **"상태를 보고 → 행동하고 → 반복"** 하는 구조.
- 에이전트 루프는 *무엇을 할지* 를 LLM이 정한다는 점만 다르다.

---

# 오늘의 실습 — Lab 3

`labs/lab3_agent_loop.ipynb`

1. S2의 도구 + 루프를 하나의 **`Agent` 클래스**로 통합
2. **멀티스텝 질문** 풀기 — 도구가 연쇄 호출되는 과정 관찰
3. 대화 **메모리** 유지 · **`MAX_STEPS`** 안전망
4. `common/mini_sim.py`(미니 택시 시뮬레이터)를 **도구로 추가**
   → 에이전트가 데이터 분석 *그리고* 시뮬레이션까지 호출
5. 🔧 **TODO** — 종료 조건·에러 처리 보강

---

<!-- _footer: "" -->

# 정리 & 다음 시간

**오늘 배운 것**
- ReAct 루프: **추론 → 행동 → 관찰**, 종료 조건까지 반복
- 메모리 = `messages` 리스트. LLM은 stateless, 기억은 우리가 운반
- `MAX_STEPS` 안전망, 에러도 하나의 관찰로

**다음 시간 (S4) — 멀티에이전트 · RAG · MCP · 평가**
> 에이전트 하나로 부족할 때 — 더 크고, 더 안전하게 확장하는 법.

### → 이제 `Lab 3` 을 열어 주세요.
