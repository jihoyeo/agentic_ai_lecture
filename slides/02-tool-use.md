---
marp: true
theme: default
paginate: true
header: "Agentic AI 워크샵 · Session 2"
footer: "도구 사용 (Tool Use)"
---

<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "" -->

# Session 2 — 도구 사용

## LLM이 "행동"하는 법: Function Calling

`이론` 슬라이드 → `실습` Lab 2

---

# 지난 시간 복습

- LLM은 텍스트 생성기 — 3가지 한계: **환각 · 멈춘 지식 · 행동 불가**
- 에이전트 = LLM + `Tools` + `Memory` + `Loop` + `Instructions`
- 오늘은 그중 **`Tools`** — 에이전트의 "손"

<br>

> Lab 1에서 우리는 LLM에게 *"어떤 도구를 부르면 좋을지"* 글로 쓰게 했습니다.
> 오늘은 그 제안을 **진짜 함수 호출**로 바꿉니다.

---

# 오늘의 질문

<br>

## LLM은 텍스트만 만드는데,<br>어떻게 데이터를 조회하고 계산할까?

<br>

답: LLM이 직접 하지 않습니다.
**"이 함수를 불러줘"** 라고 *요청* 하고, 실행은 **우리 코드**가 합니다.

---

# 핵심 아이디어 — 도구(Tool)

> **도구 = LLM이 호출할 수 있는, 우리가 만든 함수**

```python
def get_top_flows(n: int = 10):
    """통근 통행량 상위 N개 구간을 반환한다."""
    ...
    return [{"origin": "송파구", "dest": "강남구", "volume": 39457}, ...]
```

- 데이터 조회, 계산, 시뮬레이션 실행, 이메일 발송… 무엇이든 도구가 될 수 있다.
- LLM은 **"무엇을 부를지"** 정하고, 우리는 **"실제로 실행"** 한다.

> 이렇게 LLM의 한계 ③(행동 불가)이 사라집니다.

---

# Function Calling — 4단계

```
  ① 도구를 알려준다
     우리 → LLM :  "이런 도구들을 쓸 수 있어" (스키마 전달)

  ② LLM이 호출을 결정한다
     LLM → 우리 :  get_top_flows(n=5)
                   ↑ 일반 텍스트가 아닌 '구조화된 호출'

  ③ 우리가 실행한다
     우리       :  get_top_flows(5)  →  [{송파→강남: 39457}, ...]

  ④ 결과를 돌려준다
     우리 → LLM :  실행 결과 전달  →  LLM이 이를 근거로 최종 답변
```

> 한 번의 왕복 = ①②③④. 이번 실습에서 이 한 바퀴를 직접 돕니다.

---

# 1단계 — 도구 스키마 정의

LLM은 도구의 **코드**를 보지 않습니다. **스키마(설명서)** 만 봅니다.

```json
{
  "name": "get_top_flows",
  "description": "Return the N largest commute flows between sigungu.",
  "parameters": {
    "type": "object",
    "properties": {
      "n": { "type": "integer", "description": "How many flows to return." }
    },
    "required": []
  }
}
```

- `name` — 함수 이름 · `description` — **무슨 일을 하는가**
- `parameters` — 어떤 입력을 받는가 (JSON Schema 형식)

---

# JSON Schema 읽는 법

`parameters` 는 "이 도구가 받는 입력의 모양"을 적은 것:

```json
"parameters": {
  "type": "object",              ← 입력은 (키:값) 묶음이다
  "properties": {                ← 각 인자의 이름과 타입
    "query":   { "type": "string"  },
    "n":       { "type": "integer" },
    "include": { "type": "boolean" }
  },
  "required": ["query"]          ← 반드시 있어야 하는 인자
}
```

- 주요 타입: `string` · `integer` · `number` · `boolean` · `array` · `object`
- `description` 은 사람이 아니라 **LLM이 읽는 안내문** — 자세할수록 좋다.

---

# 2단계 — 모델이 "호출을 결정"한다

스키마를 받은 모델은, 질문에 따라 **도구 호출**로 응답할 수 있습니다.

```
사용자: "통행량이 가장 많은 5개 구간 알려줘"

모델의 응답  ─ 일반 텍스트가 아니라 ─▶  tool_call:
                                       name = "get_top_flows"
                                       args = { "n": 5 }
```

- 모델은 질문을 보고 **어떤 도구를, 어떤 인자로** 부를지 스스로 정한다.
- 우리 코드는 이 `tool_call` 을 받아 다음 단계로 넘어간다.

