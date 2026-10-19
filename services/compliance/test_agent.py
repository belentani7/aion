#!/usr/bin/env python3
"""Tests para AION ComplianceEngine (solo unittest, sin dependencias externas)."""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent import (  # noqa: E402
    ComplianceEngine,
    ComplianceViolation,
    Shift,
    build_parser,
    main,
)

DAY0 = datetime(2026, 1, 5, 0, 0, 0)  # lunes fijo para determinismo


def dt(hour, minute=0, day_offset=0):
    return DAY0 + timedelta(days=day_offset, hours=hour)


def shift(start, end, is_night=False, employee_id="emp1"):
    return Shift(employee_id, start, end, is_night)


class NightHoursTest(unittest.TestCase):
    """Regresiones del bug de _calculate_night_hours (noche que cruza medianoche)."""

    def setUp(self):
        self.engine = ComplianceEngine("ES")

    def test_day_shift_has_zero_night_hours(self):
        s = shift(dt(8), dt(16), is_night=True)
        self.assertEqual(self.engine._calculate_night_hours(s), 0.0)

    def test_night_crossing_midnight(self):
        # 22:00 -> 06:00 del dia siguiente: 8h de noche
        s = shift(dt(22), dt(6, day_offset=1), is_night=True)
        self.assertAlmostEqual(self.engine._calculate_night_hours(s), 8.0)

    def test_early_morning_partial_night(self):
        # 05:00 -> 07:00: solo 05:00-06:00 es noche (1h)
        s = shift(dt(5), dt(7))
        self.assertAlmostEqual(self.engine._calculate_night_hours(s), 1.0)

    def test_shift_starting_before_night(self):
        # 20:00 -> 08:00: 22:00-06:00 = 8h de noche
        s = shift(dt(20), dt(8, day_offset=1))
        self.assertAlmostEqual(self.engine._calculate_night_hours(s), 8.0)

    def test_multi_night_shift(self):
        # 20:00 dia 1 -> 10:00 dia 3: dos noches completas = 16h
        s = shift(dt(20), dt(10, day_offset=2))
        self.assertAlmostEqual(self.engine._calculate_night_hours(s), 16.0)

    def test_no_double_count_adjacent_windows(self):
        # 22:00 dia 1 -> 06:00 dia 2 debe ser 8h, no 16h
        s = shift(dt(22), dt(6, day_offset=1))
        self.assertAlmostEqual(self.engine._calculate_night_hours(s), 8.0)


class ValidateShiftTest(unittest.TestCase):
    def setUp(self):
        self.engine = ComplianceEngine("ES")

    def _rules(self, violations):
        return [v.rule for v in violations]

    def test_valid_shift_no_violations(self):
        s = shift(dt(8), dt(16))
        self.assertEqual(self.engine.validate_shift(s), [])

    def test_end_before_start_hard_stop(self):
        s = shift(dt(16), dt(8))
        violations = self.engine.validate_shift(s)
        self.assertIn("Invalid Shift Range", self._rules(violations))
        self.assertEqual(violations[0].severity, "hard_stop")

    def test_daily_max_hours_es(self):
        # 10h en ES supera las 9h del art 34.3 -> hard stop
        s = shift(dt(9), dt(19))
        violations = self.engine.validate_shift(s)
        self.assertIn("Max Daily Hours", self._rules(violations))
        self.assertEqual(violations[0].severity, "hard_stop")

    def test_daily_max_hours_es_boundary_ok(self):
        s = shift(dt(8), dt(17))  # 9h exactas
        violations = self.engine.validate_shift(s)
        self.assertNotIn("Max Daily Hours", self._rules(violations))

    def test_daily_max_hours_pt(self):
        pt = ComplianceEngine("PT")
        s = shift(dt(9), dt(18))  # 9h en PT supera las 8h
        violations = pt.validate_shift(s)
        self.assertIn("Max Daily Hours", self._rules(violations))

    def test_night_work_limit(self):
        # 22:00 dia 1 -> 06:00 dia 3: 16h nocturnas en 2 noches > 8h max
        s = shift(dt(22), dt(6, day_offset=2), is_night=True)
        violations = self.engine.validate_shift(s)
        self.assertIn("Night Work Limit", self._rules(violations))

    def test_night_work_within_limit(self):
        # 22:00 -> 06:00: 8h nocturnas, dentro del maximo
        s = shift(dt(22), dt(6, day_offset=1), is_night=True)
        violations = self.engine.validate_shift(s)
        self.assertNotIn("Night Work Limit", self._rules(violations))

    def test_timezone_aware_warns_and_normalizes(self):
        aware_start = dt(8).replace(tzinfo=__import__("datetime").timezone.utc)
        aware_end = dt(16).replace(tzinfo=__import__("datetime").timezone.utc)
        s = shift(aware_start, aware_end)
        violations = self.engine.validate_shift(s)
        self.assertIn("Timezone Not Supported", self._rules(violations))
        # pese a la advertencia no hay hard stops por el turno valido
        self.assertNotIn("Invalid Shift Range", self._rules(violations))

    def test_daily_rest_with_previous_end(self):
        s = shift(dt(8), dt(16))
        prev_end = dt(7)  # solo 1h de descanso
        violations = self.engine.validate_shift(s, previous_shift_end=prev_end)
        self.assertIn("Daily Rest", self._rules(violations))


