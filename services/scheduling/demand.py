"""
Demand forecasting using Erlang C queueing model.

Calculates optimal staffing levels based on:
- Transaction volume (calls, tickets, orders)
- Average handling time
- Target service level (% answered within ASA)
- Shrinkage (breaks, meetings, absences)

Inspired by pyworkforce (MIT, Rodrigo Arenas).
Reimplemented for AION with multi-interval support and REST-ready output.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


@dataclass
class StaffingResult:
    raw_positions: int
    positions: int
    service_level: float
    occupancy: float
    waiting_probability: float


@dataclass
class IntervalForecast:
    interval_id: str
    transactions: float
    aht: float
    result: StaffingResult


class ErlangC:
    """M/M/c queue model — Poisson arrivals, exponential service, infinite queue."""

    def __init__(
        self,
        transactions: float,
        aht: float,
        asa: float,
        interval: int,
        shrinkage: float = 0.0,
    ):
        if transactions <= 0:
            raise ValueError("transactions must be positive")
        if aht <= 0:
            raise ValueError("aht must be positive")
        if asa <= 0:
            raise ValueError("asa must be positive")
        if interval <= 0:
            raise ValueError("interval must be positive")
        if not 0 <= shrinkage < 1:
            raise ValueError("shrinkage must be in [0, 1)")

        self.transactions = transactions
        self.aht = aht
        self.asa = asa
        self.interval = interval
        self.shrinkage = shrinkage
        self.intensity = (transactions / interval) * aht

    def _productive(self, positions: int) -> int:
        if positions <= 0 or positions <= self.intensity:
            raise ValueError("positions must exceed traffic intensity")
        return positions

    def waiting_probability(self, positions: int) -> float:
        productive = self._productive(positions)
        erlang_b_inv = 1.0
        for k in range(1, productive + 1):
            erlang_b_inv = 1 + (erlang_b_inv * k / self.intensity)
        erlang_b = 1.0 / erlang_b_inv
        return productive * erlang_b / (productive - self.intensity * (1 - erlang_b))

    def service_level(self, positions: int) -> float:
        productive = self._productive(positions)
        pw = self.waiting_probability(productive)
        exp_val = math.exp(-(productive - self.intensity) * (self.asa / self.aht))
        return max(0.0, 1.0 - pw * exp_val)

    def occupancy(self, positions: int) -> float:
        return self.intensity / self._productive(positions)

    def required_positions(
        self,
        service_level: float = 0.80,
        max_occupancy: float = 0.85,
    ) -> StaffingResult:
        if not 0 <= service_level <= 1:
            raise ValueError("service_level must be in [0, 1]")
        if not 0 < max_occupancy <= 1:
            raise ValueError("max_occupancy must be in (0, 1]")

        positions = round(self.intensity + 1)
        achieved_sl = self.service_level(positions)

        while achieved_sl < service_level:
            positions += 1
            achieved_sl = self.service_level(positions)

        achieved_occ = self.occupancy(positions)
        raw = math.ceil(positions)

        if achieved_occ > max_occupancy:
            raw = math.ceil(self.intensity / max_occupancy)
            achieved_occ = self.occupancy(raw)
            achieved_sl = self.service_level(raw)

        wp = self.waiting_probability(raw)
        scaled = math.ceil(raw / (1 - self.shrinkage))

        return StaffingResult(
            raw_positions=raw,
            positions=scaled,
            service_level=round(achieved_sl, 4),
            occupancy=round(achieved_occ, 4),
            waiting_probability=round(wp, 4),
        )


def forecast_demand(
    intervals: list[dict],
    asa: float = 0.33,
    interval_length: int = 30,
    shrinkage: float = 0.30,
    service_level: float = 0.80,
    max_occupancy: float = 0.85,
) -> list[dict]:
    """
    Forecast staffing for multiple time intervals.

    Each interval dict: {"id": "09:00-09:30", "transactions": 100, "aht": 3.5}

    Returns list of dicts with staffing requirements per interval.
    """
    results = []
    for iv in intervals:
        erlang = ErlangC(
            transactions=iv["transactions"],
            aht=iv["aht"],
            asa=asa,
            interval=interval_length,
            shrinkage=shrinkage,
        )
        req = erlang.required_positions(
            service_level=service_level,
            max_occupancy=max_occupancy,
        )
        results.append({
            "interval_id": iv.get("id", ""),
            "transactions": iv["transactions"],
            "aht": iv["aht"],
            "raw_positions": req.raw_positions,
            "positions": req.positions,
            "service_level": req.service_level,
            "occupancy": req.occupancy,
            "waiting_probability": req.waiting_probability,
        })
    return results
