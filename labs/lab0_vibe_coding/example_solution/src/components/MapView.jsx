// ── 지도 (BUILD_SPEC §3) ────────────────────────────────────────────
// deck.gl 로 그린다:
//   · VWorld 베이스맵  → TileLayer + BitmapLayer
//   · 도시(점)        → ScatterplotLayer  (크기 = 총 통근량)
//   · 통근 흐름(곡선)  → ArcLayer          (굵기 = count)

import { useMemo } from 'react'
// deck.gl 통합 패키지 하나에서 필요한 것을 모두 가져온다.
import {
  DeckGL,
  TileLayer,
  BitmapLayer,
  ScatterplotLayer,
  ArcLayer,
} from 'deck.gl'

// 수도권 전체가 보이는 초기 화면 (BUILD_SPEC §3).
const INITIAL_VIEW_STATE = {
  longitude: 127.0,
  latitude: 37.4,
  zoom: 8.4,
  pitch: 35, // 살짝 기울여 통근 흐름 곡선이 잘 보이게
  bearing: 0,
}

const VWORLD_KEY = import.meta.env.VITE_VWORLD_KEY

export default function MapView({ cities, flows, highlightIds }) {
  const hasHighlight = highlightIds && highlightIds.length > 0
  const isOn = (id) => hasHighlight && highlightIds.includes(id)

  // 도시 id → [경도, 위도] 빠른 조회표 (흐름의 양 끝 좌표를 찾을 때 씀)
  const cityById = useMemo(() => {
    const map = {}
    for (const c of cities) map[c.id] = c
    return map
  }, [cities])

  // 흐름 데이터를 ArcLayer 가 쓰는 형태(양 끝 좌표 포함)로 변환
  const arcData = useMemo(
    () =>
      flows
        .map((f) => {
          const o = cityById[f.origin]
          const d = cityById[f.dest]
          if (!o || !d) return null
          return {
            ...f,
            sourcePosition: [o.lon, o.lat],
            targetPosition: [d.lon, d.lat],
            originName: o.name_ko,
            destName: d.name_ko,
          }
        })
        .filter(Boolean),
    [flows, cityById],
  )

  const layers = useMemo(() => {
    // 1) VWorld 베이스맵 — WMTS 래스터 타일을 deck.gl 의 TileLayer 로 깐다.
    const baseMap = new TileLayer({
      id: 'vworld-base',
      data: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`,
      minZoom: 6,
      maxZoom: 18,
      tileSize: 256,
      onTileError: (err) =>
        console.warn('VWorld 타일 로드 실패 (키/도메인 확인):', err),
      renderSubLayers: (props) => {
        const { boundingBox } = props.tile
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [
            boundingBox[0][0],
            boundingBox[0][1],
            boundingBox[1][0],
            boundingBox[1][1],
          ],
        })
      },
    })

    // 2) 통근 흐름 — ArcLayer 곡선. 굵기는 count 에 비례.
    const arcs = new ArcLayer({
      id: 'flows',
      data: arcData,
      pickable: true,
      getSourcePosition: (d) => d.sourcePosition,
      getTargetPosition: (d) => d.targetPosition,
      getWidth: (d) => Math.max(1.2, d.count / 45),
      widthUnits: 'pixels',
      getHeight: 0.35,
      getSourceColor: (d) => {
        // 강조 중이고 이 흐름이 강조 도시와 무관하면 흐리게
        const dim = hasHighlight && !isOn(d.origin) && !isOn(d.dest)
        return [56, 189, 248, dim ? 25 : 200]
      },
      getTargetColor: (d) => {
        const dim = hasHighlight && !isOn(d.origin) && !isOn(d.dest)
        return [251, 146, 60, dim ? 25 : 220]
      },
      updateTriggers: {
        getSourceColor: [highlightIds],
        getTargetColor: [highlightIds],
      },
    })

    // 3) 도시 — ScatterplotLayer 점. 크기는 총 통근량에 비례.
    //    면적이 통근량에 비례하도록 반지름은 sqrt(total) 로 잡는다.
    const dots = new ScatterplotLayer({
      id: 'cities',
      data: cities,
      pickable: true,
      stroked: true,
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      getPosition: (d) => [d.lon, d.lat],
      getRadius: (d) => 4 + Math.sqrt(d.total) * 0.5,
      getLineWidth: (d) => (isOn(d.id) ? 3 : 1.2),
      getFillColor: (d) => {
        if (isOn(d.id)) return [255, 209, 102, 255] // 강조 = 노랑
        if (hasHighlight) return [255, 99, 97, 70] // 강조 중인데 무관 = 흐리게
        return [255, 99, 97, 235] // 기본 = 코랄
      },
      getLineColor: (d) =>
        isOn(d.id) ? [255, 255, 255, 255] : [255, 255, 255, 180],
      updateTriggers: {
        getFillColor: [highlightIds],
        getLineColor: [highlightIds],
        getLineWidth: [highlightIds],
      },
    })

    return [baseMap, arcs, dots]
  }, [cities, arcData, highlightIds, hasHighlight])

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={layers}
      getTooltip={({ object, layer }) => {
        if (!object) return null
        // 도시 점 위에 올렸을 때: 한글 이름 + 총 통근량 (BUILD_SPEC §3)
        if (layer.id === 'cities') {
          return {
            html: `<b>${object.name_ko}</b><br/>총 통근량 ${object.total.toLocaleString()}<br/><span style="opacity:.7">들어옴 ${object.inflow.toLocaleString()} · 나감 ${object.outflow.toLocaleString()}</span>`,
            style: tooltipStyle,
          }
        }
        // 흐름 곡선 위에 올렸을 때: 출발→도착 : 통근량
        if (layer.id === 'flows') {
          return {
            html: `<b>${object.originName} → ${object.destName}</b><br/>통근량 ${object.count.toLocaleString()}`,
            style: tooltipStyle,
          }
        }
        return null
      }}
    />
  )
}

const tooltipStyle = {
  background: 'rgba(13,17,23,0.92)',
  color: '#fff',
  fontSize: '13px',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.15)',
}
