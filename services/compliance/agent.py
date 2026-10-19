#!/usr/bin/env python3
"""
AION Workforce - Compliance Engine

Valida turnos contra la legislacion laboral europea (Espana, Portugal,
Finlandia y Directiva 2008/88/CE de la UE).

Solo usa la biblioteca estandar de Python (sin dependencias externas).
"""
import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Union

# --------------------------------------------------------------------------- #
# Tipos
# --------------------------------------------------------------------------- #
@dataclass
class Shift:
    """Un turno de trabajo. Los datetime deben ser naive (sin timezone)."""

    employee_id: str
    start: datetime
    end: datetime
    is_night: bool = False

    @classmethod
    def from_dict(cls, data: dict) -> "Shift":
        """Construye un Shift desde un dict con fechas ISO 8601."""
        missing = [k for k in ("start", "end") if k not in data]
        if missing:
            raise ValueError(f"Shift sin campos requeridos: {', '.join(missing)}")
        try:
            start = datetime.fromisoformat(str(data["start"]))
            end = datetime.fromisoformat(str(data["end"]))
        except ValueError as exc:
            raise ValueError(f"Fechas ISO invalidas en Shift: {exc}") from exc
        return cls(
            employee_id=str(data.get("employee_id", "") or ""),
            start=start,
            end=end,
            is_night=bool(data.get("is_night", False)),
        )

    def to_dict(self) -> dict:
        return {
            "employee_id": self.employee_id,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "is_night": self.is_night,
        }


@dataclass
class ComplianceViolation:
    """Una violacion normativa detectada."""

    rule: str
    severity: str  # hard_stop, warning, info
    message: str
    shift_id: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "rule": self.rule,
            "severity": self.severity,
            "message": self.message,
            "shift_id": self.shift_id,
        }


