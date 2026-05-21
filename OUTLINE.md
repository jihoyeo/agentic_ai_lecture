# Agentic AI 워크샵 — 전체 계획 및 아웃라인

> 이 문서는 워크샵의 **설계도**입니다. 어떤 슬라이드와 어떤 실습 코드를 만들지,
> 이론과 실습이 어떻게 연결되는지를 정리합니다. 실제 슬라이드(`slides/`)와
> 실습(`labs/`)을 작성하기 전에 이 아웃라인을 먼저 확정합니다.

---

## 1. 강의 개요

| 항목 | 내용 |
|---|---|
| 주제 | Agentic AI — LLM을 "행동하는 에이전트"로 만드는 핵심 개념과 구현 |
| 대상 | 학부생 (Python 기초 — 함수·리스트·딕셔너리 정도면 충분) |
| 선수지식 | Python 기초, JSON에 대한 약간의 친숙함. **ML/딥러닝 배경 불필요** |
| 분량 | 집중 워크샵 — **Session 0(바이브 코딩) + 핵심 4세션 + 선택 캡스톤** (세션당 약 3시간) |
| 실습 스택 | **Python 전용**. LLM은 **무료 티어**(Google Gemini) 사용 |
| 자료 언어 | 슬라이드 본문 = 한국어 / 코드·주석 = 영어 |

### 학습 목표
이 워크샵을 마치면 학생은 다음을 할 수 있습니다.
1. LLM과 "에이전트"의 차이를 설명하고, 에이전트의 5가지 구성요소를 안다.
2. 도구(tool)를 직접 정의하고 function calling으로 LLM과 연결한다.
3. 추론–행동–관찰 루프를 가진 멀티스텝 에이전트를 처음부터 구현한다.
4. 멀티 에이전트·RAG·MCP·평가·안전 같은 확장 개념을 이해하고 적용한다.

---

## 2. 설계 원칙

- **이론과 실습의 분리 + 연결.** 슬라이드(`slides/`)와 실습(`labs/`)은 폴더부터
  분리한다. 동시에 각 슬라이드는 끝에 "오늘의 실습 미리보기"를, 각 실습 노트북은
  첫머리에 "이론 복습"을 두어 1:1로 연결한다 (→ §6 매핑 표).
- **프레임워크 없이 먼저, 그다음 실제 사례.** LangChain·LangGraph 같은 프레임워크
  없이 raw API와 직접 작성한 루프로 메커니즘을 먼저 이해한다. 그런 다음 "실제 연구
  프로젝트는 이렇게 한다"며 두 연구 코드를 *참조*로 보여준다.
- **하나의 러닝 예제.** 첫 세션부터 캡스톤까지 **"모빌리티 분석 에이전트"** 하나를
  점진적으로 키운다. 매 세션 도구가 늘고 루프가 깊어진다.
- **자체 포함(self-contained).** 연구 레포가 없어도 실습이 돌아가도록, 두 연구
  데이터를 추출·축소한 소형 데이터셋을 `labs/data/`에 동봉한다.
- **API 키 없어도 동작.** 핵심 루프는 `MockLLM`(가짜 LLM)으로 끝까지 실행된다.
  무료 키가 있으면 실제 호출로 전환한다.

---

## 3. 두 연구 사례 (러닝 예제의 원천)

워크샵 내내 두 연구 프로젝트가 예제·데이터·"실제 코드 참조"로 자연스럽게 등장한다.

### DTUMOS — 도시 모빌리티 디지털 트윈
도시의 택시·대중교통을 시뮬레이션해 정책을 미리 검증하는 Python 시스템.
배차 최적화, 수단선택 모델, 그리고 **LangGraph 기반 에이전트**(자연어로 시뮬레이션
실행)와 **MCP 서버**를 갖고 있다.
→ 워크샵에서: *미니 시뮬레이터*(`mini_sim.py`)의 원형, `run_simulation` 도구
스키마, orchestrator/interpreter 멀티 에이전트, MCP, mock LLM 테스트의 참조.