class WeeklyScheduleTest(unittest.TestCase):
    def setUp(self):
        self.engine = ComplianceEngine("ES")

    def test_empty_schedule_no_violations(self):
        self.assertEqual(self.engine.validate_weekly_schedule([]), [])

    def test_overlapping_shifts(self):
        shifts = [
            shift(dt(8), dt(14)),
            shift(dt(13), dt(19)),  # se superpone con el anterior
        ]
        violations = self.engine.validate_weekly_schedule(shifts)
        self.assertIn("Overlapping Shifts", [v.rule for v in violations])

    def test_insufficient_rest_same_day(self):
        shifts = [
            shift(dt(8), dt(14)),
            shift(dt(15), dt(18)),  # 1h de descanso < 12h
        ]
        violations = self.engine.validate_weekly_schedule(shifts)
        self.assertIn("Daily Rest", [v.rule for v in violations])

    def test_weekly_hours_warning(self):
        # 5 turnos de 9h = 45h > 40h
        shifts = [shift(dt(8), dt(17), employee_id=f"e{i}") for i in range(5)]
        violations = self.engine.validate_weekly_schedule(shifts)
        self.assertIn("Weekly Hours", [v.rule for v in violations])


class IOTest(unittest.TestCase):
    def setUp(self):
        self.engine = ComplianceEngine("ES")
        self.tmp = Path(tempfile.mkdtemp(prefix="aion_test_"))

    def tearDown(self):
        for f in self.tmp.iterdir():
            f.unlink()

    def test_shift_from_dict_and_to_dict(self):
        s = Shift.from_dict({
            "start": "2026-01-05T08:00:00",
            "end": "2026-01-05T16:00:00",
            "is_night": False,
            "employee_id": "emp1",
        })
        self.assertEqual(s.start, datetime(2026, 1, 5, 8, 0))
        d = s.to_dict()
        self.assertEqual(d["employee_id"], "emp1")

    def test_shift_from_dict_invalid_dates(self):
        with self.assertRaises(ValueError):
            Shift.from_dict({"start": "no-es-fecha", "end": "2026-01-05T16:00:00"})
        with self.assertRaises(ValueError):
            Shift.from_dict({"start": "2026-01-05T08:00:00"})  # falta end

    def test_load_schedule_file(self):
        path = self.tmp / "schedule.json"
        path.write_text(json.dumps([
            {"start": "2026-01-05T08:00:00", "end": "2026-01-05T16:00:00",
             "is_night": False, "employee_id": "emp1"},
            {"start": "2026-01-05T16:00:00", "end": "2026-01-05T20:00:00",
             "is_night": False, "employee_id": "emp1"},
        ]), encoding="utf-8")
        shifts = self.engine.load_schedule(path)
        self.assertEqual(len(shifts), 2)

    def test_load_schedule_missing_file(self):
        with self.assertRaises(ValueError):
            self.engine.load_schedule(self.tmp / "nope.json")

    def test_export_violations(self):
        violations = [ComplianceViolation("Test Rule", "warning", "msg")]
        out = self.tmp / "violations.json"
        self.engine.export_violations(violations, out)
        data = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["violations"][0]["rule"], "Test Rule")


