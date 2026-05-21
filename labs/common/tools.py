"""Mobility analysis tools — the agent's "hands".

Each function here is an ordinary, side-effect-free Python function: it takes
simple arguments and returns a JSON-serializable result. That is exactly what
makes a good *tool* for an LLM agent.

These reproduce, in Python, the spatial-analysis tools of the `mega-region-ai`
research project (`src/agent/analysisTools.ts`). The data they read was
extracted from that project's real 2024 commute (OD) data — see
`labs/data/_build_dataset.py`.

The file has three parts:
  1. data loading + tiny helpers
  2. the tool functions
  3. SCHEMAS / TOOLBOX — registries the labs use to wire tools to the LLM
"""
from __future__ import annotations

import json
from pathlib import Path

# --- 1. data ---------------------------------------------------------------

_DATA = Path(__file__).resolve().parent.parent / "data"
REGIONS = json.loads((_DATA / "regions.json").read_text(encoding="utf-8"))
LIVING_AREAS = json.loads((_DATA / "living_areas.json").read_text(encoding="utf-8"))
OD_FLOWS = json.loads((_DATA / "od_flows.json").read_text(encoding="utf-8"))
# OD_FLOWS is pre-sorted by volume, largest first.

_REGION_BY_CODE = {r["code"]: r for r in REGIONS}
_AREA_BY_CODE = {a["code"]: a for a in LIVING_AREAS}
_AREA_OF_REGION = {r["code"]: r["living_area"] for r in REGIONS}


def _region_name(code: str) -> str:
    """Turn a sigungu code ("11680") into a readable name."""
    r = _REGION_BY_CODE.get(code)
    return r["full_name"] if r else code


def _resolve_area(text: str):
    """Resolve a living-area name or code to its code (e.g. "서울 생활권" -> "C6")."""
    text = text.strip()
    if text in _AREA_BY_CODE:
        return text
    for area in LIVING_AREAS:
        if text and (text in area["name"] or area["name"] in text):
            return area["code"]
    return None


# --- 2. tools --------------------------------------------------------------

def get_top_flows(n: int = 10, include_internal: bool = False) -> list[dict]:
    """Return the N largest commute flows between sigungu."""
    flows = OD_FLOWS
    if not include_internal:
        flows = [f for f in flows if f["origin"] != f["dest"]]
    return [
        {"origin": _region_name(f["origin"]),
         "dest": _region_name(f["dest"]),
         "volume": f["volume"]}
        for f in flows[:n]
    ]


def search_region(query: str) -> list[dict]:
    """Find sigungu whose name contains `query`."""
    q = query.strip()
    hits = [r for r in REGIONS if q and (q in r["full_name"] or q in r["name"])]
    return [
        {"code": r["code"], "full_name": r["full_name"],
         "sido": r["sido"], "living_area": r["living_area_name"]}
        for r in hits[:15]
    ]


def analyze_self_containment() -> list[dict]:
    """Self-containment ratio of every living area, highest first.

    self-containment = internal commute / (internal + outgoing commute).
    A high value means the area works as a self-sufficient living zone;
    a low value means its residents commute out (often to Seoul).
    """
    stats = {a["code"]: {"internal": 0, "outgoing": 0} for a in LIVING_AREAS}
    for f in OD_FLOWS:
        oa = _AREA_OF_REGION.get(f["origin"])
        da = _AREA_OF_REGION.get(f["dest"])
        if oa is None or da is None:
            continue
        if oa == da:
            stats[oa]["internal"] += f["volume"]
        else:
            stats[oa]["outgoing"] += f["volume"]
    result = []
    for code, s in stats.items():
        total = s["internal"] + s["outgoing"]
        result.append({
            "living_area": _AREA_BY_CODE[code]["name"],
            "self_containment": round(s["internal"] / total, 3) if total else 0.0,
            "internal": s["internal"],
            "outgoing": s["outgoing"],
        })
    result.sort(key=lambda x: -x["self_containment"])
    return result