### mega-region-ai — 메가리전(생활권) 분석 플랫폼
통신사 통근 OD 데이터로 한국의 "생활권"(행정경계가 아닌 실제 생활권)을 분석하는
플랫폼. **13개 도메인 도구 + 스트리밍 tool-use 루프**를 가진 에이전트가 핵심.
→ 워크샵에서: *분석 도구*(`tools.py`)와 *데이터셋*의 원천, 스트리밍 재귀
에이전트 루프의 참조.

---

## 4. 전체 커리큘럼

세션당 ≈ 3시간 (이론 ~1h + 실습 ~1.5h + Q&A/버퍼). 슬라이드와 실습은 1:1 대응.

| 세션 | 제목 | 핵심 질문 | 슬라이드 | 실습 |
|---|---|---|---|---|
| **S0** | 바이브 코딩으로 만들기 | AI와 함께 *일단* 만들려면? | `00-vibe-coding.md` | `lab0_vibe_coding/` |
| **S1** | 에이전트란 무엇인가 | LLM과 에이전트는 무엇이 다른가? | `01-what-is-an-agent.md` | `lab1_first_agent.ipynb` |
| **S2** | 도구 사용 (Tool Use) | LLM이 어떻게 "행동"하는가? | `02-tool-use.md` | `lab2_tool_use.ipynb` |
| **S3** | 에이전트 루프·기억·계획 | 여러 단계가 필요한 질문은 어떻게? | `03-agent-loop.md` | `lab3_agent_loop.ipynb` |
| **S4** | 멀티에이전트·RAG·MCP·평가 | 더 크고 안전하게 확장하려면? | `04-multi-agent-rag-mcp.md` | `lab4_orchestrate_rag.ipynb` |
| **S5** | 캡스톤 (선택) | 내 에이전트를 직접 확장한다 | `05-capstone.md` | `lab5_capstone.ipynb` |

**S0** 는 원리 학습(S1~)에 앞서 "먼저 만들어 보는" 도입 세션 — 워크샵 맨 앞에 둔다.
**3회로 압축 시:** S1 + S2 + (S3·S4 축약 병합). **5회로 확장 시:** S1–S4 + 캡스톤(S5).

---

## 5. 세션별 상세

각 세션은 ① 학습 목표 ② 슬라이드 목차 ③ 실습 내용 ④ 연구 사례 연결로 기술한다.

### S0. 바이브 코딩으로 만들기

**학습 목표** — 원리를 배우기 전에, AI 코딩 에이전트(Codex 등)에게 **상세한
빌드 스펙**을 주고 "지도 + 채팅" 웹 앱을 직접 구현한다. 좋은 결과가 *얼마나
구체적인 요청* 에서 나오는지 체득한다.

**슬라이드 `00-vibe-coding.md` (목차)**
1. 타이틀 — Session 0
2. 워크샵 흐름 — S0(만들기) → S1~S5(이해) → 캡스톤
3. 바이브 코딩이란?
4. 오늘 만들 것 — 지도 + 채팅 웹앱
5. 우리는 앱이 아니라 *스펙* 을 준다
6. 잘 만들려면 잘 써야 한다 — 빌드 스펙
7. `BUILD_SPEC.md` 의 구성 (데이터·기능·AI 역할·프론트엔드)
8. 데이터 — 수도권 18개 도시 + 48 흐름
9. AI Agent 의 역할 — 조회는 바로, 계산은 직접
10. AI 코딩 에이전트와 일하는 법
11. 오늘의 실습 (Lab 0)

**실습 `lab0_vibe_coding/`** (완성 앱 없음 — 스펙과 데이터만 제공)
- `BUILD_SPEC.md` — 만들 앱(지도+채팅 웹페이지)을 매우 상세히 적은 빌드 스펙.
  데이터 설명·구현 기능·AI Agent 역할·프론트엔드 요구사항(React·deck.gl·VWorld)을 명시.
