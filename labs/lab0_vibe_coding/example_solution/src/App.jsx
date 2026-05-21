// ── 앱 전체 (BUILD_SPEC §1 레이아웃) ────────────────────────────────
// 화면을 좌우로 나눈다: 왼쪽 65% 지도, 오른쪽 35% 채팅.

import { useEffect, useMemo, useState } from 'react'
import citiesRaw from './data/cities.json'
import flows from './data/flows.json'
import { cityTotals } from './lib/stats.js'
import MapView from './components/MapView.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import './App.css'

export default function App() {
  // 지도에서 강조할 도시 id 목록 (채팅 답변에 따라 바뀜)
  const [highlightIds, setHighlightIds] = useState([])

  // 도시마다 통근량 합계(inflow/outflow/total)를 미리 붙여 둔다.
  const cities = useMemo(() => cityTotals(citiesRaw, flows), [])

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
