import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ShieldCheck, Users, Calendar, DollarSign, Activity, 
  AlertTriangle, ArrowUpRight, CheckCircle2, XCircle, Building2, LogOut, Loader2, Plus, Sparkles, ChevronLeft, ChevronRight, CloudSun, FileText, Umbrella 
} from "lucide-react";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { redactAuditPayload } from "@/lib/auditDisplay";
import { formatCurrency, formatDateTime, formatDate, formatTime, formatMonthYear, localizeEventType, localizeRole, localizeStatus } from "@/i18n";

type TenantChoice = { tenant: { id: number; name: string } };


export type AuditEventFixture = { id: number; eventType: string; createdAt: string | Date; previousHash?: string | null; currentHash: string; payload: unknown };
type HomeTranslate = (key: string) => string;

export function AuditEventTechnicalPreview({ event, t, language }: { event: AuditEventFixture; t: HomeTranslate; language: Parameters<typeof localizeStatus>[1] }) {
  return <div data-testid="audit-event-card" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Badge className="bg-indigo-600 text-white font-mono text-xs">#{event.id}</Badge><span className="font-semibold text-white uppercase tracking-wider text-xs">{localizeEventType(event.eventType, language)}</span></div><span className="text-xs text-slate-500">{formatDateTime(event.createdAt, language)}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/80"><div><span className="text-slate-500">{t('previousHash')}:</span> <span className="text-slate-400">{event.previousHash || t('genesisBlock')}</span></div><div><span className="text-slate-500">{t('currentHash')}:</span> <span className="text-emerald-400 font-semibold">{event.currentHash}</span></div></div><div className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded"><div className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">{t('technicalPayload')}</div><pre className="whitespace-pre-wrap overflow-x-auto">{JSON.stringify(redactAuditPayload(event.payload, t('payloadRedacted')), null, 2)}</pre></div></div>;
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, language } = useI18n();
  const utils = trpc.useUtils();
  const [activeTenantId, setActiveTenantId] = useState<number | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = Number(window.localStorage.getItem("aion.activeTenantId"));
    return Number.isInteger(stored) && stored > 0 ? stored : undefined;
  });
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [shiftFilterEmployeeId, setShiftFilterEmployeeId] = useState<number | undefined>(undefined);
  const [shiftFilterDepartmentId, setShiftFilterDepartmentId] = useState<number | undefined>(undefined);
  const [editShiftOpen, setEditShiftOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");
  const calendarRange = useMemo(() => {
    const start = new Date(calendarCursor);
    start.setHours(0, 0, 0, 0);
    if (calendarMode === "week") start.setDate(start.getDate() - start.getDay());
    else start.setDate(1);
    const end = new Date(start);
    if (calendarMode === "week") end.setDate(start.getDate() + 7);
    else { end.setMonth(start.getMonth() + 1); end.setDate(1); }
    return { from: start.toISOString(), to: end.toISOString() };
  }, [calendarCursor, calendarMode]);
  const calendarDays = useMemo(() => {
    const start = new Date(calendarRange.from);
    const end = new Date(calendarRange.to);
    const days: Date[] = [];
    for (const day = new Date(start); day < end; day.setDate(day.getDate() + 1)) days.push(new Date(day));
    return days;
  }, [calendarRange]);

  const { data: tenantChoices, isLoading: tenantChoicesLoading } = trpc.tenant.list.useQuery(undefined, { enabled: isAuthenticated });
  const typedTenantChoices = (tenantChoices ?? []) as TenantChoice[];
  useEffect(() => {
    if (!typedTenantChoices.length) return;
    const stillAvailable = activeTenantId && typedTenantChoices.some((entry) => entry.tenant.id === activeTenantId);
    if (!stillAvailable) {
      const firstTenantId = typedTenantChoices[0].tenant.id;
      setActiveTenantId(firstTenantId);
      window.localStorage.setItem("aion.activeTenantId", String(firstTenantId));
    }
  }, [activeTenantId, typedTenantChoices]);

  // Every feature query is scoped to the explicitly selected tenant.
  const [employeeDetailId, setEmployeeDetailId] = useState<number | null>(null);
  const [incidentsEmployeeFilter, setIncidentsEmployeeFilter] = useState(0);
  const tenantInput = activeTenantId ? { tenantId: activeTenantId } : undefined;
  const weatherInput = useMemo(() => ({ tenantId: activeTenantId ?? 0, location: "Madrid", latitude: 40.4168, longitude: -3.7038 }), [activeTenantId]);
  const { data: tenant, isLoading: tenantLoading } = trpc.tenant.current.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const { data: weatherData, isLoading: weatherLoading } = trpc.validation.weather.useQuery(weatherInput, { enabled: isAuthenticated && Boolean(activeTenantId), staleTime: 300_000, retry: 1 });
  const tenantInfo = tenant?.tenant;
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const { data: employees, isLoading: empLoading } = trpc.employees.list.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const { data: employeeDetail } = trpc.employees.get.useQuery({ tenantId: activeTenantId ?? 0, employeeId: employeeDetailId ?? 0 }, { enabled: Boolean(activeTenantId && employeeDetailId) });
  const { data: departments } = trpc.departments.list.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const shiftsInput = activeTenantId ? { tenantId: activeTenantId, from: calendarRange.from, to: calendarRange.to, employeeId: shiftFilterEmployeeId, departmentId: shiftFilterDepartmentId } : undefined;
  const { data: shifts, isLoading: shiftLoading } = trpc.shifts.list.useQuery(shiftsInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const { data: payroll, isLoading: payrollLoading } = trpc.payroll.list.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const { data: auditEvents, isLoading: auditLoading } = trpc.audit.list.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) });
  const enterpriseFeaturesEnabled = tenantInfo?.plan === "pro" || tenantInfo?.plan === "enterprise";
  const { data: agreements, isLoading: agreementsLoading } = trpc.agreements.list.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) && enterpriseFeaturesEnabled });
  const { data: absences, isLoading: absencesLoading } = trpc.absences.list.useQuery(tenantInput, { enabled: isAuthenticated && Boolean(activeTenantId) && enterpriseFeaturesEnabled });
  const { data: incidents, isLoading: incidentsLoading } = trpc.incidents.list.useQuery({ tenantId: activeTenantId ?? 0, employeeId: incidentsEmployeeFilter || undefined }, { enabled: isAuthenticated && Boolean(activeTenantId) && enterpriseFeaturesEnabled });
  const { data: auditVerification } = trpc.audit.verifyChain.useQuery({ tenantId: activeTenantId ?? 0 }, { enabled: Boolean(activeTenantId) });
  const payrollCsvQuery = trpc.payroll.csv.useQuery({ tenantId: activeTenantId ?? 1 }, { enabled: false });

  // Dialog States
  const [newEmpOpen, setNewEmpOpen] = useState(false);
  const [newShiftOpen, setNewShiftOpen] = useState(false);
  const [calcPayrollOpen, setCalcPayrollOpen] = useState(false);

  // Form States
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState<"admin" | "manager" | "employee">("employee");
  const [empRate, setEmpRate] = useState("18.00");

  const [shiftEmpId, setShiftEmpId] = useState<number>(0);
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");

  const [payrollEmpId, setPayrollEmpId] = useState<number>(0);
  const [payrollHours, setPayrollHours] = useState("40");
  const [newTenantName, setNewTenantName] = useState("");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementCode, setAgreementCode] = useState("");
  const [agreementName, setAgreementName] = useState("");
  const [agreementRules, setAgreementRules] = useState('{"overtimeMultiplier": 1.5, "nightBonus": 0, "holidayBonus": 0}');
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [absenceEmployeeId, setAbsenceEmployeeId] = useState(0);
  const [absenceType, setAbsenceType] = useState("vacaciones");
  const [absenceStartDate, setAbsenceStartDate] = useState("");
  const [absenceEndDate, setAbsenceEndDate] = useState("");
  const [absenceNotes, setAbsenceNotes] = useState("");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentEmployeeId, setIncidentEmployeeId] = useState(0);
  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentSeverity, setIncidentSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [incidentEditOpen, setIncidentEditOpen] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [editingIncidentSeverity, setEditingIncidentSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [editingIncidentDescription, setEditingIncidentDescription] = useState("");

  // Mutations
  const createEmpMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Empleado registrado exitosamente y auditado en la cadena SHA-256.");
      utils.employees.invalidate();
      utils.dashboard.stats.invalidate();
      setNewEmpOpen(false);
      setEmpName("");
    },
    onError: (err) => toast.error(err.message),
  });

  const createShiftMutation = trpc.shifts.create.useMutation({
    onSuccess: () => {
      toast.success("Turno creado y registrado en el ledger inmutable.");
      utils.shifts.invalidate();
      utils.dashboard.stats.invalidate();
      setNewShiftOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateShiftMutation = trpc.shifts.update.useMutation({
    onSuccess: () => { toast.success("Turno actualizado y auditado."); utils.shifts.invalidate(); utils.dashboard.stats.invalidate(); setEditShiftOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteShiftMutation = trpc.shifts.delete.useMutation({
    onSuccess: () => { toast.success("Turno cancelado y auditado."); utils.shifts.invalidate(); utils.dashboard.stats.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const calcPayrollMutation = trpc.payroll.calculate.useMutation({
    onSuccess: () => {
      toast.success("Nómina calculada y encadenada criptográficamente.");
      utils.payroll.invalidate();
      utils.dashboard.stats.invalidate();
      utils.audit.invalidate();
      setCalcPayrollOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePayrollExport = async () => {
    const result = await payrollCsvQuery.refetch();
    if (!result.data) return;
    const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.data.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exportación CSV descargada.");
  };

  const createTenantMutation = trpc.tenant.create.useMutation({
    onSuccess: (createdTenant) => { toast.success("Empresa creada. Ya puedes empezar a configurar tu plantilla."); setNewTenantName(""); setActiveTenantId(createdTenant.id); window.localStorage.setItem("aion.activeTenantId", String(createdTenant.id)); utils.tenant.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const updatePlanMutation = trpc.tenant.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan de suscripción actualizado correctamente.");
      utils.tenant.invalidate();
    },
  });

  const createAgreementMutation = trpc.agreements.create.useMutation({
    onSuccess: () => {
      toast.success("Convenio colectivo creado y auditado en SHA-256.");
      utils.agreements.invalidate();
      utils.audit.invalidate();
      setAgreementOpen(false);
      setAgreementCode("");
      setAgreementName("");
    },
    onError: (err) => toast.error(err.message),
  });

  const createAbsenceMutation = trpc.absences.create.useMutation({
    onSuccess: () => {
      toast.success("Ausencia registrada y auditada en SHA-256.");
      utils.absences.invalidate();
      utils.audit.invalidate();
      utils.dashboard.stats.invalidate();
      setAbsenceOpen(false);
      setAbsenceNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const createIncidentMutation = trpc.incidents.create.useMutation({
    onSuccess: () => {
      toast.success("Incidencia creada y auditada en SHA-256.");
      utils.incidents.invalidate();
      utils.audit.invalidate();
      utils.dashboard.stats.invalidate();
      setIncidentOpen(false);
      setIncidentTitle("");
      setIncidentDescription("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateIncidentMutation = trpc.incidents.update.useMutation({
    onSuccess: () => {
      toast.success("Estado de incidencia actualizado y auditado.");
      utils.incidents.invalidate();
      utils.audit.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreateAgreement = () => {
    try {
      const rules = JSON.parse(agreementRules) as Record<string, unknown>;
      createAgreementMutation.mutate({ tenantId: activeTenantId, code: agreementCode.trim(), name: agreementName.trim(), rules });
    } catch {
      toast.error("Las reglas del convenio deben ser un JSON válido.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-md w-full text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> AION Workforce SaaS MVP
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Gestión Inteligente y Auditoría Inmutable
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Plataforma multi-tenant para control de turnos, nóminas con encadenamiento SHA-256 e inmunidad ante inspecciones laborales.
          </p>
          <div className="pt-4">
            <Button 
              onClick={() => startLogin()} 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition-all text-base"
            >
              Iniciar Sesión con Manus OAuth
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!tenantChoicesLoading && typedTenantChoices.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-slate-800 bg-slate-900/80 shadow-2xl shadow-indigo-950/30"><CardHeader><CardTitle>Configura tu primera empresa</CardTitle><CardDescription>No hay una membresía activa asociada a tu cuenta. Crea un tenant para comenzar sin compartir datos con otras organizaciones.</CardDescription></CardHeader><CardContent><div className="space-y-3"><Label htmlFor="first-tenant-name">Nombre de la empresa</Label><Input id="first-tenant-name" value={newTenantName} onChange={(event) => setNewTenantName(event.target.value)} placeholder="Ej. Workforce Iberia" className="border-slate-800 bg-slate-950" /><Button disabled={newTenantName.trim().length < 2 || createTenantMutation.isPending} onClick={() => createTenantMutation.mutate({ name: newTenantName.trim() })} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">{createTenantMutation.isPending ? "Creando…" : "Crear empresa y continuar"}</Button></div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto sm:flex-1">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30 font-bold text-lg text-white">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight">AION Workforce</span>
              <Badge variant="outline" className="text-xs uppercase border-indigo-500/30 text-indigo-400 bg-indigo-500/5">
                {tenantInfo?.plan || 'Free'} Plan
              </Badge>
            </div>
                   <p className="text-xs text-slate-400">{tenantInfo?.name || 'Organización'}</p>
          </div>
          <Select
            value={activeTenantId ? String(activeTenantId) : undefined}
            onValueChange={(value) => {
              const nextTenantId = Number(value);
              setActiveTenantId(nextTenantId);
              window.localStorage.setItem("aion.activeTenantId", String(nextTenantId));
            }}
            disabled={tenantChoicesLoading}
          >
            <SelectTrigger className="w-full sm:w-[190px] bg-slate-900 border-slate-800 text-slate-200">
              <SelectValue placeholder="Seleccionar empresa" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
              {typedTenantChoices.map(({ tenant: choiceTenant }: TenantChoice) => (
                <SelectItem key={choiceTenant.id} value={String(choiceTenant.id)}>{choiceTenant.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/validation" className="focus-ring rounded-lg">
            <Button variant="outline" className="w-full border-indigo-500/30 bg-indigo-500/5 text-indigo-300 hover:bg-indigo-500/15 sm:w-auto" aria-label="Abrir centro de validación PVC-U">
              <ShieldCheck className="mr-2 h-4 w-4" /> PVC-U
            </Button>
          </Link>
          <LanguageSelector />
        </div>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-4">
          <div className="flex min-w-0 max-w-[240px] items-center gap-2 truncate rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-400 sm:max-w-none sm:px-3">
            <ShieldCheck className="w-4 h-4" />
            Cadena SHA-256: {auditVerification?.valid ? "Íntegra (100% OK)" : "Alerta"}
          </div>
          
          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name || 'Usuario'}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Cerrar sesión" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-950/40 border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{t('activeEmployees')}</CardTitle>
              <Users className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalEmployees || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Límite Plan: {tenantInfo?.plan === 'free' ? '5 (Free)' : 'Ilimitados'}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/40 border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{t('scheduledShifts')}</CardTitle>
              <Calendar className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalShifts || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Semanales y mensuales</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/40 border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{t('payrollCost')}</CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats?.payrollCost || "0.00", language)}</div>
              <p className="text-xs text-slate-500 mt-1">Calculado con ledger inmutable</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/40 border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{t('shiftAlerts')}</CardTitle>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{stats?.uncoveredShifts || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Pendientes de aprobación</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-950/40 border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-slate-300">{t('operationalContext')}</CardTitle>
              <CardDescription>Open Data · Open-Meteo · Madrid</CardDescription>
            </div>
            <CloudSun className="h-5 w-5 text-sky-300" aria-hidden="true" />
          </CardHeader>
          <CardContent className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div className="text-2xl font-bold text-white">{weatherLoading ? "…" : weatherData ? `${weatherData.snapshot.current.temperatureC.toFixed(1)} °C` : "No disponible"}</div>
            <p className="text-xs text-slate-400">{weatherData ? `Viento ${weatherData.snapshot.current.windSpeedKmh.toFixed(0)} km/h · precipitación ${weatherData.snapshot.current.precipitationMm.toFixed(1)} mm` : "Se conserva el último estado conocido cuando existe caché."}</p>
            {weatherData && <p className="basis-full text-[11px] text-slate-500">{formatDateTime(weatherData.snapshot.retrievedAt, language)} · {weatherData.snapshot.cacheHit ? "caché verificada" : "consulta live verificada"} · hash {weatherData.snapshot.provenance.responseHash.slice(0, 12)}…</p>}
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{t('controlPanel')}</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* New Employee Dialog */}
            <Dialog open={newEmpOpen} onOpenChange={setNewEmpOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                  <Plus className="w-4 h-4" /> {t('newEmployee')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle>{t('registerEmployee')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('fullName')}</Label>
                    <Input value={empName} onChange={e => setEmpName(e.target.value)} placeholder={t('employeePlaceholder')} className="bg-slate-900 border-slate-800 mt-1" />
                  </div>
                  <div>
                    <Label>{t('roleLabel')}</Label>
                    <Select value={empRole} onValueChange={(v: any) => setEmpRole(v)}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="employee">{t('employeeRole')}</SelectItem>
                        <SelectItem value="manager">{t('managerRole')}</SelectItem>
                        <SelectItem value="admin">{t('adminRole')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('hourlyRate')}</Label>
                    <Input value={empRate} onChange={e => setEmpRate(e.target.value)} type="number" step="0.5" className="bg-slate-900 border-slate-800 mt-1" />
                  </div>
                  <Button onClick={() => createEmpMutation.mutate({ tenantId: activeTenantId, name: empName, role: empRole, hourlyRate: empRate })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2">
                    {t('saveLedger')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* New Shift Dialog */}
            <Dialog open={newShiftOpen} onOpenChange={setNewShiftOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-slate-800 hover:bg-slate-800 text-slate-200 gap-2">
                  <Calendar className="w-4 h-4" /> {t('assignShift')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle>{t('scheduleNewShift')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('employeeLabel')}</Label>
                    <Select onValueChange={(v) => setShiftEmpId(Number(v))}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 mt-1">
                        <SelectValue placeholder={t('selectEmployee')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {employees?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} ({formatCurrency(emp.hourlyRate, language)}{t('perHour')})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('startDateTime')}</Label>
                    <Input type="datetime-local" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="bg-slate-900 border-slate-800 mt-1" />
                  </div>
                  <div>
                    <Label>{t('endDateTime')}</Label>
                    <Input type="datetime-local" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="bg-slate-900 border-slate-800 mt-1" />
                  </div>
                  <Button onClick={() => createShiftMutation.mutate({ tenantId: activeTenantId, employeeId: shiftEmpId, startTime: new Date(shiftStart).toISOString(), endTime: new Date(shiftEnd).toISOString(), status: "scheduled" })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2">
                    {t('scheduleShift')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Calculate Payroll Dialog */}
            <Dialog open={calcPayrollOpen} onOpenChange={setCalcPayrollOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-slate-800 hover:bg-slate-800 text-slate-200 gap-2">
                  <DollarSign className="w-4 h-4" /> {t('calculatePayroll')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                  <DialogTitle>{t('generatePayroll')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>{t('employeeLabel')}</Label>
                    <Select onValueChange={(v) => setPayrollEmpId(Number(v))}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 mt-1">
                        <SelectValue placeholder={t('selectEmployee')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {employees?.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('hoursWorked')}</Label>
                    <Input type="number" value={payrollHours} onChange={e => setPayrollHours(e.target.value)} className="bg-slate-900 border-slate-800 mt-1" />
                  </div>
                  <Button onClick={() => calcPayrollMutation.mutate({ tenantId: activeTenantId, employeeId: payrollEmpId, hours: Number(payrollHours) })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2">
                    {t('calculateHash')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs Sections */}
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="bg-slate-950/60 border border-slate-800 p-1">
            <TabsTrigger value="employees" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">{t('tabEmployees')}</TabsTrigger>
            <TabsTrigger value="shifts" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">{t('tabShifts')}</TabsTrigger>
            <TabsTrigger value="payroll" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">{t('tabPayroll')}</TabsTrigger>
            <TabsTrigger value="audit" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">{t('tabAudit')}</TabsTrigger>
            <TabsTrigger value="subscription" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">{t('tabBilling')}</TabsTrigger>
            <TabsTrigger value="agreements" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Convenios</TabsTrigger>
            <TabsTrigger value="absences" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Ausencias</TabsTrigger>
            <TabsTrigger value="incidents" className="text-slate-300 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Incidencias</TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader>
                <CardTitle>{t('employeesDirectory')}</CardTitle>
                <CardDescription>{t('employeesDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="py-3 px-4">{t('name')}</th>
                        <th className="py-3 px-4">{t('role')}</th>
                        <th className="py-3 px-4">{t('hourlyRate')}</th>
                        <th className="py-3 px-4">{t('createdAt')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {employees?.map((emp: any) => (
                        <tr key={emp.id} onClick={() => setEmployeeDetailId(emp.id)} onKeyDown={(event) => { if (event.key === "Enter") setEmployeeDetailId(emp.id); }} tabIndex={0} role="button" className="cursor-pointer hover:bg-slate-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{emp.name}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="border-slate-700 text-slate-300 capitalize">{localizeRole(emp.role, language)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-semibold">{formatCurrency(emp.hourlyRate, language)}{t('perHour')}</td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(emp.createdAt, language)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {employeeDetail && (
                  <div className="mt-6 grid gap-4 border-t border-slate-800 pt-6 lg:grid-cols-[1fr_2fr]">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">{t('individualFile')}</p><h3 className="mt-1 text-lg font-semibold text-white">{employeeDetail.employee.name}</h3></div><Button variant="ghost" size="sm" onClick={() => setEmployeeDetailId(null)} className="text-slate-400">{t('close')}</Button></div>
                      <div className="mt-4 space-y-2 text-sm text-slate-400"><p>{t('roleLabel')}: <span className="text-slate-200">{localizeRole(employeeDetail.employee.role, language)}</span></p><p>{t('hourlyRate')}: <span className="text-emerald-400">{formatCurrency(employeeDetail.employee.hourlyRate, language)}{t('perHour')}</span></p><p>{t('shiftsLabel')}: <span className="text-slate-200">{employeeDetail.shifts.length}</span></p><p>{t('payrollLabel')}: <span className="text-slate-200">{employeeDetail.payroll.length}</span></p><p>{t('incidentsLabel')}: <span className="text-slate-200">{employeeDetail.incidents.length}</span></p></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3"><div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{t('recentShifts')}</p>{employeeDetail.shifts.map((shift: any) => <p key={shift.id} className="mt-2 text-xs text-slate-300">{formatDate(shift.startTime, language)} · {localizeStatus(shift.status, language)}</p>)}</div><div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{t('payrollLabel')}</p>{employeeDetail.payroll.map((entry: any) => <p key={entry.id} className="mt-2 text-xs text-emerald-300">{formatCurrency(entry.totalAmount, language)} · {entry.hoursWorked} {t('hourUnit')}</p>)}</div><div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{t('incidentsLabel')}</p>{employeeDetail.incidents.map((incident: any) => <p key={incident.id} className="mt-2 text-xs text-amber-300">{incident.title} · {localizeStatus(incident.status, language)}</p>)}</div></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader>
                <CardTitle>{t('shiftsCalendar')}</CardTitle>
                <CardDescription>{t('shiftsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <Select value={shiftFilterEmployeeId ? String(shiftFilterEmployeeId) : "all-employees"} onValueChange={(value) => setShiftFilterEmployeeId(value === "all-employees" ? undefined : Number(value))}>
                    <SelectTrigger className="w-full sm:w-[210px] bg-slate-950 border-slate-800"><SelectValue placeholder={t('filterEmployee')} /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-slate-100"><SelectItem value="all-employees">{t('allEmployees')}</SelectItem>{(employees ?? []).map((employee: any) => <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={shiftFilterDepartmentId ? String(shiftFilterDepartmentId) : "all-departments"} onValueChange={(value) => setShiftFilterDepartmentId(value === "all-departments" ? undefined : Number(value))}>
                    <SelectTrigger className="w-full sm:w-[210px] bg-slate-950 border-slate-800"><SelectValue placeholder={t('filterDepartment')} /></SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-slate-100"><SelectItem value="all-departments">{t('allDepartments')}</SelectItem>{(departments ?? []).map((department: any) => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {(shiftFilterEmployeeId || shiftFilterDepartmentId) && <Button variant="ghost" size="sm" onClick={() => { setShiftFilterEmployeeId(undefined); setShiftFilterDepartmentId(undefined); }} className="text-slate-400">{t('clearFilters')}</Button>}
                </div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label={t('previousPeriod')} onClick={() => setCalendarCursor((current) => { const next = new Date(current); next.setDate(next.getDate() - (calendarMode === "week" ? 7 : 30)); return next; })} className="border-slate-800 text-slate-300"><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon" aria-label={t('nextPeriod')} onClick={() => setCalendarCursor((current) => { const next = new Date(current); next.setDate(next.getDate() + (calendarMode === "week" ? 7 : 30)); return next; })} className="border-slate-800 text-slate-300"><ChevronRight className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium text-slate-300">{formatMonthYear(calendarCursor, language)}</span>
                  </div>
                  <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
                    <Button variant="ghost" size="sm" onClick={() => setCalendarMode("week")} className={calendarMode === "week" ? "bg-indigo-600 text-white" : "text-slate-400"}>{t('week')}</Button>
                    <Button variant="ghost" size="sm" disabled={tenantInfo?.plan === "free"} title={tenantInfo?.plan === "free" ? t('availableFromPro') : t('monthlyView')} onClick={() => setCalendarMode("month")} className={calendarMode === "month" ? "bg-indigo-600 text-white" : "text-slate-400"}>{t('month')}</Button>
                  </div>
                </div>
                <div className="mb-6 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800">
                  {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map((dayName) => <div key={dayName} className="bg-slate-950 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">{dayName}</div>)}
                  {calendarDays.map((day) => {
                    const dayShifts = (shifts ?? []).filter((shift: any) => new Date(shift.startTime).toDateString() === day.toDateString());
                    return <div key={day.toISOString()} className="min-h-[86px] bg-slate-950/70 p-2 align-top"><div className="mb-1 text-xs font-semibold text-slate-500">{day.getDate()}</div>{dayShifts.slice(0, 3).map((shift: any) => <div key={shift.id} className="mb-1 truncate rounded-md bg-indigo-500/15 px-2 py-1 text-[11px] text-indigo-300" title={`${shift.employeeName ?? t('unassigned')} · ${formatTime(shift.startTime, language)}`}>{shift.employeeName ?? t('unassigned')}</div>)}{dayShifts.length > 3 && <div className="text-[10px] text-slate-500">+{dayShifts.length - 3} {t('more')}</div>}</div>;
                  })}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="py-3 px-4">{t('employeeLabel')}</th>
                        <th className="py-3 px-4">{t('start')}</th>
                        <th className="py-3 px-4">{t('end')}</th>
                        <th className="py-3 px-4">{t('status')}</th>
                        <th className="py-3 px-4 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {shifts?.map((shift: any) => (
                        <tr key={shift.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{shift.employeeName}</td>
                          <td className="py-3 px-4 text-slate-400">{formatDateTime(shift.startTime, language)}</td>
                          <td className="py-3 px-4 text-slate-400">{formatDateTime(shift.endTime, language)}</td>
                          <td className="py-3 px-4">
                            <Badge className={
                              shift.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              shift.status === 'scheduled' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }>
                              {localizeStatus(shift.status, language)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setEditingShiftId(shift.id); setEditShiftStart(new Date(shift.startTime).toISOString().slice(0, 16)); setEditShiftEnd(new Date(shift.endTime).toISOString().slice(0, 16)); setEditShiftOpen(true); }} className="border-slate-700 text-slate-300">{t('edit')}</Button><Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); deleteShiftMutation.mutate({ tenantId: activeTenantId, shiftId: shift.id }); }} className="text-amber-300">{t('cancel')}</Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Dialog open={editShiftOpen} onOpenChange={setEditShiftOpen}>
                  <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                    <DialogHeader><DialogTitle>{t('editShift')}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>{t('start')}</Label><Input type="datetime-local" value={editShiftStart} onChange={(event) => setEditShiftStart(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <div><Label>{t('end')}</Label><Input type="datetime-local" value={editShiftEnd} onChange={(event) => setEditShiftEnd(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <Button disabled={!editingShiftId || !editShiftStart || !editShiftEnd || updateShiftMutation.isPending} onClick={() => editingShiftId && updateShiftMutation.mutate({ tenantId: activeTenantId, shiftId: editingShiftId, startTime: new Date(editShiftStart).toISOString(), endTime: new Date(editShiftEnd).toISOString() })} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">{t('saveChanges')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div><CardTitle>{t('payrollReceipts')}</CardTitle><CardDescription>{t('payrollDesc')}</CardDescription></div>
                <Button variant="outline" size="sm" onClick={handlePayrollExport} disabled={!activeTenantId || payrollCsvQuery.isFetching} className="border-slate-800 text-slate-200">{payrollCsvQuery.isFetching ? t('preparing') : t('exportCsv')}</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="py-3 px-4">{t('employeeLabel')}</th>
                        <th className="py-3 px-4">{t('hours')}</th>
                        <th className="py-3 px-4">{t('totalAmount')}</th>
                        <th className="py-3 px-4">{t('period')}</th>
                        <th className="py-3 px-4">{t('hash')}</th>
                        <th className="py-3 px-4">{t('date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {payroll?.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{entry.employeeName}</td>
                          <td className="py-3 px-4 text-slate-300">{entry.hoursWorked} {t('hourUnit')}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">{formatCurrency(entry.totalAmount, language)}</td>
                          <td className="py-3 px-4 text-xs text-slate-400">{formatDate(entry.periodStart, language)} — {formatDate(entry.periodEnd, language)}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400 truncate max-w-xs">{entry.hash}</td>
                          <td className="py-3 px-4 text-slate-500">{formatDate(entry.payrollDate, language)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('auditTitle')}</CardTitle>
                  <CardDescription>{t('auditDesc')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {t('apiVerification')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditEvents?.map((event: any) => <AuditEventTechnicalPreview key={event.id} event={event} t={t} language={language} />)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agreements Tab */}
          <TabsContent value="agreements">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-300" />Convenios colectivos</CardTitle><CardDescription>Reglas versionadas para horas extra, nocturnidad y festivos, siempre vinculadas al tenant activo.</CardDescription></div>
                <Dialog open={agreementOpen} onOpenChange={setAgreementOpen}>
                  <DialogTrigger asChild><Button disabled={!enterpriseFeaturesEnabled} className="bg-indigo-600 text-white hover:bg-indigo-500"><Plus className="mr-2 h-4 w-4" />Nuevo convenio</Button></DialogTrigger>
                  <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                    <DialogHeader><DialogTitle>Crear convenio versionable</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div><Label htmlFor="agreement-code">Código</Label><Input id="agreement-code" value={agreementCode} onChange={(event) => setAgreementCode(event.target.value)} placeholder="ES-2026-01" className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <div><Label htmlFor="agreement-name">Nombre</Label><Input id="agreement-name" value={agreementName} onChange={(event) => setAgreementName(event.target.value)} placeholder="Convenio sectorial" className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <div><Label htmlFor="agreement-rules">Reglas JSON</Label><Textarea id="agreement-rules" value={agreementRules} onChange={(event) => setAgreementRules(event.target.value)} aria-describedby="agreement-rules-help" className="mt-1 min-h-28 border-slate-800 bg-slate-900 font-mono text-xs" /><p id="agreement-rules-help" className="mt-1 text-xs text-slate-500">Se conserva como configuración auditable y extensible.</p></div>
                      <Button disabled={!agreementCode.trim() || !agreementName.trim() || createAgreementMutation.isPending} onClick={handleCreateAgreement} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">Guardar y auditar convenio</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!enterpriseFeaturesEnabled ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">Los convenios requieren plan Pro o Enterprise. La acción está bloqueada también en el backend.</div> : agreementsLoading ? <p className="text-sm text-slate-400">Cargando convenios…</p> : agreements?.length ? <div className="grid gap-3 md:grid-cols-2">{agreements.map((agreement: any) => <div key={agreement.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-white">{agreement.name}</p><p className="text-xs font-mono text-indigo-300">{agreement.code}</p></div><Badge className="bg-emerald-500/10 text-emerald-300">{agreement.active ? "Activo" : "Inactivo"}</Badge></div><pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-400">{JSON.stringify(agreement.rules, null, 2)}</pre></div>)}</div> : <p className="text-sm text-slate-400">No hay convenios registrados para este tenant.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Absences Tab */}
          <TabsContent value="absences">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div><CardTitle className="flex items-center gap-2"><Umbrella className="h-5 w-5 text-sky-300" />Ausencias</CardTitle><CardDescription>Registro de vacaciones, bajas y permisos con empleado, período y estado.</CardDescription></div>
                <Dialog open={absenceOpen} onOpenChange={setAbsenceOpen}>
                  <DialogTrigger asChild><Button disabled={!enterpriseFeaturesEnabled} className="bg-sky-600 text-white hover:bg-sky-500"><Plus className="mr-2 h-4 w-4" />Registrar ausencia</Button></DialogTrigger>
                  <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                    <DialogHeader><DialogTitle>Registrar ausencia</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div><Label htmlFor="absence-employee">Empleado</Label><Select value={absenceEmployeeId ? String(absenceEmployeeId) : undefined} onValueChange={(value) => setAbsenceEmployeeId(Number(value))}><SelectTrigger id="absence-employee" className="mt-1 border-slate-800 bg-slate-900"><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger><SelectContent className="border-slate-800 bg-slate-950 text-slate-100">{(employees ?? []).map((employee: any) => <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label htmlFor="absence-type">Tipo</Label><Input id="absence-type" value={absenceType} onChange={(event) => setAbsenceType(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="absence-start">Inicio</Label><Input id="absence-start" type="date" value={absenceStartDate} onChange={(event) => setAbsenceStartDate(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div><div><Label htmlFor="absence-end">Fin</Label><Input id="absence-end" type="date" value={absenceEndDate} onChange={(event) => setAbsenceEndDate(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div></div>
                      <div><Label htmlFor="absence-notes">Notas</Label><Textarea id="absence-notes" value={absenceNotes} onChange={(event) => setAbsenceNotes(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <Button disabled={!absenceEmployeeId || !absenceStartDate || !absenceEndDate || createAbsenceMutation.isPending} onClick={() => createAbsenceMutation.mutate({ tenantId: activeTenantId, employeeId: absenceEmployeeId, type: absenceType.trim(), startDate: absenceStartDate, endDate: absenceEndDate, notes: absenceNotes.trim() || undefined })} className="w-full bg-sky-600 text-white hover:bg-sky-500">Guardar y auditar ausencia</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!enterpriseFeaturesEnabled ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">Las ausencias requieren plan Pro o Enterprise. La acción está bloqueada también en el backend.</div> : absencesLoading ? <p className="text-sm text-slate-400">Cargando ausencias…</p> : absences?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-300"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-4 py-3">Empleado</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Período</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-800/60">{absences.map((absence: any) => <tr key={absence.id}><td className="px-4 py-3 text-white">{employees?.find((employee: any) => employee.id === absence.employeeId)?.name ?? `#${absence.employeeId}`}</td><td className="px-4 py-3">{absence.type}</td><td className="px-4 py-3 text-slate-400">{formatDate(absence.startDate, language)} — {formatDate(absence.endDate, language)}</td><td className="px-4 py-3"><Badge className="bg-sky-500/10 text-sky-300">{absence.status}</Badge></td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-400">No hay ausencias registradas para este tenant.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <Card className="bg-slate-950/40 border-slate-800">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-300" />Incidencias operativas</CardTitle><CardDescription>Seguimiento por empleado, severidad y ciclo de resolución con eventos auditados.</CardDescription></div>
                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
                  <Label htmlFor="incident-filter-employee" className="sr-only">{t('filterEmployee')}</Label>
                  <Select value={incidentsEmployeeFilter ? String(incidentsEmployeeFilter) : "all-incident-employees"} onValueChange={(value) => setIncidentsEmployeeFilter(value === "all-incident-employees" ? 0 : Number(value))}>
                    <SelectTrigger id="incident-filter-employee" className="w-full border-slate-800 bg-slate-900 text-slate-200 sm:w-[210px]"><SelectValue placeholder={t('allEmployees')} /></SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-950 text-slate-100"><SelectItem value="all-incident-employees">{t('allEmployees')}</SelectItem>{(employees ?? []).map((employee: any) => <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
                  <DialogTrigger asChild><Button disabled={!enterpriseFeaturesEnabled} className="bg-amber-600 text-white hover:bg-amber-500"><Plus className="mr-2 h-4 w-4" />Nueva incidencia</Button></DialogTrigger>
                  <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                    <DialogHeader><DialogTitle>Registrar incidencia</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div><Label htmlFor="incident-employee">Empleado</Label><Select value={incidentEmployeeId ? String(incidentEmployeeId) : undefined} onValueChange={(value) => setIncidentEmployeeId(Number(value))}><SelectTrigger id="incident-employee" className="mt-1 border-slate-800 bg-slate-900"><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger><SelectContent className="border-slate-800 bg-slate-950 text-slate-100">{(employees ?? []).map((employee: any) => <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label htmlFor="incident-title">Título</Label><Input id="incident-title" value={incidentTitle} onChange={(event) => setIncidentTitle(event.target.value)} className="mt-1 border-slate-800 bg-slate-900" /></div>
                      <div><Label htmlFor="incident-severity">Severidad</Label><Select value={incidentSeverity} onValueChange={(value: "low" | "medium" | "high" | "critical") => setIncidentSeverity(value)}><SelectTrigger id="incident-severity" className="mt-1 border-slate-800 bg-slate-900"><SelectValue /></SelectTrigger><SelectContent className="border-slate-800 bg-slate-950 text-slate-100"><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div>
                      <div><Label htmlFor="incident-description">Descripción</Label><Textarea id="incident-description" value={incidentDescription} onChange={(event) => setIncidentDescription(event.target.value)} className="mt-1 min-h-28 border-slate-800 bg-slate-900" /></div>
                      <Button disabled={!incidentEmployeeId || !incidentTitle.trim() || !incidentDescription.trim() || createIncidentMutation.isPending} onClick={() => createIncidentMutation.mutate({ tenantId: activeTenantId, employeeId: incidentEmployeeId, title: incidentTitle.trim(), description: incidentDescription.trim(), severity: incidentSeverity })} className="w-full bg-amber-600 text-white hover:bg-amber-500">Guardar y auditar incidencia</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <Dialog open={incidentEditOpen} onOpenChange={setIncidentEditOpen}>
                <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
                  <DialogHeader><DialogTitle>Editar incidencia</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div><Label htmlFor="editing-incident-severity">Severidad</Label><Select value={editingIncidentSeverity} onValueChange={(value: "low" | "medium" | "high" | "critical") => setEditingIncidentSeverity(value)}><SelectTrigger id="editing-incident-severity" className="mt-1 border-slate-800 bg-slate-900"><SelectValue /></SelectTrigger><SelectContent className="border-slate-800 bg-slate-950 text-slate-100"><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div>
                    <div><Label htmlFor="editing-incident-description">Descripción</Label><Textarea id="editing-incident-description" value={editingIncidentDescription} onChange={(event) => setEditingIncidentDescription(event.target.value)} className="mt-1 min-h-28 border-slate-800 bg-slate-900" /></div>
                    <Button disabled={!editingIncidentId || !editingIncidentDescription.trim() || updateIncidentMutation.isPending} onClick={() => editingIncidentId && updateIncidentMutation.mutate({ tenantId: activeTenantId, incidentId: editingIncidentId, severity: editingIncidentSeverity, description: editingIncidentDescription.trim() })} className="w-full bg-indigo-600 text-white hover:bg-indigo-500">Guardar cambios auditados</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <CardContent>
                {!enterpriseFeaturesEnabled ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">Las incidencias requieren plan Pro o Enterprise. La acción está bloqueada también en el backend.</div> : incidentsLoading ? <p className="text-sm text-slate-400">Cargando incidencias…</p> : incidents?.length ? <div className="space-y-3">{incidents.map((entry: any) => { const incident = entry.incident; return <div key={incident.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{incident.title}</p><Badge className={incident.severity === "critical" || incident.severity === "high" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}>{incident.severity}</Badge><Badge variant="outline" className="border-slate-700 text-slate-300">{incident.status}</Badge></div><p className="mt-1 text-sm text-slate-400">{entry.employee?.name ?? `#${incident.employeeId}`} · {incident.description}</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingIncidentId(incident.id); setEditingIncidentSeverity(incident.severity); setEditingIncidentDescription(incident.description); setIncidentEditOpen(true); }} className="border-slate-700 text-slate-300">Editar</Button><Button size="sm" variant="outline" disabled={incident.status === "investigating" || updateIncidentMutation.isPending} onClick={() => updateIncidentMutation.mutate({ tenantId: activeTenantId, incidentId: incident.id, status: "investigating" })} className="border-indigo-500/30 text-indigo-300">Investigar</Button><Button size="sm" variant="outline" disabled={incident.status === "resolved" || updateIncidentMutation.isPending} onClick={() => updateIncidentMutation.mutate({ tenantId: activeTenantId, incidentId: incident.id, status: "resolved" })} className="border-emerald-500/30 text-emerald-300">Resolver</Button></div></div>; })}</div> : <p className="text-sm text-slate-400">No hay incidencias registradas para este tenant.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className={`bg-slate-950/40 border-slate-800 relative ${tenantInfo?.plan === 'free' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                <CardHeader>
                  <CardTitle>{t('planFree')}</CardTitle>
                  <CardDescription>{t('freeDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-extrabold">{formatCurrency(0, language)} <span className="text-sm font-normal text-slate-500">{t('perMonth')}</span></div>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>✓ {t('freeEmployees')}</li>
                    <li>✓ {t('basicShifts')}</li>
                    <li>✓ {t('immutableLedger')}</li>
                  </ul>
                  <Button onClick={() => updatePlanMutation.mutate({ tenantId: activeTenantId, plan: 'free' })} variant="outline" className="w-full border-slate-800">
                    {tenantInfo?.plan === 'free' ? t('currentPlan') : t('switchToFree')}
                  </Button>
                </CardContent>
              </Card>

              <Card className={`bg-slate-950/40 border-slate-800 relative ${tenantInfo?.plan === 'pro' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                <CardHeader>
                  <CardTitle>{t('planPro')}</CardTitle>
                  <CardDescription>{t('proDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-extrabold">{formatCurrency(49, language)} <span className="text-sm font-normal text-slate-500">{t('perMonth')}</span></div>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>✓ {t('unlimitedEmployees')}</li>
                    <li>✓ {t('advancedShifts')}</li>
                    <li>✓ {t('priorityAudit')}</li>
                  </ul>
                  <Button onClick={() => updatePlanMutation.mutate({ tenantId: activeTenantId, plan: 'pro' })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                    {tenantInfo?.plan === 'pro' ? t('currentPlan') : t('selectPro')}
                  </Button>
                </CardContent>
              </Card>

              <Card className={`bg-slate-950/40 border-slate-800 relative ${tenantInfo?.plan === 'enterprise' ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}>
                <CardHeader>
                  <CardTitle>{t('planEnterprise')}</CardTitle>
                  <CardDescription>{t('enterpriseDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-extrabold">{formatCurrency(199, language)} <span className="text-sm font-normal text-slate-500">{t('perMonth')}</span></div>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>✓ {t('everythingPro')}</li>
                    <li>✓ {t('dedicatedSupport')}</li>
                    <li>✓ {t('exportableApi')}</li>
                  </ul>
                  <Button onClick={() => updatePlanMutation.mutate({ tenantId: activeTenantId, plan: 'enterprise' })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                    {tenantInfo?.plan === 'enterprise' ? t('currentPlan') : t('selectEnterprise')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