- `data/` — `mega-region-ai` 에서 가져온 가장 단순한 데이터(도시 18·통근 흐름 48).
- 학생은 ① `BUILD_SPEC.md` 정독 → ② Gemini·VWorld 키 발급 →
  ③ Codex에 §6의 6단계를 하나씩 요청해 빌드 → ④ 예시 대화로 검증.

**연구 연결** — `mega-region-ai` 의 수도권 예제 데이터를 그대로 base로 사용.
S0에서 만든 결과물(시스템 프롬프트·LLM 호출·데이터 응답)은 S1~S5에서 원리를 해부한다.

### S1. 에이전트란 무엇인가

**학습 목표** — LLM의 한계를 체험하고, "agentic"의 정의와 에이전트의 5대 구성요소
(Model · Instructions · Tools · Memory · Loop)를 이해한다.

**슬라이드 `01-what-is-an-agent.md` (목차)**
1. 타이틀 — Agentic AI 워크샵 / Session 1
2. 워크샵 전체 소개 — 무엇을 만들 것인가 (4+1 세션 로드맵)
3. 두 연구 사례 미리보기 — DTUMOS, mega-region-ai
4. 오늘의 질문: LLM과 에이전트는 무엇이 다른가?
5. LLM 빠른 복습 — 토큰, 다음 토큰 예측, 프롬프트
6. LLM의 한계 ① 환각 (모르는 것을 지어냄)
7. LLM의 한계 ② 멈춰 있는 지식 / 실시간 정보 없음
8. LLM의 한계 ③ 행동 불가 (계산·조회·실행을 못 함)
9. "Agentic"이란? — 자율성 · 도구 · 목표지향 · 반복 루프
10. Workflow ↔ Agent 스펙트럼 (augmented LLM → 체이닝 → 라우팅 → 에이전트)
11. 에이전트의 해부학 — Model + Instructions + Tools + Memory + Loop
12. 에이전트 루프 한눈에 (다이어그램)
13. 사례: "경기 남부 자족도?" 한 문장이 mega-region-ai에서 처리되는 과정
14. 사례: "대전 택시 50대 시뮬레이션" 한 문장이 DTUMOS에서 처리되는 과정
15. 우리가 만들 것: "모빌리티 분석 에이전트" — 4세션 로드맵
16. 오늘의 실습 미리보기 (Lab 1)

**실습 `lab1_first_agent.ipynb`**
- 환경 설정 확인, `common/llm.py`로 첫 LLM 호출
- LLM 한계 **직접 체험**: "지금 몇 시야?", "이 데이터에서 가장 큰 통행량은?" → 실패 관찰
- 시스템 프롬프트·역할 부여·few-shot로 출력 통제하기
- 도구 없이 **프롬프트만으로** "생각 → 행동 제안" 형식(ReAct 흉내) 출력시키기
- 🔧 **TODO**: 모빌리티 분석가 역할의 시스템 프롬프트를 직접 작성

**연구 연결** — 두 연구의 에이전트가 한 문장 요청에 무엇을 하는지 "도착점"으로 미리 보여줌.

---

### S2. 도구 사용 (Tool Use)

**학습 목표** — function calling의 4단계를 이해하고, 도구 스키마를 직접 정의해
LLM과 한 번 왕복(호출 → 실행 → 결과 반환 → 답변)시킨다.

**슬라이드 `02-tool-use.md` (목차)**
1. 타이틀 — Session 2
2. 복습: LLM의 한계 → 에이전트의 필요성
3. 오늘의 질문: LLM이 어떻게 "행동"하는가?
4. 핵심 아이디어: 도구(Tool) = LLM이 호출할 수 있는 함수
5. Function Calling 4단계 개요 (다이어그램)
6. 1단계 — 도구 스키마 정의 (이름 · 설명 · 파라미터)
7. JSON Schema 읽는 법
8. 2단계 — 모델이 도구 호출을 *결정*한다 (텍스트가 아닌 구조화된 호출)
9. ⚠️ 중요한 오해: LLM은 코드를 실행하지 않는다
10. 3단계 — 우리가 도구를 실행한다
11. 4단계 — 결과를 모델에 돌려준다 → 모델이 최종 답변 생성
12. 좋은 도구 설계 원칙 (명확한 이름·설명, 적은 파라미터, 친절한 에러)
13. 사례: mega-region-ai의 13개 도구 (`get_top_flows`, `analyze_self_containment`, …)
14. 사례: DTUMOS의 `run_simulation` 도구 스키마
15. 오늘의 실습 미리보기 (Lab 2)