class WeeklyRestTest(unittest.TestCase):
    """Descanso semanal: ventana de 7 dias desde el primer turno."""

    def _rules(self, days, jurisdiction="ES", start=8, end=16):
        engine = ComplianceEngine(jurisdiction)
        shifts = [shift(dt(start, day_offset=d), dt(end, day_offset=d)) for d in days]
        return [v.rule for v in engine.validate_weekly_schedule(shifts)]

    def test_normal_mon_fri_week_has_two_rest_days(self):
        # Regresion: antes un Mon-Vie normal se marcaba como violacion.
        self.assertNotIn("Weekly Rest", self._rules(range(5)))

    def test_seven_consecutive_days_violates_weekly_rest(self):
        self.assertIn("Weekly Rest", self._rules(range(7)))

    def test_six_day_week_violates_es_rest(self):
        # 1 dia de descanso < 1.5 exigidos en ES
        self.assertIn("Weekly Rest", self._rules(range(6)))

    def test_six_day_week_ok_for_pt(self):
        # PT exige 1 dia (24h) -> 6 dias de trabajo son suficientes
        self.assertNotIn("Weekly Rest", self._rules(range(6), jurisdiction="PT"))

    def test_six_day_week_violates_fi_rest(self):
        # FI exige 2 dias -> 1 dia es insuficiente
        self.assertIn("Weekly Rest", self._rules(range(6), jurisdiction="FI"))

    def test_weekly_rest_violation_is_hard_stop(self):
        engine = ComplianceEngine("ES")
        shifts = [shift(dt(8, day_offset=d), dt(16, day_offset=d)) for d in range(7)]
        rest = [v for v in engine.validate_weekly_schedule(shifts) if v.rule == "Weekly Rest"]
        self.assertTrue(rest)
        self.assertEqual(rest[0].severity, "hard_stop")

    def test_partial_schedule_does_not_invent_rest_violation(self):
        # Dos turnos el mismo dia: no se puede probar falta de descanso semanal.
        self.assertNotIn("Weekly Rest", self._rules([0]))


class JurisdictionDefaultsTest(unittest.TestCase):
    """Rutas de jurisdiccion, incluido el fallback UE para jurisdicciones desconocidas."""

    def test_es_defaults(self):
        e = ComplianceEngine("ES")
        self.assertEqual(e._get_daily_rest(), 12)
        self.assertEqual(e._get_max_daily(), 9)
        self.assertEqual(e._get_weekly_rest_days(), 1.5)

    def test_pt_defaults(self):
        e = ComplianceEngine("PT")
        self.assertEqual(e._get_daily_rest(), 11)
        self.assertEqual(e._get_max_daily(), 8)

    def test_fi_defaults(self):
        e = ComplianceEngine("FI")
        self.assertEqual(e._get_daily_rest(), 11)
        self.assertEqual(e._get_max_daily(), 8)

    def test_unknown_jurisdiction_falls_back_to_eu(self):
        e = ComplianceEngine("FR")
        self.assertEqual(e._get_daily_rest(), 11)
        self.assertEqual(e._get_max_daily(), 8)
        self.assertEqual(e._get_weekly_rest_days(), 1)

    def test_fi_rejects_nine_hour_day(self):
        e = ComplianceEngine("FI")
        rules = [v.rule for v in e.validate_shift(shift(dt(9), dt(18)))]
        self.assertIn("Max Daily Hours", rules)

    def test_jurisdiction_is_case_insensitive(self):
        self.assertEqual(ComplianceEngine("pt").jurisdiction, "PT")


class LoadScheduleTest(unittest.TestCase):
    def setUp(self):
        self.engine = ComplianceEngine("ES")
        self.tmp = Path(tempfile.mkdtemp(prefix="aion_load_"))

    def tearDown(self):
        for f in self.tmp.iterdir():
            f.unlink()
        self.tmp.rmdir()

    def _write(self, name, content):
        path = self.tmp / name
        path.write_text(content, encoding="utf-8")
        return path

    def test_dict_payload_with_shifts_key(self):
        path = self._write("a.json", json.dumps({
            "employee_id": "emp1",
            "shifts": [{"start": "2026-01-05T08:00:00", "end": "2026-01-05T16:00:00"}],
        }))
        self.assertEqual(len(self.engine.load_schedule(path)), 1)

    def test_invalid_json_raises_value_error(self):
        with self.assertRaises(ValueError):
            self.engine.load_schedule(self._write("bad.json", "{not json"))

    def test_payload_must_be_list_or_object(self):
        with self.assertRaises(ValueError):
            self.engine.load_schedule(self._write("num.json", "42"))

    def test_shifts_key_must_be_list(self):
        with self.assertRaises(ValueError):
            self.engine.load_schedule(self._write("obj.json", json.dumps({"shifts": "nope"})))

    def test_non_object_item_raises(self):
        with self.assertRaises(ValueError):
            self.engine.load_schedule(self._write("item.json", json.dumps([123])))

    def test_bom_prefixed_file_is_accepted(self):
        path = self.tmp / "bom.json"
        path.write_text("\ufeff" + json.dumps([
            {"start": "2026-01-05T08:00:00", "end": "2026-01-05T16:00:00"},
        ]), encoding="utf-8")
        self.assertEqual(len(self.engine.load_schedule(path)), 1)

    def test_missing_employee_id_defaults_to_empty(self):
        path = self._write("noemp.json", json.dumps([
            {"start": "2026-01-05T08:00:00", "end": "2026-01-05T16:00:00"},
        ]))
        self.assertEqual(self.engine.load_schedule(path)[0].employee_id, "")


