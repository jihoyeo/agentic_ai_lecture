"""A tiny taxi-dispatch simulator — a teaching-sized version of DTUMOS.

The real DTUMOS engine simulates whole cities: routing on real road networks,
public transit, traveler mode choice, and an optimization (MIP) dispatcher.
Here we keep only the *essence*, so the whole loop fits on one screen:

    for each minute t:
        - ride requests that have appeared wait for a taxi
        - idle taxis are matched to waiting requests
        - a request that has waited too long is dropped (abandoned)

Notice the shape: it is a **loop over time** that repeatedly senses state and
acts. The agent loop in Session 3 has the same shape — loop, sense, act.

`run_mini_simulation()` is exposed to the agent as a tool in Lab 3.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

_DATA = Path(__file__).resolve().parent.parent / "data"
_FLEET = json.loads((_DATA / "fleet_demand.json").read_text(encoding="utf-8"))


def haversine_km(a, b) -> float:
    """Great-circle distance between two [lon, lat] points, in kilometres."""
    (lon1, lat1), (lon2, lat2) = a, b
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(h))


def run_mini_simulation(fleet_size: int = 20, dispatch: str = "nearest",
                        speed_kmh: float = 25.0, max_wait_min: float = 30.0) -> dict:
    """Simulate taxi dispatch over a demand window and return summary metrics.

    Args:
        fleet_size:   number of taxis (clamped to 1-60).
        dispatch:     "nearest" — assign the closest idle taxi (smart), or
                      "fifo"    — assign the first idle taxi (simple baseline).
        speed_kmh:    average taxi speed.
        max_wait_min: a rider waiting longer than this gives up (abandons).

    Returns: a dict with served / total / service_rate / avg_wait_min.
    """
    fleet_size = max(1, min(60, int(fleet_size)))
    base = _FLEET["vehicles"]
    taxis = [{"loc": list(base[i % len(base)]["location"]), "free_at": 0}
             for i in range(fleet_size)]

    requests = sorted(_FLEET["requests"], key=lambda r: r["request_time"])
    horizon = max(r["request_time"] for r in requests) + 90

    pending = list(requests)
    waits: list[float] = []
    served = 0

    for t in range(horizon + 1):
        # a rider who has waited too long abandons the trip
        pending = [r for r in pending if t - r["request_time"] <= max_wait_min]

        for req in [r for r in pending if r["request_time"] <= t]:
            idle = [tx for tx in taxis if tx["free_at"] <= t]
            if not idle:
                break  # no taxi free this minute — waiting riders try again

            if dispatch == "nearest":
                taxi = min(idle, key=lambda tx: haversine_km(tx["loc"], req["origin"]))
            else:  # "fifo": take the first idle taxi, ignoring distance
                taxi = idle[0]

            pickup_min = 60 * haversine_km(taxi["loc"], req["origin"]) / speed_kmh
            trip_min = 60 * haversine_km(req["origin"], req["dest"]) / speed_kmh
            waits.append((t - req["request_time"]) + pickup_min)
            taxi["free_at"] = t + pickup_min + trip_min
            taxi["loc"] = req["dest"]
            pending.remove(req)
            served += 1

    total = len(requests)
    return {
        "fleet_size": fleet_size,
        "dispatch": dispatch,
        "total_requests": total,
        "served": served,
        "service_rate": round(served / total, 3) if total else 0.0,
        "avg_wait_min": round(sum(waits) / len(waits), 1) if waits else 0.0,
    }