**실습 `lab2_tool_use.ipynb`**
- `labs/data/`의 OD 통행·생활권 데이터 로드·탐색
- `common/tools.py`의 분석 도구 3종 읽기: `get_top_flows`, `analyze_self_containment`, `search_region`
- 각 도구의 **JSON 스키마** 정의
- Gemini function calling **1왕복**: 도구 호출 파싱 → 실행 → 결과 반환 → 최종 답변
- 🔧 **TODO**: `get_inter_area_flows`(생활권 간 통행) 도구를 스키마부터 직접 추가

**연구 연결** — mega-region-ai의 실제 도구 목록과 DTUMOS `run_simulation` 스키마를
학생이 만든 도구와 나란히 비교.

---

### S3. 에이전트 루프 · 기억 · 계획

**학습 목표** — 한 번의 도구 호출로 끝나지 않는 질문을 위해 ReAct 루프를 직접
구현하고, 메모리·종료 조건·에러 처리를 다룬다.

**슬라이드 `03-agent-loop.md` (목차)**
1. 타이틀 — Session 3
2. 복습: 도구 1왕복
3. 문제: 한 번의 호출로 끝나지 않는 질문들 (예: "자족도 최저 생활권을 찾아 그곳 최대 유출통행은?")
4. ReAct 패턴 — Reason → Act → Observe → 반복
5. 에이전트 루프 의사코드
6. 언제 멈출까? — 종료 조건 (도구 호출이 더 없을 때)
7. 무한 루프 방지 — 최대 스텝 제한
8. 메모리 ① 대화 히스토리 (`messages` 배열)
9. 메모리 ② 도구 결과의 누적
10. 메모리 ③ 컨텍스트 윈도우 한계와 요약
11. 계획(Planning) — 복잡한 질문을 단계로 분해
12. 에러 처리 — 도구가 실패하면?
13. 사례: mega-region-ai `AgentProvider` — 스트리밍 + 재귀 루프(`finish_reason`)
14. 사례: DTUMOS 시뮬레이션 루프 vs 에이전트 루프 (둘 다 "루프"다)
15. 오늘의 실습 미리보기 (Lab 3)

**실습 `lab3_agent_loop.ipynb`**
- S2의 도구들 + 루프를 하나의 `Agent` 클래스로 통합
- **멀티스텝 질문** 처리: 여러 도구를 연쇄 호출해 답에 도달
- 대화 메모리 유지 + 최대 스텝 제한
- `common/mini_sim.py`(DTUMOS 스타일 미니 시뮬레이터)를 도구로 추가 → 에이전트가
  데이터 분석뿐 아니라 **시뮬레이션도** 호출
- 🔧 **TODO**: 종료 조건·에러 처리 보강

**연구 연결** — mega-region-ai의 스트리밍 재귀 루프 코드와 학생의 루프를 비교.
DTUMOS 시뮬레이터의 타임스텝 루프와 에이전트 루프의 구조적 닮음을 짚음.

---

### S4. 멀티에이전트 · RAG · MCP · 평가

**학습 목표** — 단일 에이전트를 넘어 오케스트레이터·RAG·MCP로 확장하는 법, 그리고
에이전트를 평가·안전하게 운영하는 법을 이해한다.