class ExportTest(unittest.TestCase):
    def test_export_is_atomic_and_records_jurisdiction(self):
        engine = ComplianceEngine("PT")
        tmp = Path(tempfile.mkdtemp(prefix="aion_export_"))
        out = tmp / "violations.json"
        engine.export_violations([ComplianceViolation("R", "warning", "m")], out)
        self.assertTrue(out.exists())
        self.assertFalse(Path(str(out) + ".tmp").exists())
        data = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(data["jurisdiction"], "PT")
        self.assertEqual(data["total"], 1)
        out.unlink()
        tmp.rmdir()


class TimezoneCoercionTest(unittest.TestCase):
    def setUp(self):
        self.engine = ComplianceEngine("ES")

    def test_aware_previous_shift_end_warns(self):
        s = shift(dt(8), dt(16))
        prev = dt(7).replace(tzinfo=timezone.utc)
        rules = [v.rule for v in self.engine.validate_shift(s, previous_shift_end=prev)]
        self.assertIn("Timezone Not Supported", rules)

    def test_aware_shifts_in_weekly_schedule_are_normalized(self):
        aware = [
            shift(dt(8, 0).replace(tzinfo=timezone.utc),
                  dt(16, 0).replace(tzinfo=timezone.utc)),
            shift(dt(8, 1).replace(tzinfo=timezone.utc),
                  dt(16, 1).replace(tzinfo=timezone.utc)),
        ]
        rules = [v.rule for v in self.engine.validate_weekly_schedule(aware)]
        self.assertIn("Timezone Not Supported", rules)


class CLITest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="aion_cli_"))
        self.schedule = self.tmp / "schedule.json"
        self.schedule.write_text(json.dumps([
            {"start": "2026-01-05T08:00:00", "end": "2026-01-05T16:00:00",
             "is_night": False, "employee_id": "emp1"},
        ]), encoding="utf-8")

    def tearDown(self):
        for f in self.tmp.iterdir():
            f.unlink()
        self.tmp.rmdir()

    def _run(self, argv):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            code = main(argv)
        return code, buf.getvalue()

    def test_rules_text_lists_known_rules(self):
        code, out = self._run(["rules"])
        self.assertEqual(code, 0)
        self.assertIn("REG-ES-01", out)

    def test_rules_json_is_valid(self):
        code, out = self._run(["rules", "--json"])
        self.assertEqual(code, 0)
        self.assertIn("REG-PT-01", json.loads(out))

    def test_validate_json_reports_no_violations(self):
        code, out = self._run(["validate", str(self.schedule), "--json"])
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertEqual(payload["total"], 0)
        self.assertEqual(payload["jurisdiction"], "ES")

    def test_validate_text_no_violations(self):
        code, out = self._run(["validate", str(self.schedule)])
        self.assertEqual(code, 0)
        self.assertIn("NO VIOLATIONS", out)

    def test_validate_missing_file_returns_error_code(self):
        code, _ = self._run(["validate", str(self.tmp / "nope.json")])
        self.assertEqual(code, 1)

    def test_export_writes_violations_file(self):
        out_path = self.tmp / "violations.json"
        code, _ = self._run(["export", str(self.schedule), "--out", str(out_path)])
        self.assertEqual(code, 0)
        self.assertTrue(out_path.exists())
        self.assertIn("jurisdiction", json.loads(out_path.read_text(encoding="utf-8")))

    def test_global_jurisdiction_before_subcommand(self):
        code, _ = self._run(["--jurisdiction", "PT", "validate", str(self.schedule)])
        self.assertEqual(code, 0)

    def test_jurisdiction_after_subcommand_is_rejected(self):
        # argparse no acepta opciones globales despues del subcomando.
        with self.assertRaises(SystemExit):
            self._run(["validate", str(self.schedule), "--jurisdiction", "PT"])

    def test_demo_runs_without_error(self):
        code, out = self._run(["demo"])
        self.assertEqual(code, 0)
        self.assertIn("AION Workforce", out)

    def test_no_command_defaults_to_demo(self):
        code, out = self._run([])
        self.assertEqual(code, 0)
        self.assertIn("AION Workforce", out)

    def test_build_parser_default_jurisdiction(self):
        self.assertEqual(build_parser().parse_args([]).jurisdiction, "ES")


if __name__ == "__main__":
    unittest.main()
