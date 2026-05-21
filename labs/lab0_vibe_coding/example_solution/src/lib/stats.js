// ── 데이터 집계 (자바스크립트로 직접 계산) ──────────────────────────
// BUILD_SPEC §4-5: 합계·최댓값 같은 계산은 자바스크립트로 먼저 계산해
// LLM 에 함께 넘겨주면 더 안전하다. 이 파일이 그 "먼저 계산" 부분이다.

/**
 * 도시별 통근량을 집계한다.
 * @returns 각 도시에 inflow(들어옴) / outflow(나감) / total(합계) 를 더한 배열
 */
export function cityTotals(cities, flows) {
  return cities.map((city) => {
    const inflow = flows
      .filter((f) => f.dest === city.id)
      .reduce((sum, f) => sum + f.count, 0)
    const outflow = flows
      .filter((f) => f.origin === city.id)
      .reduce((sum, f) => sum + f.count, 0)
    return { ...city, inflow, outflow, total: inflow + outflow }
  })
}

/** 가장 통근량이 많은 흐름 1개를 찾는다. */
export function busiestFlow(flows) {
  return flows.reduce((best, f) => (f.count > best.count ? f : best), flows[0])
}

/** 가장 통근량이 적은 흐름 1개를 찾는다. */
export function quietestFlow(flows) {
  return flows.reduce((low, f) => (f.count < low.count ? f : low), flows[0])
}

/**
 * LLM 에게 넘길 "검증된 계산 결과" 묶음.
 * 이 값들은 코드가 직접 더한 것이므로 LLM 이 신뢰하고 인용하면 된다.
 */
export function buildStatsSummary(cities, flows) {
  const totals = cityTotals(cities, flows)
  const idToName = Object.fromEntries(cities.map((c) => [c.id, c.name_ko]))
  const totalAll = flows.reduce((s, f) => s + f.count, 0)
  const max = busiestFlow(flows)
  const min = quietestFlow(flows)

  return {
    cityTotals: totals.map((c) => ({
      id: c.id,
      name_ko: c.name_ko,
      inflow: c.inflow,
      outflow: c.outflow,
      total: c.total,
    })),
    flowCount: flows.length,
    totalCommuters: totalAll,
    busiest: { ...max, label: `${idToName[max.origin]}→${idToName[max.dest]}` },
    quietest: { ...min, label: `${idToName[min.origin]}→${idToName[min.dest]}` },
  }
}