---

# ⚠️ 가장 흔한 오해

<br>

## "LLM이 내 함수를 실행한다" — ❌ 아니다

<br>

- LLM은 **"이 함수를 이 인자로 불러줘"** 라고 *말할* 뿐이다.
- 실제 실행(`get_top_flows(5)`)은 **우리 Python 코드**가 한다.
- 그래서 우리는 실행 전에 **검증·제한**을 걸 수 있다 (S4의 안전 주제).

> LLM = 두뇌(무엇을 할지 결정) · 우리 코드 = 손(실제로 실행)

---

# 3단계 & 4단계 — 실행하고 돌려주기

```
③ 우리 코드가 실행
     name="get_top_flows", args={"n":5}
        → get_top_flows(n=5)
        → [{"origin":"송파구","dest":"강남구","volume":39457}, ...]

④ 결과를 'tool' 메시지로 모델에 전달
     모델은 이 결과를 근거로 최종 답변을 생성:
     "통근 통행이 가장 많은 구간은 송파구→강남구로,
      하루 약 39,457명입니다. ..."
```

> 모델은 이제 **추측이 아니라 실제 데이터**로 답한다 — 환각이 줄어든다.

---

# 좋은 도구 설계 원칙

모델은 `description` 만 보고 도구를 고른다 — 설계가 곧 성능이다.

| 원칙 | 이유 |
|---|---|
| 이름·설명을 **명확히** | 모델이 언제 쓸지 판단하는 근거 |
| 파라미터는 **적게**, 타입은 **분명히** | 모델이 인자를 틀릴 여지를 줄임 |
| 결과는 **간결하게** | 컨텍스트(토큰) 절약 |
| 에러는 **값으로 반환** (raise ❌) | 에이전트가 읽고 스스로 복구 |

> 우리 `tools.py` 의 `call_tool()` 은 에러를 `{"error": ...}` 로 돌려준다.

---

# 사례 ① — mega-region-ai 의 도구들

이 연구의 에이전트는 **13개**의 도메인 도구를 가진다:

```
get_top_flows           통행량 상위 구간
get_flow_statistics     통행량 통계
analyze_self_containment 생활권 자족도 분석
get_inter_area_flows    생활권 간 통행
search_region           지역 검색
set_visualization_params 지도 시각화 제어
...
```

> 우리 `common/tools.py` 는 이 중 핵심 5개를 Python으로 재현했습니다.
> 실습에서 직접 들여다봅니다.

---

# 사례 ② — DTUMOS 의 `run_simulation`

DTUMOS 에이전트의 핵심 도구 하나는 **시뮬레이션 실행**:

```json
{
  "name": "run_simulation",
  "description": "Run a mobility simulation.",
  "parameters": { "type": "object", "properties": {
    "city":          { "type": "string" },
    "fleet_size":    { "type": "integer" },
    "dispatch_mode": { "type": "string",
                       "enum": ["in_order", "optimization"] }
  }}}
```

- `"대전에서 택시 50대로…"` → 모델이 이 스키마에 맞춰 인자를 채운다.
- `enum` — 허용된 값만 받도록 제한 (잘못된 입력 방지).

---

# 오늘의 실습 — Lab 2

`labs/lab2_tool_use.ipynb`

1. `labs/data/` 의 통근 OD·생활권 데이터 살펴보기
2. `common/tools.py` 의 분석 도구 3종 읽기
   `get_top_flows` · `analyze_self_containment` · `search_region`
3. 각 도구의 **JSON 스키마**를 직접 작성
4. Function calling **한 바퀴** 돌리기 (①→②→③→④)
5. 🔧 **TODO** — `get_inter_area_flows` 도구를 스키마부터 추가

> 키가 없으면 `MockLLM` 이 도구를 골라 줍니다 — 메커니즘은 동일합니다.

---

<!-- _footer: "" -->

# 정리 & 다음 시간

**오늘 배운 것**
- 도구 = LLM이 호출할 수 있는 함수. **스키마**로 알려준다.
- Function calling 4단계: 알려주기 → 결정 → 실행 → 돌려주기
- LLM은 *결정*만, 실행은 *우리 코드* — 한계 ③ 해결

**다음 시간 (S3) — 에이전트 루프**
> 도구 한 번으로 끝나지 않는 질문은?
> **추론 → 행동 → 관찰** 을 *반복*하는 에이전트를 직접 만듭니다.

### → 이제 `Lab 2` 를 열어 주세요.
