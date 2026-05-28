// ── 도구 (BUILD_SPEC §4-2) ──────────────────────────────────────────
// LLM 이 호출할 5개 함수. 각 함수는 입력을 받아 결과를 돌려줄 뿐 —
// 그게 "도구" 의 전부다. LLM 은 아래 코드를 보지 못한다.
// 대신 파일 하단의 TOOL_DECLARATIONS (이름·설명·파라미터 스키마) 만 본다.

import cities from '../data/cities.json'
import flows from '../data/flows.json'

const BY_ID = Object.fromEntries(cities.map((c) => [c.id, c]))
const BY_NAME_KO = Object.fromEntries(cities.map((c) => [c.name_ko, c.id]))

/** 한글 이름이든 id 든 받아 id 로 정규화 — 도구 내부 헬퍼. */
function resolve(nameOrId) {
  if (!nameOrId) return null
  if (BY_ID[nameOrId]) return nameOrId
  return BY_NAME_KO[nameOrId] || null
}

// ── 능력 1: 도시 찾기 ──────────────────────────────────────────────
export function find_city({ query }) {
  if (!query) return []
  const q = String(query).toLowerCase()
  return cities
    .filter(
      (c) =>
        c.name_ko.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase() === q,
    )
    .map((c) => ({
      id: c.id,
      name_ko: c.name_ko,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
    }))
}

// ── 능력 2: 단방향 통근량 ──────────────────────────────────────────
export function get_flow({ origin, dest }) {
  const o = resolve(origin)
  const d = resolve(dest)
  if (!o || !d) {
    return { error: `city not found: origin=${origin}, dest=${dest}` }
  }
  const hit = flows.find((f) => f.origin === o && f.dest === d)
  return { origin: o, dest: d, count: hit ? hit.count : 0 }
}

// ── 능력 3: 왕복 통근량 ───────────────────────────────────────────
export function get_round_trip({ city_a, city_b }) {
  const a = resolve(city_a)
  const b = resolve(city_b)
  if (!a || !b) {
    return { error: `city not found: a=${city_a}, b=${city_b}` }
  }
  const ab = (flows.find((f) => f.origin === a && f.dest === b) || {}).count || 0
  const ba = (flows.find((f) => f.origin === b && f.dest === a) || {}).count || 0
  return {
    city_a: BY_ID[a].name_ko,
    city_b: BY_ID[b].name_ko,
    a_to_b: ab,
    b_to_a: ba,
    total: ab + ba,
  }
}

// ── 능력 4: 도시별 inflow / outflow / total ──────────────────────
export function get_city_totals({ city }) {
  const id = resolve(city)
  if (!id) return { error: `city not found: ${city}` }
  const inflow = flows
    .filter((f) => f.dest === id)
    .reduce((s, f) => s + f.count, 0)
  const outflow = flows
    .filter((f) => f.origin === id)
    .reduce((s, f) => s + f.count, 0)
  return {
    city: id,
    name_ko: BY_ID[id].name_ko,
    inflow,
    outflow,
    total: inflow + outflow,
  }
}

// ── 능력 5: 통근량 상위 N 개 흐름 ─────────────────────────────────
export function get_top_flows({ n = 5 } = {}) {
  return [...flows]
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((f) => ({
      origin: f.origin,
      dest: f.dest,
      count: f.count,
      label: `${BY_ID[f.origin].name_ko}→${BY_ID[f.dest].name_ko}`,
    }))
}

// ── 도구 스키마 — LLM 이 보는 것 ─────────────────────────────────
// Gemini REST 의 functionDeclarations 형식. description 은 모델이 읽고
// "어떤 도구를 부를지" 정하는 근거다. 짧고 정확하게 적어야 한다.
export const TOOL_DECLARATIONS = [
  {
    name: 'find_city',
    description:
      'Find cities whose Korean name, English name, or id contains the query. Returns id, name_ko, lat, lon.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "Part of a city name, e.g. '서울' or 'SEO'.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_flow',
    description:
      'Directed commute volume from origin to dest. Note: SEO→INC and INC→SEO are different items. Inputs may be Korean names or ids.',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'City name or id.' },
        dest: { type: 'string', description: 'City name or id.' },
      },
      required: ['origin', 'dest'],
    },
  },
  {
    name: 'get_round_trip',
    description:
      'Round-trip commute between two cities — both directions summed.',
    parameters: {
      type: 'object',
      properties: {
        city_a: { type: 'string', description: 'City name or id.' },
        city_b: { type: 'string', description: 'City name or id.' },
      },
      required: ['city_a', 'city_b'],
    },
  },
  {
    name: 'get_city_totals',
    description:
      'Total commute inflow / outflow / sum (inflow+outflow) for one city.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name or id.' },
      },
      required: ['city'],
    },
  },
  {
    name: 'get_top_flows',
    description: 'Return the N largest commute flows, largest first.',
    parameters: {
      type: 'object',
      properties: {
        n: {
          type: 'integer',
          description: 'How many flows to return (default 5).',
        },
      },
      required: [],
    },
  },
]

// 이름 → 실제 구현. agent.js 가 LLM 의 functionCall.name 으로 여기서 찾아 실행한다.
export const TOOLBOX = {
  find_city,
  get_flow,
  get_round_trip,
  get_city_totals,
  get_top_flows,
}