# --------------------------------------------------------------------------- #
# Motor de cumplimiento
# --------------------------------------------------------------------------- #
class ComplianceEngine:
    """Valida turnos contra la legislacion laboral europea (ES/PT/FI/UE)."""

    #: Reglas legales de referencia (tabla del README).
    RULES: Dict[str, tuple] = {
        "REG-ES-01": ("ES", "Estatuto Trabajadores Art. 34.3", "max_daily_hours = 9"),
        "REG-ES-02": ("ES", "Estatuto Trabajadores Art. 34.1/35.2", "max_annual_overtime = 80"),
        "REG-ES-03": ("ES", "Estatuto Trabajadores Art. 34.9", "track_mandatory = true"),
        "REG-PT-01": ("PT", "Código Trabalho Art. 203", "max_weekly_hours = 40"),
        "REG-PT-02": ("PT", "Código Trabalho Art. 221", "min_daily_rest = 11"),
        "REG-FI-01": ("FI", "Working Hours Act 872/2019 §5", "regular_weekly_hours = 40"),
        "REG-FI-02": ("FI", "Working Hours Act 872/2019 §24", "rest_period_weekly = 35"),
    }

    # Spain (Estatuto de los Trabajadores)
    ES_DAILY_REST_HOURS = 12
    ES_WEEKLY_REST_HOURS = 36
    ES_MAX_WEEKLY_HOURS = 40
    ES_MAX_DAILY_HOURS = 9   # Art. 34.3: jornada ordinaria max 9h/dia
    ES_NIGHT_WORK_MAX = 8    # hours in 24h period
    ES_NIGHT_HOURS = (22, 6)  # 22:00 to 06:00

    # Portugal (Código do Trabalho)
    PT_DAILY_REST_HOURS = 11
    PT_WEEKLY_REST_HOURS = 24
    PT_MAX_WEEKLY_HOURS = 40
    PT_MAX_DAILY_HOURS = 8

    # Finland (Working Hours Act)
    FI_DAILY_REST_HOURS = 11
    FI_WEEKLY_REST_HOURS = 35  # includes 24h continuous
    FI_MAX_WEEKLY_HOURS = 40
    FI_MAX_DAILY_HOURS = 8

    # EU Directive 2003/88/CE
    EU_DAILY_REST_HOURS = 11
    EU_WEEKLY_REST_HOURS = 24
    EU_MAX_DAILY_HOURS = 8

    NIGHT_START = time(22, 0)  # 22:00
    NIGHT_END = time(6, 0)     # 06:00

    def __init__(self, jurisdiction: str = "ES"):
        self.jurisdiction = jurisdiction.upper()

    # ------------------------------------------------------------------ #
    # Validacion de un turno individual
    # ------------------------------------------------------------------ #
    def validate_shift(
        self,
        shift: Shift,
        previous_shift_end: Optional[datetime] = None,
    ) -> List[ComplianceViolation]:
        """Valida un turno individual. Opcionalmente chequea descanso previo.

        Incluye: rango valido (end > start), timezone-free, jornada maxima
        diaria (hard stop), duracion recomendada (warning) y trabajo nocturno.
        """
        violations: List[ComplianceViolation] = []
        shift = self._coerce_shift_naive(shift, violations)
        if previous_shift_end is not None:
            previous_shift_end = self._coerce_naive(previous_shift_end, violations)

        # 1. Descanso diario entre turnos
        if previous_shift_end is not None:
            rest_hours = (shift.start - previous_shift_end).total_seconds() / 3600
            min_rest = self._get_daily_rest()
            if rest_hours < min_rest:
                violations.append(ComplianceViolation(
                    rule="Daily Rest",
                    severity="hard_stop",
                    message=(
                        f"Rest between shifts is {rest_hours:.1f}h, "
                        f"minimum required is {min_rest}h"
                    ),
                    shift_id=shift.employee_id,
                ))

        # 2. Rango valido: fin debe ser posterior al inicio
        if shift.end <= shift.start:
            violations.append(ComplianceViolation(
                rule="Invalid Shift Range",
                severity="hard_stop",
                message=(
                    f"Shift end ({shift.end.isoformat()}) must be after "
                    f"shift start ({shift.start.isoformat()})"
                ),
                shift_id=shift.employee_id,
            ))
            return violations

        shift_hours = (shift.end - shift.start).total_seconds() / 3600

        # 3. Jornada maxima diaria (hard stop)
        max_daily = self._get_max_daily()
        if shift_hours > max_daily:
            violations.append(ComplianceViolation(
                rule="Max Daily Hours",
                severity="hard_stop",
                message=(
                    f"Shift duration is {shift_hours:.1f}h, "
                    f"maximum allowed is {max_daily}h "
                    f"(jurisdiction {self.jurisdiction})"
                ),
                shift_id=shift.employee_id,
            ))

        # 4. Duracion de turno recomendada (warning)
        if shift_hours > 12:
            violations.append(ComplianceViolation(
                rule="Max Shift Duration",
                severity="warning",
                message=(
                    f"Shift duration is {shift_hours:.1f}h, "
                    f"recommended max is 12h"
                ),
                shift_id=shift.employee_id,
            ))

        # 5. Trabajo nocturno
        if shift.is_night:
            night_hours = self._calculate_night_hours(shift)
            max_night = self._get_night_max()
            if night_hours > max_night:
                violations.append(ComplianceViolation(
                    rule="Night Work Limit",
                    severity="hard_stop",
                    message=(
                        f"Night work is {night_hours:.1f}h, "
                        f"max allowed is {max_night}h"
                    ),
                    shift_id=shift.employee_id,
                ))

        return violations

    def validate_weekly_schedule(
        self, shifts: List[Shift]
    ) -> List[ComplianceViolation]:
        """Valida una semana completa de turnos para un empleado."""
        violations: List[ComplianceViolation] = []
        if not shifts:
            return violations

        normalized: List[Shift] = []
        for s in shifts:
            s = self._coerce_shift_naive(s, violations)
            if s.end > s.start:
                normalized.append(s)

        if not normalized:
            return violations

        # Sort by start time
        normalized.sort(key=lambda s: s.start)

        # Per-shift validations (duracion maxima, nocturno, rango)
        for s in normalized:
            violations.extend(self.validate_shift(s))

        # Descanso diario entre turnos consecutivos (y deteccion de overlap)
        for i in range(1, len(normalized)):
            prev_end = normalized[i - 1].end
            curr_start = normalized[i].start
            rest_hours = (curr_start - prev_end).total_seconds() / 3600
            if rest_hours < 0:
                violations.append(ComplianceViolation(
                    rule="Overlapping Shifts",
                    severity="hard_stop",
                    message=(
                        f"Shifts overlap: previous ends at {prev_end.isoformat()} "
                        f"but next starts at {curr_start.isoformat()}"
                    ),
                    shift_id=normalized[i].employee_id,
                ))
                continue
            min_rest = self._get_daily_rest()
            if rest_hours < min_rest:
                violations.append(ComplianceViolation(
                    rule="Daily Rest",
                    severity="hard_stop",
                    message=(
                        f"Insufficient rest between shifts: {rest_hours:.1f}h < {min_rest}h"
                    ),
                    shift_id=normalized[i].employee_id,
                ))

        # Horas semanales
        total_weekly = sum(
            (s.end - s.start).total_seconds() / 3600 for s in normalized
        )
        max_weekly = self._get_max_weekly()
        if total_weekly > max_weekly:
            violations.append(ComplianceViolation(
                rule="Weekly Hours",
                severity="warning",
                message=(
                    f"Weekly total is {total_weekly:.1f}h, "
                    f"recommended max is {max_weekly}h"
                ),
                shift_id=normalized[0].employee_id,
            ))

        # Descanso semanal: dias sin turno dentro de la ventana de 7 dias que
        # comienza en el primer turno. Asi un Mon-Vie normal (5 dias de trabajo)
        # tiene 2 dias de descanso, y 7 dias seguidos no tiene ninguno.
        if len(normalized) >= 2:
            week_start = normalized[0].start.date()
            week_days = {week_start + timedelta(days=i) for i in range(7)}
            work_days = {s.start.date() for s in normalized}
            rest_days = len(week_days - work_days)
            min_rest_days = self._get_weekly_rest_days()
            if rest_days < min_rest_days:
                violations.append(ComplianceViolation(
                    rule="Weekly Rest",
                    severity="hard_stop",
                    message=(
                        f"Only {rest_days} rest day(s), "
                        f"minimum required is {min_rest_days}"
                    ),
                    shift_id=normalized[0].employee_id,
                ))

        return violations

    # ------------------------------------------------------------------ #
    # Reglas por jurisdiccion
    # ------------------------------------------------------------------ #
    def _get_daily_rest(self) -> float:
        if self.jurisdiction == "ES":
            return self.ES_DAILY_REST_HOURS
        if self.jurisdiction == "PT":
            return self.PT_DAILY_REST_HOURS
        if self.jurisdiction == "FI":
            return self.FI_DAILY_REST_HOURS
        return self.EU_DAILY_REST_HOURS

    def _get_weekly_rest_days(self) -> float:
        if self.jurisdiction == "ES":
            return 1.5  # 36h in Spain
        if self.jurisdiction == "PT":
            return 1  # 24h continuous
        if self.jurisdiction == "FI":
            return 2  # 35h = 24h continuous + 11h daily
        return 1  # EU Directive 2003/88/CE: 24h continuous

    def _get_max_weekly(self) -> float:
        if self.jurisdiction == "PT":
            return self.PT_MAX_WEEKLY_HOURS
        if self.jurisdiction == "FI":
            return self.FI_MAX_WEEKLY_HOURS
        return self.ES_MAX_WEEKLY_HOURS

    def _get_max_daily(self) -> float:
        """Jornada ordinaria maxima diaria (hard stop)."""
        if self.jurisdiction == "PT":
            return self.PT_MAX_DAILY_HOURS
        if self.jurisdiction == "FI":
            return self.FI_MAX_DAILY_HOURS
        if self.jurisdiction == "ES":
            return self.ES_MAX_DAILY_HOURS
        return self.EU_MAX_DAILY_HOURS

    def _get_night_max(self) -> float:
        return self.ES_NIGHT_WORK_MAX

    # ------------------------------------------------------------------ #
    # Helpers timezone-free
    # ------------------------------------------------------------------ #
    @staticmethod
    def _coerce_naive(dt: datetime, violations: List[ComplianceViolation]) -> datetime:
        """Asegura datetimes naive. Si es timezone-aware, advierte y normaliza."""
        if dt.tzinfo is not None:
            violations.append(ComplianceViolation(
                rule="Timezone Not Supported",
                severity="warning",
                message=(
                    "Timezone-aware datetimes are not supported; "
                    "naive local time assumed"
                ),
            ))
            return dt.replace(tzinfo=None)
        return dt

    def _coerce_shift_naive(
        self, shift: Shift, violations: List[ComplianceViolation]
    ) -> Shift:
        if shift.start.tzinfo is None and shift.end.tzinfo is None:
            return shift
        return Shift(
            employee_id=shift.employee_id,
            start=self._coerce_naive(shift.start, violations),
            end=self._coerce_naive(shift.end, violations),
            is_night=shift.is_night,
        )

    # ------------------------------------------------------------------ #
    # Calculo de horas nocturnas (22:00 - 06:00, puede cruzar medianoche)
    # ------------------------------------------------------------------ #
    def _calculate_night_hours(self, shift: Shift) -> float:
        """Horas dentro de la franja nocturna 22:00-06:00.

        Correcto para turnos que cruzan medianoche, comienzan de madrugada
        (p.ej. 05:00-07:00) o abarcan varias noches (p.ej. 20:00 dia 1 a
        10:00 dia 3). Se calcula restando las horas diurnas (06:00-22:00)
        a la duracion total, evitando doble conteo entre noches adyacentes.
        """
        start, end = shift.start, shift.end
        if start.tzinfo is not None:
            start = start.replace(tzinfo=None)
        if end.tzinfo is not None:
            end = end.replace(tzinfo=None)

        if end <= start:
            return 0.0

        total_hours = (end - start).total_seconds() / 3600

        day_hours = 0.0
        day = start.date()
        last_day = end.date()
        while day <= last_day:
            day_start = datetime.combine(day, self.NIGHT_END)   # 06:00
            day_end = datetime.combine(day, self.NIGHT_START)   # 22:00
            overlap_start = max(start, day_start)
            overlap_end = min(end, day_end)
            if overlap_end > overlap_start:
                day_hours += (overlap_end - overlap_start).total_seconds() / 3600
            day += timedelta(days=1)

        night_hours = total_hours - day_hours
        return round(night_hours, 6)

    # ------------------------------------------------------------------ #
    # Helpers de horarios
    # ------------------------------------------------------------------ #
    def load_schedule(self, path: Union[str, Path]) -> List[Shift]:
        """Carga una lista de turnos desde un archivo JSON.

        Formato esperado:
        ``[{"start": "ISO", "end": "ISO", "is_night": false, "employee_id": "emp1"}, ...]``
        o ``{"employee_id": "emp1", "shifts": [...]}``.
        """
        path = Path(path)
        try:
            with path.open("r", encoding="utf-8-sig") as fh:
                payload = json.load(fh)
        except FileNotFoundError:
            raise ValueError(f"Archivo no encontrado: {path}") from None
        except json.JSONDecodeError as exc:
            raise ValueError(f"JSON invalido en {path}: {exc}") from exc

        if isinstance(payload, dict):
            items = payload.get("shifts", [])
        elif isinstance(payload, list):
            items = payload
        else:
            raise ValueError("El payload debe ser una lista o un objeto con 'shifts'")

        if not isinstance(items, list):
            raise ValueError("'shifts' debe ser una lista")

        shifts: List[Shift] = []
        for item in items:
            if not isinstance(item, dict):
                raise ValueError(f"Turno invalido (no es objeto): {item!r}")
            shifts.append(Shift.from_dict(item))
        return shifts

    def export_violations(
        self,
        violations: List[ComplianceViolation],
        path: Union[str, Path],
    ) -> None:
        """Guarda las violaciones como JSON (temp + rename)."""
        payload = {
            "jurisdiction": self.jurisdiction,
            "checked_at": datetime.now().isoformat(),
            "total": len(violations),
            "violations": [v.to_dict() for v in violations],
        }
        tmp_path = Path(str(path) + ".tmp")
        with tmp_path.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
        tmp_path.replace(path)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="agent",
        description="AION Workforce - Compliance Engine (ES/PT/FI/UE)",
    )
    parser.add_argument("--jurisdiction", type=str, default="ES",
                        help="Jurisdiccion: ES, PT, FI (default: ES)")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("demo", help="Ejecutar la demo de validacion")

    p_rules = sub.add_parser("rules", help="Listar reglas legales configuradas")
    p_rules.add_argument("--json", action="store_true", help="Salida JSON")

    p_validate = sub.add_parser(
        "validate", help="Validar turnos desde un archivo JSON")
    p_validate.add_argument("file", type=Path, help="Archivo JSON con turnos")
    p_validate.add_argument("--json", action="store_true", help="Salida JSON de violaciones")

    p_export = sub.add_parser(
        "export", help="Validar turnos y exportar violaciones a JSON")
    p_export.add_argument("file", type=Path, help="Archivo JSON con turnos")
    p_export.add_argument("--out", type=Path, default=None,
                          help="Archivo de salida (default: violations.json)")

    return parser