def get_inter_area_flows(area_a: str, area_b: str) -> dict:
    """Total commute volume between two living areas, in both directions.

    `area_a` / `area_b` may be a living-area name ("서울 생활권") or code ("C6").
    """
    ca, cb = _resolve_area(area_a), _resolve_area(area_b)
    if ca is None:
        return {"error": f"living area not found: {area_a}"}
    if cb is None:
        return {"error": f"living area not found: {area_b}"}
    a_to_b = b_to_a = 0
    for f in OD_FLOWS:
        oa = _AREA_OF_REGION.get(f["origin"])
        da = _AREA_OF_REGION.get(f["dest"])
        if oa == ca and da == cb:
            a_to_b += f["volume"]
        elif oa == cb and da == ca:
            b_to_a += f["volume"]
    return {
        "area_a": _AREA_BY_CODE[ca]["name"],
        "area_b": _AREA_BY_CODE[cb]["name"],
        "a_to_b": a_to_b,
        "b_to_a": b_to_a,
        "total": a_to_b + b_to_a,
    }


def get_region_flows(region: str, n: int = 5) -> dict:
    """Top inbound and outbound commute flows for one sigungu."""
    matches = [r for r in REGIONS
               if region and (region in r["full_name"] or region == r["name"])]
    if not matches:
        return {"error": f"region not found: {region}"}
    r = matches[0]
    code = r["code"]
    outbound = [f for f in OD_FLOWS if f["origin"] == code and f["dest"] != code]
    inbound = [f for f in OD_FLOWS if f["dest"] == code and f["origin"] != code]
    return {
        "region": r["full_name"],
        "living_area": r["living_area_name"],
        "top_outbound": [{"to": _region_name(f["dest"]), "volume": f["volume"]}
                         for f in outbound[:n]],
        "top_inbound": [{"from": _region_name(f["origin"]), "volume": f["volume"]}
                        for f in inbound[:n]],
    }


# --- 3. registries ---------------------------------------------------------
# A tool schema tells the LLM: the tool's name, what it does, and what
# arguments it accepts (as JSON Schema). The labs pass these to the model.

SCHEMAS: dict[str, dict] = {
    "get_top_flows": {
        "name": "get_top_flows",
        "description": "Return the N largest commute flows between sigungu "
                       "(origin -> destination).",
        "parameters": {
            "type": "object",
            "properties": {
                "n": {"type": "integer",
                      "description": "How many flows to return (default 10)."},
                "include_internal": {
                    "type": "boolean",
                    "description": "Include within-sigungu commute (default false)."},
            },
            "required": [],
        },
    },
    "search_region": {
        "name": "search_region",
        "description": "Find sigungu (administrative districts) whose name "
                       "contains the query text.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string",
                          "description": "Part of a region name, e.g. '강남'."},
            },
            "required": ["query"],
        },
    },
    "analyze_self_containment": {
        "name": "analyze_self_containment",
        "description": "Compute the commute self-containment ratio of every "
                       "living area (생활권), sorted highest first.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    "get_inter_area_flows": {
        "name": "get_inter_area_flows",
        "description": "Total commute volume between two living areas, both "
                       "directions. Areas can be named ('서울 생활권') or coded ('C6').",
        "parameters": {
            "type": "object",
            "properties": {
                "area_a": {"type": "string", "description": "First living area."},
                "area_b": {"type": "string", "description": "Second living area."},
            },
            "required": ["area_a", "area_b"],
        },
    },
    "get_region_flows": {
        "name": "get_region_flows",
        "description": "Top inbound and outbound commute flows for one sigungu.",
        "parameters": {
            "type": "object",
            "properties": {
                "region": {"type": "string",
                           "description": "A sigungu name, e.g. '강남구'."},
                "n": {"type": "integer",
                      "description": "How many flows each way (default 5)."},
            },
            "required": ["region"],
        },
    },
}

TOOLBOX = {
    "get_top_flows": get_top_flows,
    "search_region": search_region,
    "analyze_self_containment": analyze_self_containment,
    "get_inter_area_flows": get_inter_area_flows,
    "get_region_flows": get_region_flows,
}


def get_schemas(names=None) -> list[dict]:
    """Return tool-schema dicts (all of them, or just the named ones)."""
    names = names or list(SCHEMAS)
    return [SCHEMAS[n] for n in names]


def call_tool(name: str, args: dict):
    """Run a tool by name. Errors are returned (not raised) so an agent can
    read them and recover — see Session 3 on error handling."""
    if name not in TOOLBOX:
        return {"error": f"unknown tool: {name}"}
    try:
        return TOOLBOX[name](**(args or {}))
    except Exception as exc:  # noqa: BLE001
        return {"error": f"{type(exc).__name__}: {exc}"}
