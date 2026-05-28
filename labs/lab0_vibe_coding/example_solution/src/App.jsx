// ── 앱 전체 (BUILD_SPEC §1 레이아웃) ────────────────────────────────
// 화면을 좌우로 나눈다: 왼쪽 65% 지도, 오른쪽 35% 채팅.

import { useEffect, useMemo, useState } from 'react'
import citiesRaw from './data/cities.json'
import flows from './data/flows.json'
import MapView from './components/MapView.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import './App.css'

// 지도 점 크기 산출용 — 도시별 통근량 합계. 채팅 도구와 무관하게 UI 가 항상 필요로 한다.
function withTotals(cities, flows) {
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

export default function App() {
  // 지도에서 강조할 도시 id 목록 (채팅 답변에 따라 바뀜)
  const [highlightIds, setHighlightIds] = useState([])

  // 도시마다 통근량 합계(inflow/outflow/total)를 미리 붙여 둔다.
  const cities = useMemo(() => withTotals(citiesRaw, flows), [])

  // BUILD_SPEC §6 1단계: 불러온 데이터를 콘솔에 출력해 확인한다.
  useEffect(() => {
    console.log('도시 데이터', cities)
    console.log('통근 흐름 데이터', flows)
  }, [cities])

  return (
    <div className="layout">
      <section className="layout__map">
        <MapView cities={cities} flows={flows} highlightIds={highlightIds} />
        <div className="legend">
          <div className="legend__row">
            <span className="legend__dot" /> 도시 — 점 크기 = 총 통근량
          </div>
          <div className="legend__row">
            <span className="legend__arc" /> 통근 흐름 — 곡선 굵기 = 통근량
          </div>
          <div className="legend__credit">베이스맵 © VWorld (국토교통부)</div>
        </div>
      </section>

      <ChatPanel cities={cities} flows={flows} onHighlight={setHighlightIds} />
    </div>
  )
}
