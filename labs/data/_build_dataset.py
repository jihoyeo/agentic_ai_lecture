"""Build the teaching datasets for the Agentic AI workshop.

This is a one-off ETL script kept for *provenance*: it documents how the
workshop datasets were derived from the real research data.

Source: the `mega-region-ai` research project
  - 2024/grid_region_map.json : 1km grid -> [sgg_idx, MEB_ALL2, MEB_COM2, MEB_COM_S]
  - 2024/od/OD_COMMUTE_1KM_VOLover2.csv : grid-to-grid commute volume
  - sigungu_directory.json : 250 sigungu (name, sido, centroid, grid count)

Output (written into this folder):
  - regions.json       : 250 sigungu, each tagged with its administrative
                         province (sido) AND its functional living area.
  - living_areas.json  : 20 commute-based living areas (생활권).
  - od_flows.json      : commute volume aggregated to the sigungu level.
  - fleet_demand.json  : a small synthetic taxi fleet + ride requests in Seoul,
                         in the spirit of the DTUMOS mobility simulator.

Students do NOT need to run this; the JSON outputs ship with the workshop.
"""
import csv
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

SRC = Path("/Users/jihoyeo/research/mega-region-ai/public/data")
OUT = Path(__file__).parent

# Hand-assigned names for the 20 MEB_ALL2 living areas. The codes (C1, C6, ...)
# come from a commute-network community detection in the research project;
# the names below describe each cluster by its dominant cities.
LIVING_AREA_NAMES = {
    "C1": "대구 생활권",
    "C2": "경기 북부 생활권",
    "C3": "경기 남부 생활권",
    "C4": "대전·세종 생활권",
    "C6": "서울 생활권",
    "C7": "경기 서남부 생활권",
    "C8": "광주·전남 생활권",
    "C9": "인천 생활권",
    "C11": "강원 생활권",
    "C12": "경북 북부 생활권",
    "C13": "울산·포항 생활권",
    "C14": "부산 생활권",
    "C15": "원주·제천 생활권",
    "C16": "충남 서북부 생활권",
    "C17": "고양·파주 생활권",
    "C18": "충북 생활권",
    "C19": "경남 서부 생활권",
    "C20": "제주 생활권",
    "C21": "전북 생활권",
    "C22": "전남 동부 생활권",
}

MIN_FLOW = 10  # drop sigungu-pair flows below this many daily commuters


def main() -> None:
    grm = json.loads((SRC / "2024/grid_region_map.json").read_text())
    sgg_list = grm["sgg_list"]            # "11010|서울특별시|종로구"
    grids = grm["grids"]                  # grid_id -> [sgg_idx, MEB_ALL2, ...]
    sgg_dir = {d["sgg_cd"]: d for d in json.loads((SRC / "sigungu_directory.json").read_text())}

    # --- grid -> sigungu code, grid -> living-area code ------------------
    grid_sgg, grid_meb = {}, {}
    for gid, v in grids.items():
        grid_sgg[gid] = sgg_list[v[0]].split("|")[0]
        if len(v) >= 2 and v[1]:
            grid_meb[gid] = v[1]

    # each sigungu belongs to the living area most of its grids fall into
    sgg_meb_votes = defaultdict(Counter)
    for gid, meb in grid_meb.items():
        sgg_meb_votes[grid_sgg[gid]][meb] += 1
    sgg_meb = {s: votes.most_common(1)[0][0] for s, votes in sgg_meb_votes.items()}

    # --- regions.json ----------------------------------------------------
    regions = []
    for code, d in sorted(sgg_dir.items()):
        meb = sgg_meb.get(code, "C6")
        regions.append({
            "code": code,
            "name": d["sgg_nm"],
            "full_name": d["full_nm"],
            "sido": d["sido_nm"],            # administrative province
            "living_area": meb,             # functional commute cluster
            "living_area_name": LIVING_AREA_NAMES.get(meb, meb),
            "lon": round(d["lon"], 5),
            "lat": round(d["lat"], 5),
            "grid_count": d["grid_count"],
        })
    (OUT / "regions.json").write_text(
        json.dumps(regions, ensure_ascii=False, indent=1))

    # --- living_areas.json ----------------------------------------------
    members = defaultdict(list)
    for code, meb in sgg_meb.items():
        members[meb].append(code)
    living_areas = []
    for meb in sorted(members, key=lambda m: -len(members[m])):
        codes = sorted(members[meb])
        sidos = Counter(sgg_dir[c]["sido_nm"] for c in codes if c in sgg_dir)
        living_areas.append({
            "code": meb,
            "name": LIVING_AREA_NAMES.get(meb, meb),
            "num_sigungu": len(codes),
            "sido_breakdown": dict(sidos),
            "sigungu_codes": codes,
        })
    (OUT / "living_areas.json").write_text(
        json.dumps(living_areas, ensure_ascii=False, indent=1))

    # --- od_flows.json (grid OD aggregated to sigungu pairs) -------------
    pair_vol = defaultdict(float)
    with (SRC / "2024/od/OD_COMMUTE_1KM_VOLover2.csv").open() as f:
        for row in csv.DictReader(f):
            o, d = grid_sgg.get(row["O_GID"]), grid_sgg.get(row["D_GID"])
            if o and d:
                pair_vol[(o, d)] += float(row["VOL"])
    flows = [
        {"origin": o, "dest": d, "volume": round(v)}
        for (o, d), v in pair_vol.items()
        if round(v) >= MIN_FLOW
    ]
    flows.sort(key=lambda x: -x["volume"])
    (OUT / "od_flows.json").write_text(
        json.dumps(flows, ensure_ascii=False, indent=1))

    # --- fleet_demand.json (synthetic, DTUMOS-style) ---------------------
    rng = random.Random(42)
    seoul = [d for d in sgg_dir.values() if d["sido_nm"] == "서울특별시"]

    def jitter(pt):
        return [round(pt["lon"] + rng.uniform(-0.02, 0.02), 5),
                round(pt["lat"] + rng.uniform(-0.02, 0.02), 5)]

    vehicles = [
        {"id": f"taxi-{i:02d}", "location": jitter(rng.choice(seoul))}
        for i in range(20)
    ]
    requests = []
    for i in range(50):
        o, d = rng.choice(seoul), rng.choice(seoul)
        requests.append({
            "id": f"req-{i:02d}",
            "origin": jitter(o),
            "dest": jitter(d),
            "request_time": rng.randint(0, 120),   # minutes into the window
        })
    requests.sort(key=lambda r: r["request_time"])
    (OUT / "fleet_demand.json").write_text(json.dumps(
        {"vehicles": vehicles, "requests": requests},
        ensure_ascii=False, indent=1))

    print(f"regions.json       : {len(regions)} sigungu")
    print(f"living_areas.json  : {len(living_areas)} living areas")
    print(f"od_flows.json      : {len(flows)} sigungu-pair flows (>= {MIN_FLOW})")
    print(f"fleet_demand.json  : {len(vehicles)} taxis, {len(requests)} requests")


if __name__ == "__main__":
    main()