**슬라이드 `04-multi-agent-rag-mcp.md` (목차)**
1. 타이틀 — Session 4
2. 복습: 단일 에이전트 루프
3. 문제: 하나의 에이전트가 모든 걸 잘하긴 어렵다
4. 멀티 에이전트 — 오케스트레이터 + 전문 서브에이전트
5. 라우팅 패턴 — 질문 종류에 따라 분기
6. 사례: DTUMOS의 orchestrator vs interpreter 에이전트
7. RAG란? — 에이전트에게 "지식"을 주기
8. RAG 흐름 — 문서 청크 → 검색 → 컨텍스트 주입
9. RAG도 결국 하나의 도구다
10. MCP(Model Context Protocol)란? — 도구를 표준 규격으로
11. MCP가 왜 필요한가 — 도구 재사용과 생태계
12. 사례: DTUMOS의 MCP 서버
13. 평가(Evaluation) — 에이전트가 잘 동작하는지 어떻게 아는가
14. Mock LLM으로 결정론적 테스트하기 (사례: DTUMOS `test_agentic_engine`)
15. 안전·가드레일 — 샌드박싱, 비용, 무한 루프, 권한
16. 오늘의 실습 미리보기 (Lab 4)

**실습 `lab4_orchestrate_rag.ipynb`**
- 라우터/오케스트레이터: 질문을 "시뮬레이션" vs "데이터 분석" 서브에이전트로 분기
- 미니 RAG: 프로젝트 설명 문서를 청크로 나눠 키워드 검색하는 도구 추가 →
  에이전트가 "DTUMOS가 뭐야?" 같은 질문에 답
- `MockLLM`으로 **API 없이** 에이전트 동작을 결정론적으로 테스트
- (선택) 도구들을 간단한 MCP 서버로 래핑
- 🔧 **TODO**: 서브에이전트 1개 추가

**연구 연결** — DTUMOS의 orchestrator/interpreter 분리와 MCP 서버, mock LLM 테스트
패턴(`test_agentic_engine.py`)을 직접 재현.

---

### S5. 캡스톤 (선택)

**학습 목표** — 배운 것을 종합해, 두 연구 데이터 위에서 자기만의 에이전트를 확장한다.

**슬라이드 `05-capstone.md` (목차)**
1. 타이틀 — Session 5
2. 워크샵 회고 — 해부학 → 도구 → 루프 → 멀티 에이전트
3. 캡스톤 목표와 진행 방식
4. 프로젝트 아이디어 카탈로그
5. 두 연구 데이터 위에서 확장하기
6. 평가 기준
7. 발표 가이드
8. 더 공부할 거리 — LangGraph, MCP, 에이전트 프레임워크

**실습 `lab5_capstone.ipynb`** — 아래 중 택1 이상 자유 확장 후 발표
- 새 분석 도구 추가 (예: 2022 vs 2024 통행 변화 비교)
- 새 서브에이전트 추가 (예: 시각화·리포트 작성 담당)
- 새 모빌리티 모드를 미니 시뮬레이터에 추가
- 에이전트 평가 케이스 작성·개선

---

## 6. 이론 ↔ 실습 매핑

| 핵심 개념 | 슬라이드(세션) | 실습에서 구현 | 연구 사례 참조 |
|---|---|---|---|
| LLM의 한계 | S1 ⑥–⑧ | Lab1 — 한계 직접 체험 | — |
| 에이전트 5대 구성요소 | S1 ⑪ | Lab1~3 전반에 걸쳐 | 두 연구 모두 |
| 시스템 프롬프트·역할 | S1 ⑨ | Lab1 — 프롬프트 작성 | mega-region-ai 시스템 프롬프트 |
| 도구 / function calling | S2 ④–⑪ | Lab2 — 도구 3종 + 1왕복 | mega-region-ai 13개 도구 |
| 도구 스키마(JSON Schema) | S2 ⑥–⑦ | Lab2 — 스키마 정의 | DTUMOS `run_simulation` |
| ReAct 루프 | S3 ④–⑤ | Lab3 — `Agent` 클래스 | mega-region-ai 재귀 루프 |
| 메모리·컨텍스트 | S3 ⑧–⑩ | Lab3 — `messages` 누적 | — |
| 종료 조건·에러 처리 | S3 ⑥⑦⑫ | Lab3 — TODO | — |
| 멀티 에이전트·라우팅 | S4 ④–⑥ | Lab4 — 오케스트레이터 | DTUMOS orchestrator/interpreter |
| RAG | S4 ⑦–⑨ | Lab4 — 미니 RAG 도구 | — |
| MCP | S4 ⑩–⑫ | Lab4 — (선택) MCP 래핑 | DTUMOS MCP 서버 |
| 평가·안전 | S4 ⑬–⑮ | Lab4 — mock LLM 테스트 | DTUMOS `test_agentic_engine` |