def _print_violations(violations: List[ComplianceViolation]) -> None:
    if not violations:
        print("NO VIOLATIONS - Schedule is compliant")
        return
    print("VIOLATIONS FOUND:")
    for v in violations:
        icon = "STOP" if v.severity == "hard_stop" else "WARN" if v.severity == "warning" else "INFO"
        tag = f" [{v.shift_id}]" if v.shift_id else ""
        print(f"  [{icon}] {v.rule}{tag}: {v.message}")


def run_demo() -> None:
    engine = ComplianceEngine("ES")
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    shifts = [
        Shift("emp1", today.replace(hour=7), today.replace(hour=15)),    # 07-15
        Shift("emp1", today.replace(hour=15), today.replace(hour=23)),   # 15-23
        Shift("emp1", (today + timedelta(days=1)).replace(hour=22),
              (today + timedelta(days=2)).replace(hour=6), is_night=True),  # 22-06 night
    ]

    print("AION Workforce - Compliance Check")
    print("=" * 50)
    print("Jurisdiction: Spain")
    print("Employee: emp1")
    print(f"Shifts: {len(shifts)}")
    print()

    violations = engine.validate_weekly_schedule(shifts)
    _print_violations(violations)


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    engine = ComplianceEngine(args.jurisdiction)

    cmd = args.command

    if cmd is None or cmd == "demo":
        run_demo()
        return 0

    if cmd == "rules":
        if args.json:
            print(json.dumps(engine.RULES, ensure_ascii=False, indent=2))
        else:
            print("Configured legal rules:")
            for reg_id, (jur, norm, param) in sorted(engine.RULES.items()):
                print(f"  {reg_id} | {jur} | {norm} | {param}")
        return 0

    if cmd in ("validate", "export"):
        try:
            shifts = engine.load_schedule(args.file)
        except ValueError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 1

        violations = engine.validate_weekly_schedule(shifts)

        if cmd == "export":
            out = args.out or Path("violations.json")
            engine.export_violations(violations, out)
            print(f"Exported {len(violations)} violation(s) to {out}")
            return 0

        if args.json:
            print(json.dumps(
                {"jurisdiction": engine.jurisdiction,
                 "total": len(violations),
                 "violations": [v.to_dict() for v in violations]},
                ensure_ascii=False, indent=2))
        else:
            _print_violations(violations)
        return 0

    build_parser().print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
