# Agentic AI 워크샵

학부생 대상 **Agentic AI 집중 워크샵**의 강의노트(슬라이드)와 실습자료입니다.
"Agentic AI를 *어떻게 구현하는가*, 그리고 *어떤 핵심 개념이 있는가*"를 직접 코드를 짜며 배웁니다.

**Session 0** 에서는 AI 코딩 에이전트(Codex 등)와 함께 *바이브 코딩* 으로 일단
에이전트 앱을 만들어 보고, **Lab 1~5** 에서 LLM 호출 → 도구 사용 → 에이전트 루프 →
멀티 에이전트까지 그 원리를 직접 코드로 배웁니다. 하나의 러닝 예제 **"모빌리티 분석
에이전트"** 를 점진적으로 키우며, 예제 데이터는 실제 연구 프로젝트 두 가지
(`DTUMOS`, `mega-region-ai`)에서 가져왔습니다.

전체 커리큘럼과 슬라이드·실습 구성은 **[`OUTLINE.md`](./OUTLINE.md)** 를 보세요.

## 폴더 구조

```
agentic_ai/
├── OUTLINE.md        # 전체 커리큘럼 + 슬라이드↔실습 매핑 (먼저 읽으세요)
├── slides/           # 세션별 강의 슬라이드 (00~05, Markdown · Marp 호환)
├── labs/             # 실습
│   ├── lab0_vibe_coding/  # Lab 0 — 바이브 코딩 (빌드 스펙 + 예제 데이터)
│   ├── common/       # 공통 코드 (LLM 래퍼, 분석 도구, 미니 시뮬레이터, Agent)
│   ├── data/         # 실습용 데이터셋
│   └── lab1~5*.ipynb # 세션별 실습 노트북 (TODO 포함)
├── solutions/        # 실습 정답 노트북 (강사용)
├── requirements.txt
└── .env.example
```

## 환경 설정 (실습용)

```bash
# 1. 가상환경 생성·활성화
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. API 키 설정 — .env.example 을 복사해 본인 키 입력
cp .env.example .env               # 그리고 .env 파일을 열어 GEMINI_API_KEY 채우기
```

무료 Gemini API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급합니다.
**키가 없어도** 모든 실습은 `MockLLM`(가짜 LLM)으로 끝까지 돌아가도록 설계되어 있어,
에이전트 루프와 도구 호출 메커니즘을 학습하는 데는 지장이 없습니다.

## 실습 실행

워크샵은 **Lab 0** 부터 시작합니다 — 바이브 코딩으로 직접 만들어 보는 도입 랩입니다.

```bash
# Lab 0 — 바이브 코딩 (빌드 스펙을 보고 AI 코딩 에이전트로 직접 구현)
labs/lab0_vibe_coding/README.md          # 여기부터 읽으세요
labs/lab0_vibe_coding/BUILD_SPEC.md      # Codex 등에게 줄 상세 빌드 스펙

# Lab 1~5 — 원리 학습 (Jupyter 노트북)
jupyter lab                              # labs/lab1_first_agent.ipynb 부터 순서대로
```

## 슬라이드 보기

`slides/*.md` 는 일반 Markdown으로도 읽히지만, [Marp](https://marp.app/)로 슬라이드/PPT로
변환할 수 있습니다.

```bash
# VS Code 사용 시: "Marp for VS Code" 확장 설치 후 미리보기
# CLI 사용 시:
npx @marp-team/marp-cli slides/01-what-is-an-agent.md --pdf    # PDF
npx @marp-team/marp-cli slides/01-what-is-an-agent.md --pptx   # PowerPoint
```