---

## 7. 실습 데이터셋 (`labs/data/`)

모두 연구 프로젝트 데이터에서 추출·축소했으며, `_build_dataset.py`에 추출 과정이
기록되어 있다(학생은 실행할 필요 없음 — JSON이 동봉됨).

| 파일 | 내용 | 원천 |
|---|---|---|
| `regions.json` | 250개 시군구 — 행정구역(시도)과 **기능적 생활권**을 함께 태깅 | mega-region-ai |
| `living_areas.json` | 통근 네트워크로 도출한 20개 생활권(생활권은 행정경계를 가로지름) | mega-region-ai |
| `od_flows.json` | 시군구 간 통근 통행량 1,870건 | mega-region-ai (2024 OD) |
| `fleet_demand.json` | 서울 지역 합성 택시 20대 + 호출 50건 | DTUMOS 스타일(합성) |

> 교육 포인트: 한 시군구가 **행정구역(시도)** 과 **생활권** 양쪽에 속하므로,
> "행정경계로 본 자족도 vs 생활권으로 본 자족도"를 비교할 수 있다 — 이것이
> mega-region-ai 연구의 핵심 메시지다.

---

## 8. 공통 코드 (`labs/common/`)

| 파일 | 역할 |
|---|---|
| `llm.py` | 제공자 무관 LLM 래퍼. `generate()` / `generate_with_tools()` 제공. 기본 Gemini(무료), 키 없으면 `MockLLM`로 자동 대체. DTUMOS `agentic/llm.py`를 모델로 함 |
| `tools.py` | 모빌리티 분석 도구(순수 함수) + 각 도구의 JSON 스키마. mega-region-ai `analysisTools.ts` 재현 |
| `mini_sim.py` | DTUMOS 시뮬레이터를 ~80줄로 축약한 미니 디스패치 시뮬레이터 |

---

## 9. 폴더 구조 (최종)

```
agentic_ai/
├── README.md
├── OUTLINE.md                  ← 이 문서
├── requirements.txt
├── .env.example
├── slides/
│   ├── 00-vibe-coding.md
│   ├── 01-what-is-an-agent.md ~ 05-capstone.md
├── labs/
│   ├── lab0_vibe_coding/   README.md · BUILD_SPEC.md
│   │   └── data/           cities.json · flows.json (수도권 예제 데이터)
│   ├── common/   llm.py · tools.py · mini_sim.py · agent.py
│   ├── data/     regions · living_areas · od_flows · fleet_demand · knowledge.json
│   ├── lab1_first_agent.ipynb
│   ├── lab2_tool_use.ipynb
│   ├── lab3_agent_loop.ipynb
│   ├── lab4_orchestrate_rag.ipynb
│   └── lab5_capstone.ipynb
└── solutions/    lab1~lab5 정답 노트북
```

---

## 10. 제작 진행 순서

- [x] **Phase A** — 폴더 골격, `README.md`, `OUTLINE.md`, `requirements.txt`, 데이터셋
- [x] **Phase B** — 공통 코드 (`llm.py`, `tools.py`, `mini_sim.py`, `agent.py`)
- [x] **Phase C** — 슬라이드 5종 (`slides/*.md`)
- [x] **Phase D** — 실습 노트북 + 정답본 (`labs/*.ipynb`, `solutions/*`)

> 전 노트북은 API 키 없이 `MockLLM` 으로 끝까지 실행됨을 검증했고, 슬라이드는
> Marp PDF 렌더링을 확인했습니다. `common/agent.py` 는 Lab 3의 `Agent` 완성본으로,
> Lab 4·5가 재사용합니다.
