export type Language = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ru' | 'ar';

export const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export const translations: Record<Language, Record<string, string>> = {
  es: {
    appTitle: 'AION Workforce',
    subtitle: 'SaaS multi-tenant para gestión de turnos y nóminas con auditoría inmutable SHA-256',
    activeEmployees: 'Empleados Activos',
    scheduledShifts: 'Turnos Programados',
    payrollCost: 'Coste de Nóminas',
    shiftAlerts: 'Alertas de Turnos',
    planLimit: 'Límite Plan',
    unlimited: 'Ilimitados',
    weeklyMonthly: 'Semanales y mensuales',
    calculatedLedger: 'Calculado con ledger inmutable',
    pendingApproval: 'Pendientes de aprobación',
    operationalContext: 'Contexto operativo',
    openDataMadrid: 'Open Data · Open-Meteo · Madrid',
    cacheStatus: 'Se conserva el último estado conocido cuando existe caché.',
    controlPanel: 'Panel de Control Operativo',
    newEmployee: '+ Nuevo Empleado',
    assignShift: 'Asignar Turno',
    calculatePayroll: '$ Calcular Nómina',
    tabEmployees: 'Empleados',
    tabShifts: 'Gestión de Turnos',
    tabPayroll: 'Nóminas & Recibos',
    tabAudit: 'Auditoría Inmutable SHA-256',
    tabBilling: 'Planes & Billing',
    employeesDirectory: 'Directorio de Empleados',
    employeesDesc: 'Gestión de personal y tarifas horarias por tenant.',
    name: 'Nombre',
    role: 'Rol',
    hourlyRate: 'Tarifa / Hora',
    createdAt: 'Fecha Alta',
    verifyChain: 'Cadena SHA-256: Íntegra (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'Centro de validación PVC-U', validationSubtitle: 'Perfiles versionados, capas de control y procedencia abierta para equipos operativos.', validationBack: 'Volver al dashboard', validationProfiles: 'Perfiles por riesgo', validationSources: 'Catálogo de fuentes abiertas', validationRules: 'Reglas de operación', validationActive: 'Motor activo',
  },
  en: {
    appTitle: 'AION Workforce',
    subtitle: 'Multi-tenant workforce & payroll SaaS with immutable SHA-256 audit ledger',
    activeEmployees: 'Active Employees',
    scheduledShifts: 'Scheduled Shifts',
    payrollCost: 'Payroll Cost',
    shiftAlerts: 'Shift Alerts',
    planLimit: 'Plan Limit',
    unlimited: 'Unlimited',
    weeklyMonthly: 'Weekly and monthly',
    calculatedLedger: 'Calculated with immutable ledger',
    pendingApproval: 'Pending approval',
    operationalContext: 'Operational Context',
    openDataMadrid: 'Open Data · Open-Meteo · Madrid',
    cacheStatus: 'Last known state is preserved when cache is available.',
    controlPanel: 'Operational Control Panel',
    newEmployee: '+ New Employee',
    assignShift: 'Assign Shift',
    calculatePayroll: '$ Calculate Payroll',
    tabEmployees: 'Employees',
    tabShifts: 'Shift Management',
    tabPayroll: 'Payroll & Receipts',
    tabAudit: 'SHA-256 Immutable Audit',
    tabBilling: 'Plans & Billing',
    employeesDirectory: 'Employees Directory',
    employeesDesc: 'Personnel management and hourly rates per tenant.',
    name: 'Name',
    role: 'Role',
    hourlyRate: 'Hourly Rate',
    createdAt: 'Created At',
    verifyChain: 'SHA-256 Chain: Intact (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'PVC-U Validation Center', validationSubtitle: 'Versioned profiles, control layers and open provenance for operational teams.', validationBack: 'Back to dashboard', validationProfiles: 'Risk profiles', validationSources: 'Open sources catalog', validationRules: 'Operating rules', validationActive: 'Engine active',
  },
  fr: {
    appTitle: 'AION Workforce',
    subtitle: 'SaaS multi-tenant de gestion des plannings et de la paie avec registre SHA-256 immuable',
    activeEmployees: 'Employés Actifs',
    scheduledShifts: 'Quarts Planifiés',
    payrollCost: 'Coût de la Paie',
    shiftAlerts: "Alertes d'Horaires",
    planLimit: 'Limite du Plan',
    unlimited: 'Illimité',
    weeklyMonthly: 'Hebdomadaire et mensuel',
    calculatedLedger: 'Calculé avec un registre immuable',
    pendingApproval: "En attente d'approbation",
    operationalContext: 'Contexte Opérationnel',
    openDataMadrid: 'Open Data · Open-Meteo · Madrid',
    cacheStatus: "Le dernier état connu est préservé en cas de cache.",
    controlPanel: 'Panneau de Contrôle Opérationnel',
    newEmployee: '+ Nouvel Employé',
    assignShift: 'Assigner un Quart',
    calculatePayroll: '$ Calculer la Paie',
    tabEmployees: 'Employés',
    tabShifts: 'Gestion des Quarts',
    tabPayroll: 'Paie & Reçus',
    tabAudit: 'Audit Immuable SHA-256',
    tabBilling: 'Plans & Facturation',
    employeesDirectory: "Répertoire des Employés",
    employeesDesc: 'Gestion du personnel et taux horaires par tenant.',
    name: 'Nom',
    role: 'Rôle',
    hourlyRate: 'Taux Horaire',
    createdAt: "Date de Création",
    verifyChain: 'Chaîne SHA-256 : Intacte (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'Centre de validation PVC-U', validationSubtitle: 'Profils versionnés, couches de contrôle et provenance ouverte pour les équipes opérationnelles.', validationBack: 'Retour au tableau de bord', validationProfiles: 'Profils de risque', validationSources: 'Catalogue des sources ouvertes', validationRules: 'Règles opérationnelles', validationActive: 'Moteur actif',
  },
  de: {
    appTitle: 'AION Workforce',
    subtitle: 'Multi-Tenant Schicht- und Lohnabrechnungs-SaaS mit unveränderlichem SHA-256-Audit-Ledger',
    activeEmployees: 'Aktive Mitarbeiter',
    scheduledShifts: 'Geplante Schichten',
    payrollCost: 'Lohnkosten',
    shiftAlerts: 'Schicht-Warnungen',
    planLimit: 'Tariflimit',
    unlimited: 'Unbegrenzt',
    weeklyMonthly: 'Wöchentlich und monatlich',
    calculatedLedger: 'Berechnet mit unveränderlichem Ledger',
    pendingApproval: 'Ausstehende Genehmigung',
    operationalContext: 'Operativer Kontext',
    openDataMadrid: 'Open Data · Open-Meteo · Madrid',
    cacheStatus: 'Der letzte bekannte Zustand wird bei Cache beibehalten.',
    controlPanel: 'Operatives Kontrollpanel',
    newEmployee: '+ Neuer Mitarbeiter',
    assignShift: 'Schicht zuweisen',
    calculatePayroll: '$ Gehalt berechnen',
    tabEmployees: 'Mitarbeiter',
    tabShifts: 'Schichtverwaltung',
    tabPayroll: 'Gehalt & Belege',
    tabAudit: 'SHA-256 Unveränderliches Audit',
    tabBilling: 'Tarife & Abrechnung',
    employeesDirectory: 'Mitarbeiterverzeichnis',
    employeesDesc: 'Personalmanagement und Stundensätze pro Tenant.',
    name: 'Name',
    role: 'Rolle',
    hourlyRate: 'Stundensatz',
    createdAt: 'Erstellt am',
    verifyChain: 'SHA-256 Kette: Intakt (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'PVC-U Validierungszentrum', validationSubtitle: 'Versionierte Profile, Kontrollebenen und offene Herkunft für operative Teams.', validationBack: 'Zurück zum Dashboard', validationProfiles: 'Risikoprofile', validationSources: 'Katalog offener Quellen', validationRules: 'Betriebsregeln', validationActive: 'Engine aktiv',
  },
  it: {
    appTitle: 'AION Workforce',
    subtitle: 'SaaS multi-tenant per turni e stipendi con registro di audit SHA-256 immutabile',
    activeEmployees: 'Dipendenti Attivi',
    scheduledShifts: 'Turni Programmati',
    payrollCost: 'Costo Stipendi',
    shiftAlerts: 'Avvisi Turni',
    planLimit: 'Limite Piano',
    unlimited: 'Illimitati',
    weeklyMonthly: 'Settimanali e mensili',
    calculatedLedger: 'Calcolato con registro immutabile',
    pendingApproval: 'In attesa di approvazione',
    operationalContext: 'Contesto Operativo',
    openDataMadrid: 'Open Data · Open-Meteo · Madrid',
    cacheStatus: "L'ultimo stato noto viene preservato in presenza di cache.",
    controlPanel: 'Pannello di Controllo Operativo',
    newEmployee: '+ Nuovo Dipendente',
    assignShift: 'Assegna Turno',
    calculatePayroll: '$ Calcola Stipendio',
    tabEmployees: 'Dipendenti',
    tabShifts: 'Gestione Turni',
    tabPayroll: 'Stipendi & Ricevute',
    tabAudit: 'Audit Immutabile SHA-256',
    tabBilling: 'Piani & Fatturazione',
    employeesDirectory: 'Elenco Dipendenti',
    employeesDesc: 'Gestione del personale e tariffe orarie per tenant.',
    name: 'Nome',
    role: 'Ruolo',
    hourlyRate: 'Tariffa Oraria',
    createdAt: 'Data Creazione',
    verifyChain: 'Catena SHA-256: Integra (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'Centro di validazione PVC-U', validationSubtitle: 'Profili versionati, livelli di controllo e provenienza aperta per i team operativi.', validationBack: 'Torna alla dashboard', validationProfiles: 'Profili di rischio', validationSources: 'Catalogo delle fonti aperte', validationRules: 'Regole operative', validationActive: 'Motore attivo',
  },
  pt: {
    appTitle: 'AION Workforce',
    subtitle: 'SaaS multi-tenant para gestão de turnos e folha de pagamento com auditoria SHA-256 imutável',
    activeEmployees: 'Funcionários Ativos',
    scheduledShifts: 'Turnos Agendados',
    payrollCost: 'Custo da Folha',
    shiftAlerts: 'Alertas de Turnos',
    planLimit: 'Limite do Plano',
    unlimited: 'Ilimitados',
    weeklyMonthly: 'Semanais e mensais',
    calculatedLedger: 'Calculado com ledger imutável',
    pendingApproval: 'Pendente de aprovação',
    operationalContext: 'Contexto Operacional',
    openDataMadrid: 'Open Data · Open-Meteo · Madrid',
    cacheStatus: 'O último estado conhecido é preservado quando há cache.',
    controlPanel: 'Painel de Controle Operacional',
    newEmployee: '+ Novo Funcionário',
    assignShift: 'Atribuir Turno',
    calculatePayroll: '$ Calcular Folha',
    tabEmployees: 'Funcionários',
    tabShifts: 'Gestão de Turnos',
    tabPayroll: 'Folha & Recibos',
    tabAudit: 'Auditoria Imutável SHA-256',
    tabBilling: 'Planos & Faturamento',
    employeesDirectory: 'Diretório de Funcionários',
    employeesDesc: 'Gestão de pessoal e tarifas horárias por tenant.',
    name: 'Nome',
    role: 'Cargo',
    hourlyRate: 'Tarifa / Hora',
    createdAt: 'Data de Cadastro',
    verifyChain: 'Cadeia SHA-256: íntegra (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'Centro de validação PVC-U', validationSubtitle: 'Perfis versionados, camadas de controle e procedência aberta para equipes operacionais.', validationBack: 'Voltar ao painel', validationProfiles: 'Perfis de risco', validationSources: 'Catálogo de fontes abertas', validationRules: 'Regras de operação', validationActive: 'Motor ativo',
  },
  zh: {
    appTitle: 'AION Workforce',
    subtitle: '具备不可篡改SHA-256审计账本的多租户排班与薪酬SaaS',
    activeEmployees: '活跃员工',
    scheduledShifts: '已排班次',
    payrollCost: '薪酬成本',
    shiftAlerts: '排班警报',
    planLimit: '套餐限制',
    unlimited: '无限',
    weeklyMonthly: '周与月度',
    calculatedLedger: '使用不可篡改账本计算',
    pendingApproval: '待审批',
    operationalContext: '运营上下文',
    openDataMadrid: '开放数据 · Open-Meteo · 马德里',
    cacheStatus: '当缓存可用时保留最后已知状态。',
    controlPanel: '运营控制面板',
    newEmployee: '+ 新增员工',
    assignShift: '分配排班',
    calculatePayroll: '$ 计算薪资',
    tabEmployees: '员工',
    tabShifts: '排班管理',
    tabPayroll: '薪资与收据',
    tabAudit: 'SHA-256 不可篡改审计',
    tabBilling: '套餐与账单',
    employeesDirectory: '员工名册',
    employeesDesc: '各租户的人员管理与时薪设置。',
    name: '姓名',
    role: '角色',
    hourlyRate: '时薪',
    createdAt: '入职日期',
    verifyChain: 'SHA-256 链：完整 (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'PVC-U 验证中心', validationSubtitle: '为运营团队提供版本化配置、控制层和开放来源追踪。', validationBack: '返回控制面板', validationProfiles: '风险配置', validationSources: '开放数据源目录', validationRules: '运营规则', validationActive: '引擎已启用',
  },
  ja: {
    appTitle: 'AION Workforce',
    subtitle: '改ざん防止SHA-256監査台帳を備えたマルチテナント型シフト・給与SaaS',
    activeEmployees: '稼働中従業員',
    scheduledShifts: '予定シフト',
    payrollCost: '人件費総額',
    shiftAlerts: 'シフトアラート',
    planLimit: 'プラン制限',
    unlimited: '無制限',
    weeklyMonthly: '週間および月間',
    calculatedLedger: '不変台帳で計算済み',
    pendingApproval: '承認待ち',
    operationalContext: '稼働コンテキスト',
    openDataMadrid: 'オープンデータ · Open-Meteo · マドリード',
    cacheStatus: 'キャッシュが存在する場合、最後の既知の状態が保持されます。',
    controlPanel: 'オペレーション管理パネル',
    newEmployee: '+ 従業員の追加',
    assignShift: 'シフト割り当て',
    calculatePayroll: '$ 給与計算',
    tabEmployees: '従業員',
    tabShifts: 'シフト管理',
    tabPayroll: '給与・明細',
    tabAudit: 'SHA-256 不変監査台帳',
    tabBilling: 'プラン・請求',
    employeesDirectory: '従業員名簿',
    employeesDesc: 'テナントごとの人事管理と時給設定。',
    name: '氏名',
    role: 'ロール',
    hourlyRate: '時給',
    createdAt: '登録日',
    verifyChain: 'SHA-256 チェーン: 整合性正常 (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'PVC-U 検証センター', validationSubtitle: '運用チーム向けのバージョン管理されたプロファイル、制御層、公開データの出所。', validationBack: 'ダッシュボードに戻る', validationProfiles: 'リスクプロファイル', validationSources: '公開ソースカタログ', validationRules: '運用ルール', validationActive: 'エンジン稼働中',
  },
  ru: {
    appTitle: 'AION Workforce',
    subtitle: 'Многопользовательский SaaS для управления сменами и зарплатой с неизменяемым журналом SHA-256',
    activeEmployees: 'Активные сотрудники',
    scheduledShifts: 'Запланированные смены',
    payrollCost: 'Расходы на ЗП',
    shiftAlerts: 'Предупреждения о сменах',
    planLimit: 'Лимит плана',
    unlimited: 'Безлимитно',
    weeklyMonthly: 'Еженедельно и ежемесячно',
    calculatedLedger: 'Рассчитано с неизменяемым журналом',
    pendingApproval: 'Ожидает утверждения',
    operationalContext: 'Операционный контекст',
    openDataMadrid: 'Открытые данные · Open-Meteo · Мадрид',
    cacheStatus: 'Последнее известное состояние сохраняется при наличии кэша.',
    controlPanel: 'Панель операционного контроля',
    newEmployee: '+ Новый сотрудник',
    assignShift: 'Назначить смену',
    calculatePayroll: '$ Рассчитать ЗП',
    tabEmployees: 'Сотрудники',
    tabShifts: 'Управление сменами',
    tabPayroll: 'Зарплаты и чеки',
    tabAudit: 'Аудит SHA-256',
    tabBilling: 'Тарифы и оплата',
    employeesDirectory: 'Справочник сотрудников',
    employeesDesc: 'Управление персоналом и почасовые ставки по тенантам.',
    name: 'Имя',
    role: 'Роль',
    hourlyRate: 'Ставка / Час',
    createdAt: 'Дата создания',
    verifyChain: 'Цепь SHA-256: Целостна (100% OK)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'Центр валидации PVC-U', validationSubtitle: 'Версионированные профили, уровни контроля и открытая проверка происхождения для операционных команд.', validationBack: 'Назад к панели', validationProfiles: 'Профили риска', validationSources: 'Каталог открытых источников', validationRules: 'Правила работы', validationActive: 'Движок активен',
  },
  ar: {
    appTitle: 'AION Workforce',
    subtitle: 'نظام سحابي متعدد المستأجرين لإدارة المناوبات والرواتب مع سجل تدقيق SHA-256 غير قابل للتغيير',
    activeEmployees: 'الموظفون النشطون',
    scheduledShifts: 'المناوبات المجدولة',
    payrollCost: 'تكلفة الرواتب',
    shiftAlerts: 'تنبيهات المناوبات',
    planLimit: 'حد الخطة',
    unlimited: 'غير محدود',
    weeklyMonthly: 'أسبوعي وشهرى',
    calculatedLedger: 'محسوب باستخدام سجل غير قابل للتغيير',
    pendingApproval: 'في انتظار الموافقة',
    operationalContext: 'السياق التشغيلي',
    openDataMadrid: 'البيانات المفتوحة · Open-Meteo · مدريد',
    cacheStatus: 'يتم الاحتفاظ بآخر حالة معروفة عند توفر الذاكرة المؤقتة.',
    controlPanel: 'لوحة التحكم التشغيلية',
    newEmployee: '+ موظف جديد',
    assignShift: 'تعيين مناوبة',
    calculatePayroll: '$ حساب الرواتب',
    tabEmployees: 'الموظفون',
    tabShifts: 'إدارة المناوبات',
    tabPayroll: 'الرواتب والإيصالات',
    tabAudit: 'تدقيق SHA-256 غير القابل للتغيير',
    tabBilling: 'الخطط والفوترة',
    employeesDirectory: 'دليل الموظفين',
    employeesDesc: 'إدارة شؤون العاملين وأجور الساعات لكل مستأجر.',
    name: 'الاسم',
    role: 'الدور',
    hourlyRate: 'أجر الساعات',
    createdAt: 'تاريخ الإنشاء',
    verifyChain: 'سلسلة SHA-256: سليمة (100% سليم)',
    pvcuBadge: 'PVC-U',
    validationTitle: 'مركز التحقق PVC-U', validationSubtitle: 'ملفات تعريف بإصدارات وطبقات تحكم ومصدر مفتوح لفرق العمليات.', validationBack: 'العودة إلى لوحة التحكم', validationProfiles: 'ملفات مخاطر', validationSources: 'دليل المصادر المفتوحة', validationRules: 'قواعد التشغيل', validationActive: 'المحرك نشط',
  },
};

export const localeByLanguage: Record<Language, string> = {
  es: 'es-ES', en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-PT', zh: 'zh-CN', ja: 'ja-JP', ru: 'ru-RU', ar: 'ar-SA',
};

export function formatCurrency(value: number | string, language: Language, currency = 'EUR') {
  return new Intl.NumberFormat(localeByLanguage[language], { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
}

export function formatDateTime(value: Date | string | number, language: Language) {
  return new Intl.DateTimeFormat(localeByLanguage[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatDate(value: Date | string | number, language: Language) {
  return new Intl.DateTimeFormat(localeByLanguage[language], { dateStyle: 'medium' }).format(new Date(value));
}

export function formatTime(value: Date | string | number, language: Language) {
  return new Intl.DateTimeFormat(localeByLanguage[language], { timeStyle: 'short' }).format(new Date(value));
}

export function formatMonthYear(value: Date | string | number, language: Language) {
  return new Intl.DateTimeFormat(localeByLanguage[language], { month: 'long', year: 'numeric' }).format(new Date(value));
}

export function applyDocumentLocale(language: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

export const extendedTranslations: Record<Language, Record<string, string>> = {
  es: { registerEmployee:'Registrar Nuevo Empleado', fullName:'Nombre Completo', selectEmployee:'Seleccionar empleado', saveLedger:'Guardar y Registrar en Ledger', scheduleNewShift:'Programar Nuevo Turno', startDateTime:'Fecha y Hora de Inicio', endDateTime:'Fecha y Hora de Fin', scheduleShift:'Programar Turno', generatePayroll:'Generar Recibo de Nómina', hoursWorked:'Horas Trabajadas en el Período', calculateHash:'Calcular y Generar Hash SHA-256', close:'Cerrar', edit:'Editar', cancel:'Cancelar', saveChanges:'Guardar cambios', shiftsCalendar:'Calendario de Turnos', shiftsDesc:'Visualización y control de turnos programados.', filterEmployee:'Filtrar empleado', filterDepartment:'Filtrar departamento', allEmployees:'Todos los empleados', allDepartments:'Todos los departamentos', clearFilters:'Limpiar filtros', previousPeriod:'Período anterior', nextPeriod:'Período siguiente', week:'Semana', month:'Mes', payrollReceipts:'Recibos de Nómina', payrollDesc:'Cálculos salariales auditados e inmutables.', exportCsv:'Exportar CSV', preparing:'Preparando…', totalAmount:'Importe Total', period:'Período', hash:'Hash Criptográfico SHA-256', date:'Fecha', auditTitle:'Auditoría Inmutable (Ledger SHA-256)', auditDesc:'Cadena de bloques de eventos laborales encadenados criptográficamente.', planFree:'Plan Free', planPro:'Plan Pro', planEnterprise:'Plan Enterprise', perMonth:'/ mes' },
  en: { registerEmployee:'Register New Employee', fullName:'Full Name', selectEmployee:'Select employee', saveLedger:'Save and Record in Ledger', scheduleNewShift:'Schedule New Shift', startDateTime:'Start Date and Time', endDateTime:'End Date and Time', scheduleShift:'Schedule Shift', generatePayroll:'Generate Payroll Receipt', hoursWorked:'Hours Worked in Period', calculateHash:'Calculate and Generate SHA-256 Hash', close:'Close', edit:'Edit', cancel:'Cancel', saveChanges:'Save changes', shiftsCalendar:'Shift Calendar', shiftsDesc:'View and control scheduled shifts.', filterEmployee:'Filter employee', filterDepartment:'Filter department', allEmployees:'All employees', allDepartments:'All departments', clearFilters:'Clear filters', previousPeriod:'Previous period', nextPeriod:'Next period', week:'Week', month:'Month', payrollReceipts:'Payroll Receipts', payrollDesc:'Audited and immutable payroll calculations.', exportCsv:'Export CSV', preparing:'Preparing…', totalAmount:'Total Amount', period:'Period', hash:'SHA-256 Cryptographic Hash', date:'Date', auditTitle:'Immutable Audit (SHA-256 Ledger)', auditDesc:'Cryptographically chained labor event ledger.', planFree:'Free Plan', planPro:'Pro Plan', planEnterprise:'Enterprise Plan', perMonth:'/ month' },
  fr: { registerEmployee:'Enregistrer un nouvel employé', fullName:'Nom complet', selectEmployee:'Sélectionner un employé', saveLedger:'Enregistrer dans le registre', scheduleNewShift:'Planifier un nouveau quart', startDateTime:'Date et heure de début', endDateTime:'Date et heure de fin', scheduleShift:'Planifier le quart', generatePayroll:'Générer le bulletin de paie', hoursWorked:'Heures travaillées sur la période', calculateHash:'Calculer et générer le hash SHA-256', close:'Fermer', edit:'Modifier', cancel:'Annuler', saveChanges:'Enregistrer les modifications', shiftsCalendar:'Calendrier des quarts', shiftsDesc:'Visualisation et contrôle des quarts planifiés.', filterEmployee:'Filtrer par employé', filterDepartment:'Filtrer par service', allEmployees:'Tous les employés', allDepartments:'Tous les services', clearFilters:'Effacer les filtres', previousPeriod:'Période précédente', nextPeriod:'Période suivante', week:'Semaine', month:'Mois', payrollReceipts:'Bulletins de paie', payrollDesc:'Calculs de paie audités et immuables.', exportCsv:'Exporter CSV', preparing:'Préparation…', totalAmount:'Montant total', period:'Période', hash:'Hash cryptographique SHA-256', date:'Date', auditTitle:'Audit immuable (registre SHA-256)', auditDesc:'Chaîne d’événements professionnels liée cryptographiquement.', planFree:'Forfait gratuit', planPro:'Forfait Pro', planEnterprise:'Forfait Enterprise', perMonth:'/ mois' },
  de: { registerEmployee:'Neuen Mitarbeiter registrieren', fullName:'Vollständiger Name', selectEmployee:'Mitarbeiter auswählen', saveLedger:'Speichern und im Ledger protokollieren', scheduleNewShift:'Neue Schicht planen', startDateTime:'Startdatum und -zeit', endDateTime:'Enddatum und -zeit', scheduleShift:'Schicht planen', generatePayroll:'Lohnabrechnung erstellen', hoursWorked:'Gearbeitete Stunden im Zeitraum', calculateHash:'SHA-256-Hash berechnen und erstellen', close:'Schließen', edit:'Bearbeiten', cancel:'Abbrechen', saveChanges:'Änderungen speichern', shiftsCalendar:'Schichtkalender', shiftsDesc:'Geplante Schichten anzeigen und steuern.', filterEmployee:'Mitarbeiter filtern', filterDepartment:'Abteilung filtern', allEmployees:'Alle Mitarbeiter', allDepartments:'Alle Abteilungen', clearFilters:'Filter löschen', previousPeriod:'Vorheriger Zeitraum', nextPeriod:'Nächster Zeitraum', week:'Woche', month:'Monat', payrollReceipts:'Lohnabrechnungen', payrollDesc:'Geprüfte und unveränderliche Lohnberechnungen.', exportCsv:'CSV exportieren', preparing:'Wird vorbereitet…', totalAmount:'Gesamtbetrag', period:'Zeitraum', hash:'Kryptografischer SHA-256-Hash', date:'Datum', auditTitle:'Unveränderliches Audit (SHA-256-Ledger)', auditDesc:'Kryptografisch verkettetes Arbeitsereignis-Ledger.', planFree:'Free-Tarif', planPro:'Pro-Tarif', planEnterprise:'Enterprise-Tarif', perMonth:'/ Monat' },
  it: { registerEmployee:'Registra nuovo dipendente', fullName:'Nome completo', selectEmployee:'Seleziona dipendente', saveLedger:'Salva e registra nel ledger', scheduleNewShift:'Pianifica nuovo turno', startDateTime:'Data e ora di inizio', endDateTime:'Data e ora di fine', scheduleShift:'Pianifica turno', generatePayroll:'Genera cedolino', hoursWorked:'Ore lavorate nel periodo', calculateHash:'Calcola e genera hash SHA-256', close:'Chiudi', edit:'Modifica', cancel:'Annulla', saveChanges:'Salva modifiche', shiftsCalendar:'Calendario turni', shiftsDesc:'Visualizzazione e controllo dei turni pianificati.', filterEmployee:'Filtra dipendente', filterDepartment:'Filtra reparto', allEmployees:'Tutti i dipendenti', allDepartments:'Tutti i reparti', clearFilters:'Cancella filtri', previousPeriod:'Periodo precedente', nextPeriod:'Periodo successivo', week:'Settimana', month:'Mese', payrollReceipts:'Cedolini paga', payrollDesc:'Calcoli salariali verificati e immutabili.', exportCsv:'Esporta CSV', preparing:'Preparazione…', totalAmount:'Importo totale', period:'Periodo', hash:'Hash crittografico SHA-256', date:'Data', auditTitle:'Audit immutabile (ledger SHA-256)', auditDesc:'Registro di eventi lavorativi concatenati crittograficamente.', planFree:'Piano Free', planPro:'Piano Pro', planEnterprise:'Piano Enterprise', perMonth:'/ mese' },
  pt: { registerEmployee:'Registar novo funcionário', fullName:'Nome completo', selectEmployee:'Selecionar funcionário', saveLedger:'Guardar e registar no ledger', scheduleNewShift:'Agendar novo turno', startDateTime:'Data e hora de início', endDateTime:'Data e hora de fim', scheduleShift:'Agendar turno', generatePayroll:'Gerar recibo de vencimento', hoursWorked:'Horas trabalhadas no período', calculateHash:'Calcular e gerar hash SHA-256', close:'Fechar', edit:'Editar', cancel:'Cancelar', saveChanges:'Guardar alterações', shiftsCalendar:'Calendário de turnos', shiftsDesc:'Visualização e controlo dos turnos agendados.', filterEmployee:'Filtrar funcionário', filterDepartment:'Filtrar departamento', allEmployees:'Todos os funcionários', allDepartments:'Todos os departamentos', clearFilters:'Limpar filtros', previousPeriod:'Período anterior', nextPeriod:'Período seguinte', week:'Semana', month:'Mês', payrollReceipts:'Recibos de vencimento', payrollDesc:'Cálculos salariais auditados e imutáveis.', exportCsv:'Exportar CSV', preparing:'A preparar…', totalAmount:'Montante total', period:'Período', hash:'Hash criptográfico SHA-256', date:'Data', auditTitle:'Auditoria imutável (ledger SHA-256)', auditDesc:'Cadeia de eventos laborais ligada criptograficamente.', planFree:'Plano Free', planPro:'Plano Pro', planEnterprise:'Plano Enterprise', perMonth:'/ mês' },
  zh: { registerEmployee:'登记新员工', fullName:'姓名', selectEmployee:'选择员工', saveLedger:'保存并写入账本', scheduleNewShift:'安排新班次', startDateTime:'开始日期和时间', endDateTime:'结束日期和时间', scheduleShift:'安排班次', generatePayroll:'生成工资单', hoursWorked:'期间工作小时数', calculateHash:'计算并生成 SHA-256 哈希', close:'关闭', edit:'编辑', cancel:'取消', saveChanges:'保存更改', shiftsCalendar:'班次日历', shiftsDesc:'查看和控制已安排的班次。', filterEmployee:'筛选员工', filterDepartment:'筛选部门', allEmployees:'所有员工', allDepartments:'所有部门', clearFilters:'清除筛选', previousPeriod:'上一周期', nextPeriod:'下一周期', week:'周', month:'月', payrollReceipts:'工资单', payrollDesc:'经过审计且不可变的工资计算。', exportCsv:'导出 CSV', preparing:'准备中…', totalAmount:'总金额', period:'期间', hash:'SHA-256 加密哈希', date:'日期', auditTitle:'不可变审计（SHA-256 账本）', auditDesc:'经过密码学链接的劳动事件账本。', planFree:'免费计划', planPro:'专业计划', planEnterprise:'企业计划', perMonth:'/ 月' },
  ja: { registerEmployee:'新しい従業員を登録', fullName:'氏名', selectEmployee:'従業員を選択', saveLedger:'保存して台帳に記録', scheduleNewShift:'新しいシフトを予定', startDateTime:'開始日時', endDateTime:'終了日時', scheduleShift:'シフトを予定', generatePayroll:'給与明細を生成', hoursWorked:'期間の勤務時間', calculateHash:'SHA-256ハッシュを計算・生成', close:'閉じる', edit:'編集', cancel:'キャンセル', saveChanges:'変更を保存', shiftsCalendar:'シフトカレンダー', shiftsDesc:'予定されたシフトを表示・管理します。', filterEmployee:'従業員で絞り込む', filterDepartment:'部門で絞り込む', allEmployees:'全従業員', allDepartments:'全部門', clearFilters:'フィルターを解除', previousPeriod:'前の期間', nextPeriod:'次の期間', week:'週', month:'月', payrollReceipts:'給与明細', payrollDesc:'監査済みで改ざんできない給与計算。', exportCsv:'CSVをエクスポート', preparing:'準備中…', totalAmount:'合計金額', period:'期間', hash:'SHA-256暗号ハッシュ', date:'日付', auditTitle:'不変監査（SHA-256台帳）', auditDesc:'暗号学的に連結された労務イベント台帳。', planFree:'無料プラン', planPro:'Proプラン', planEnterprise:'Enterpriseプラン', perMonth:'/ 月' },
  ru: { registerEmployee:'Зарегистрировать сотрудника', fullName:'Полное имя', selectEmployee:'Выберите сотрудника', saveLedger:'Сохранить и записать в журнал', scheduleNewShift:'Запланировать новую смену', startDateTime:'Дата и время начала', endDateTime:'Дата и время окончания', scheduleShift:'Запланировать смену', generatePayroll:'Создать расчетный лист', hoursWorked:'Отработано часов за период', calculateHash:'Рассчитать и создать хеш SHA-256', close:'Закрыть', edit:'Изменить', cancel:'Отмена', saveChanges:'Сохранить изменения', shiftsCalendar:'Календарь смен', shiftsDesc:'Просмотр и управление запланированными сменами.', filterEmployee:'Фильтр по сотруднику', filterDepartment:'Фильтр по отделу', allEmployees:'Все сотрудники', allDepartments:'Все отделы', clearFilters:'Очистить фильтры', previousPeriod:'Предыдущий период', nextPeriod:'Следующий период', week:'Неделя', month:'Месяц', payrollReceipts:'Расчетные листы', payrollDesc:'Проверенные и неизменяемые расчеты зарплаты.', exportCsv:'Экспорт CSV', preparing:'Подготовка…', totalAmount:'Итоговая сумма', period:'Период', hash:'Криптографический хеш SHA-256', date:'Дата', auditTitle:'Неизменяемый аудит (журнал SHA-256)', auditDesc:'Криптографически связанный журнал трудовых событий.', planFree:'Бесплатный план', planPro:'План Pro', planEnterprise:'План Enterprise', perMonth:'/ месяц' },
  ar: { registerEmployee:'تسجيل موظف جديد', fullName:'الاسم الكامل', selectEmployee:'اختيار الموظف', saveLedger:'حفظ وتسجيل في السجل', scheduleNewShift:'جدولة مناوبة جديدة', startDateTime:'تاريخ ووقت البداية', endDateTime:'تاريخ ووقت النهاية', scheduleShift:'جدولة المناوبة', generatePayroll:'إنشاء قسيمة راتب', hoursWorked:'ساعات العمل خلال الفترة', calculateHash:'حساب وإنشاء تجزئة SHA-256', close:'إغلاق', edit:'تعديل', cancel:'إلغاء', saveChanges:'حفظ التغييرات', shiftsCalendar:'تقويم المناوبات', shiftsDesc:'عرض وإدارة المناوبات المجدولة.', filterEmployee:'تصفية حسب الموظف', filterDepartment:'تصفية حسب القسم', allEmployees:'جميع الموظفين', allDepartments:'جميع الأقسام', clearFilters:'مسح عوامل التصفية', previousPeriod:'الفترة السابقة', nextPeriod:'الفترة التالية', week:'أسبوع', month:'شهر', payrollReceipts:'قسائم الرواتب', payrollDesc:'حسابات رواتب مدققة وغير قابلة للتغيير.', exportCsv:'تصدير CSV', preparing:'جارٍ التحضير…', totalAmount:'المبلغ الإجمالي', period:'الفترة', hash:'تجزئة SHA-256 التشفيرية', date:'التاريخ', auditTitle:'تدقيق غير قابل للتغيير (سجل SHA-256)', auditDesc:'سجل أحداث عمل مرتبطة تشفيرياً.', planFree:'الخطة المجانية', planPro:'خطة Pro', planEnterprise:'خطة Enterprise', perMonth:'/ شهر' },
};

export const validationTranslations: Record<Language, Record<string, string>> = {
  es: { controlOperational:'Control operativo', activeLayers:'Capas activas', layersDescription:'Estructura, semántica, seguridad, concurrencia y evidencia.', aiSpheres:'Subesferas IA', aiDescription:'Prompt/response, semántica y ciclo de vida del modelo.', evidence:'Evidencia', evidenceDescription:'Payloads sensibles no se almacenan; se conserva el hash.', safeBlock:'Bloqueo seguro en operaciones críticas', sourceDescription:'Procedencia, límites y fallback antes de integrar cualquier dataset.', updatedLabel:'Actualización', fallbackLabel:'Fallback', sourceLabel:'Fuente', failureMode:'Modo de fallo', noAutoApply:'No se auto-aplican cambios.', noRawPrompts:'No se almacenan prompts crudos.', noImplicitCertification:'No hay certificación implícita.', humanReview:'La deriva de modelos, políticas nuevas y acciones irreversibles requieren revisión humana.', hashRetention:'El sistema conserva hashes, resultado, versión de política y envelope de validación.', independentReview:'La evidencia local ayuda a auditar; una conformidad normativa requiere revisión independiente.', riskLow:'Bajo', riskMedium:'Medio', riskHigh:'Alto', riskCritical:'Crítico' },
  en: { controlOperational:'Operational control', activeLayers:'Active layers', layersDescription:'Structure, semantics, security, concurrency and evidence.', aiSpheres:'AI sub-spheres', aiDescription:'Prompt/response, semantics and model lifecycle.', evidence:'Evidence', evidenceDescription:'Sensitive payloads are not stored; only the hash is retained.', safeBlock:'Safe blocking for critical operations', sourceDescription:'Provenance, limits and fallback before integrating any dataset.', updatedLabel:'Updated', fallbackLabel:'Fallback', sourceLabel:'Source', failureMode:'Failure mode', noAutoApply:'Changes are never auto-applied.', noRawPrompts:'Raw prompts are not stored.', noImplicitCertification:'No implicit certification.', humanReview:'Model drift, new policies and irreversible actions require human review.', hashRetention:'The system retains hashes, outcome, policy version and validation envelope.', independentReview:'Local evidence supports audits; regulatory conformity requires independent review.', riskLow:'Low', riskMedium:'Medium', riskHigh:'High', riskCritical:'Critical' },
  fr: { controlOperational:'Contrôle opérationnel', activeLayers:'Couches actives', layersDescription:'Structure, sémantique, sécurité, concurrence et preuve.', aiSpheres:'Sous-domaines IA', aiDescription:'Prompt/réponse, sémantique et cycle de vie du modèle.', evidence:'Preuve', evidenceDescription:'Les données sensibles ne sont pas stockées ; seul le hash est conservé.', safeBlock:'Blocage sécurisé des opérations critiques', sourceDescription:'Provenance, limites et fallback avant toute intégration de données.', updatedLabel:'Mise à jour', fallbackLabel:'Fallback', sourceLabel:'Source', failureMode:'Mode d’échec', noAutoApply:'Les changements ne sont jamais appliqués automatiquement.', noRawPrompts:'Les prompts bruts ne sont pas stockés.', noImplicitCertification:'Aucune certification implicite.', humanReview:'La dérive des modèles et les actions irréversibles exigent une revue humaine.', hashRetention:'Le système conserve les hashes, le résultat, la version de politique et l’enveloppe.', independentReview:'La conformité réglementaire exige une revue indépendante.', riskLow:'Faible', riskMedium:'Moyen', riskHigh:'Élevé', riskCritical:'Critique' },
  de: { controlOperational:'Betriebskontrolle', activeLayers:'Aktive Ebenen', layersDescription:'Struktur, Semantik, Sicherheit, Nebenläufigkeit und Nachweis.', aiSpheres:'KI-Teilbereiche', aiDescription:'Prompt/Antwort, Semantik und Modelllebenszyklus.', evidence:'Nachweis', evidenceDescription:'Sensible Payloads werden nicht gespeichert; nur der Hash bleibt erhalten.', safeBlock:'Sichere Sperre für kritische Vorgänge', sourceDescription:'Herkunft, Grenzen und Fallback vor der Integration von Daten.', updatedLabel:'Aktualisierung', fallbackLabel:'Fallback', sourceLabel:'Quelle', failureMode:'Fehlermodus', noAutoApply:'Änderungen werden nie automatisch angewendet.', noRawPrompts:'Rohe Prompts werden nicht gespeichert.', noImplicitCertification:'Keine implizite Zertifizierung.', humanReview:'Modelldrift und irreversible Aktionen erfordern eine menschliche Prüfung.', hashRetention:'Hashes, Ergebnis, Richtlinienversion und Validierungshülle bleiben erhalten.', independentReview:'Regulatorische Konformität erfordert eine unabhängige Prüfung.', riskLow:'Niedrig', riskMedium:'Mittel', riskHigh:'Hoch', riskCritical:'Kritisch' },
  it: { controlOperational:'Controllo operativo', activeLayers:'Livelli attivi', layersDescription:'Struttura, semantica, sicurezza, concorrenza ed evidenza.', aiSpheres:'Sotto-ambiti IA', aiDescription:'Prompt/risposta, semantica e ciclo di vita del modello.', evidence:'Evidenza', evidenceDescription:'I payload sensibili non vengono memorizzati; si conserva solo l’hash.', safeBlock:'Blocco sicuro per operazioni critiche', sourceDescription:'Provenienza, limiti e fallback prima di integrare un dataset.', updatedLabel:'Aggiornamento', fallbackLabel:'Fallback', sourceLabel:'Fonte', failureMode:'Modalità di errore', noAutoApply:'Le modifiche non vengono mai applicate automaticamente.', noRawPrompts:'I prompt grezzi non vengono memorizzati.', noImplicitCertification:'Nessuna certificazione implicita.', humanReview:'La deriva dei modelli e le azioni irreversibili richiedono revisione umana.', hashRetention:'Il sistema conserva hash, risultato, versione della policy ed envelope.', independentReview:'La conformità normativa richiede una revisione indipendente.', riskLow:'Basso', riskMedium:'Medio', riskHigh:'Alto', riskCritical:'Critico' },
  pt: { controlOperational:'Controlo operacional', activeLayers:'Camadas ativas', layersDescription:'Estrutura, semântica, segurança, concorrência e evidência.', aiSpheres:'Subáreas de IA', aiDescription:'Prompt/resposta, semântica e ciclo de vida do modelo.', evidence:'Evidência', evidenceDescription:'Os payloads sensíveis não são armazenados; apenas o hash é mantido.', safeBlock:'Bloqueio seguro em operações críticas', sourceDescription:'Procedência, limites e fallback antes de integrar qualquer dataset.', updatedLabel:'Atualização', fallbackLabel:'Fallback', sourceLabel:'Fonte', failureMode:'Modo de falha', noAutoApply:'As alterações nunca são aplicadas automaticamente.', noRawPrompts:'Os prompts brutos não são armazenados.', noImplicitCertification:'Sem certificação implícita.', humanReview:'A deriva dos modelos e ações irreversíveis exigem revisão humana.', hashRetention:'O sistema mantém hashes, resultado, versão da política e envelope.', independentReview:'A conformidade regulamentar exige revisão independente.', riskLow:'Baixo', riskMedium:'Médio', riskHigh:'Alto', riskCritical:'Crítico' },
  zh: { controlOperational:'运营控制', activeLayers:'活动层', layersDescription:'结构、语义、安全、并发与证据。', aiSpheres:'AI 子领域', aiDescription:'提示词/响应、语义与模型生命周期。', evidence:'证据', evidenceDescription:'不存储敏感载荷，仅保留哈希。', safeBlock:'关键操作安全阻断', sourceDescription:'集成数据集前验证来源、限制和回退。', updatedLabel:'更新时间', fallbackLabel:'回退', sourceLabel:'来源', failureMode:'故障模式', noAutoApply:'更改不会自动应用。', noRawPrompts:'不存储原始提示词。', noImplicitCertification:'不代表隐含认证。', humanReview:'模型漂移和不可逆操作需要人工审查。', hashRetention:'系统保留哈希、结果、策略版本和验证信封。', independentReview:'法规合规需要独立审查。', riskLow:'低', riskMedium:'中', riskHigh:'高', riskCritical:'严重' },
  ja: { controlOperational:'運用コントロール', activeLayers:'有効なレイヤー', layersDescription:'構造、意味論、セキュリティ、同時実行性、証拠。', aiSpheres:'AIサブ領域', aiDescription:'プロンプト/応答、意味論、モデルのライフサイクル。', evidence:'証拠', evidenceDescription:'機密ペイロードは保存せず、ハッシュのみ保持します。', safeBlock:'重要操作の安全なブロック', sourceDescription:'データセット統合前に出所、制限、フォールバックを確認します。', updatedLabel:'更新', fallbackLabel:'フォールバック', sourceLabel:'ソース', failureMode:'失敗モード', noAutoApply:'変更は自動適用されません。', noRawPrompts:'生のプロンプトは保存されません。', noImplicitCertification:'暗黙の認証ではありません。', humanReview:'モデルのドリフトと不可逆操作には人の確認が必要です。', hashRetention:'ハッシュ、結果、ポリシー版、検証エンベロープを保持します。', independentReview:'規制適合には独立した審査が必要です。', riskLow:'低', riskMedium:'中', riskHigh:'高', riskCritical:'重大' },
  ru: { controlOperational:'Операционный контроль', activeLayers:'Активные уровни', layersDescription:'Структура, семантика, безопасность, конкуренция и доказательства.', aiSpheres:'Подсферы ИИ', aiDescription:'Промпт/ответ, семантика и жизненный цикл модели.', evidence:'Доказательства', evidenceDescription:'Чувствительные данные не хранятся; сохраняется только хеш.', safeBlock:'Безопасная блокировка критических операций', sourceDescription:'Происхождение, ограничения и fallback до интеграции набора данных.', updatedLabel:'Обновление', fallbackLabel:'Fallback', sourceLabel:'Источник', failureMode:'Режим сбоя', noAutoApply:'Изменения никогда не применяются автоматически.', noRawPrompts:'Сырые промпты не сохраняются.', noImplicitCertification:'Сертификация не подразумевается.', humanReview:'Дрейф моделей и необратимые действия требуют проверки человеком.', hashRetention:'Сохраняются хеши, результат, версия политики и envelope.', independentReview:'Соответствие нормам требует независимой проверки.', riskLow:'Низкий', riskMedium:'Средний', riskHigh:'Высокий', riskCritical:'Критический' },
  ar: { controlOperational:'التحكم التشغيلي', activeLayers:'الطبقات النشطة', layersDescription:'البنية والدلالة والأمان والتزامن والأدلة.', aiSpheres:'المجالات الفرعية للذكاء الاصطناعي', aiDescription:'الموجه/الاستجابة والدلالة ودورة حياة النموذج.', evidence:'الأدلة', evidenceDescription:'لا يتم تخزين البيانات الحساسة؛ يتم الاحتفاظ بالتجزئة فقط.', safeBlock:'حظر آمن للعمليات الحرجة', sourceDescription:'التحقق من المصدر والحدود والبديل قبل دمج أي مجموعة بيانات.', updatedLabel:'التحديث', fallbackLabel:'البديل', sourceLabel:'المصدر', failureMode:'وضع الفشل', noAutoApply:'لا يتم تطبيق التغييرات تلقائياً.', noRawPrompts:'لا يتم تخزين الموجهات الخام.', noImplicitCertification:'لا توجد شهادة ضمنية.', humanReview:'يتطلب انحراف النموذج والإجراءات غير القابلة للعكس مراجعة بشرية.', hashRetention:'يحتفظ النظام بالتجزئة والنتيجة وإصدار السياسة وغلاف التحقق.', independentReview:'يتطلب الامتثال التنظيمي مراجعة مستقلة.', riskLow:'منخفض', riskMedium:'متوسط', riskHigh:'مرتفع', riskCritical:'حرج' },
};

export const uiTranslations: Partial<Record<Language, Record<string, string>>> = {
  es: {
    roleLabel:'Rol', employeeRole:'Empleado', managerRole:'Manager', adminRole:'Administrador', employeeLabel:'Empleado', individualFile:'Ficha individual', shiftsLabel:'Turnos', payrollLabel:'Nóminas', incidentsLabel:'Incidencias', recentShifts:'Últimos turnos', filterEmployee:'Filtrar empleado', filterDepartment:'Filtrar departamento', allEmployees:'Todos los empleados', allDepartments:'Todos los departamentos', clearFilters:'Limpiar filtros', previousPeriod:'Período anterior', nextPeriod:'Período siguiente', availableFromPro:'Disponible desde Pro', monthlyView:'Vista mensual', sun:'Dom', mon:'Lun', tue:'Mar', wed:'Mié', thu:'Jue', fri:'Vie', sat:'Sáb', unassigned:'Sin asignar', more:'más', start:'Inicio', end:'Fin', status:'Estado', actions:'Acciones', editShift:'Editar turno', hours:'Horas', currentHash:'Current Hash', previousHash:'Previous Hash', genesisBlock:'GENESIS_BLOCK', freeDescription:'Para pequeños equipos iniciales.', proDescription:'Para empresas en crecimiento.', enterpriseDescription:'Para grandes corporaciones y logística.', freeEmployees:'Hasta 5 empleados', basicShifts:'Turnos básicos', immutableLedger:'Ledger SHA-256', unlimitedEmployees:'Empleados ilimitados', advancedShifts:'Turnos y calendarios avanzados', priorityAudit:'Auditoría inmutable prioritaria', everythingPro:'Todo lo incluido en Pro', dedicatedSupport:'Soporte 24/7 dedicado', exportableApi:'API de inspección laboral exportable', applyPlan:'Activar plan', subscribe:'Suscribirse' },
};

export const uiMoreTranslations: Partial<Record<Language, Record<string, string>>> = {
  es: { employeePlaceholder:'Ej. Roberto Sánchez', apiVerification:'Verificación API: /api/audit/verify', currentPlan:'Plan Actual', switchToFree:'Cambiar a Free', selectPro:'Seleccionar Pro', selectEnterprise:'Seleccionar Enterprise' },
  en: { employeePlaceholder:'e.g. Roberto Sanchez', apiVerification:'API verification: /api/audit/verify', currentPlan:'Current Plan', switchToFree:'Switch to Free', selectPro:'Select Pro', selectEnterprise:'Select Enterprise' },
  fr: { employeePlaceholder:'ex. Roberto Sanchez', apiVerification:'Vérification API : /api/audit/verify', currentPlan:'Forfait actuel', switchToFree:'Passer au forfait gratuit', selectPro:'Choisir Pro', selectEnterprise:'Choisir Enterprise' },
  de: { employeePlaceholder:'z. B. Roberto Sanchez', apiVerification:'API-Verifizierung: /api/audit/verify', currentPlan:'Aktueller Tarif', switchToFree:'Zu Free wechseln', selectPro:'Pro auswählen', selectEnterprise:'Enterprise auswählen' },
  it: { employeePlaceholder:'es. Roberto Sanchez', apiVerification:'Verifica API: /api/audit/verify', currentPlan:'Piano attuale', switchToFree:'Passa a Free', selectPro:'Seleziona Pro', selectEnterprise:'Seleziona Enterprise' },
  pt: { employeePlaceholder:'ex. Roberto Sanchez', apiVerification:'Verificação API: /api/audit/verify', currentPlan:'Plano atual', switchToFree:'Mudar para Free', selectPro:'Selecionar Pro', selectEnterprise:'Selecionar Enterprise' },
  zh: { employeePlaceholder:'例如：Roberto Sanchez', apiVerification:'API 验证：/api/audit/verify', currentPlan:'当前计划', switchToFree:'切换到免费版', selectPro:'选择专业版', selectEnterprise:'选择企业版' },
  ja: { employeePlaceholder:'例：Roberto Sanchez', apiVerification:'API検証: /api/audit/verify', currentPlan:'現在のプラン', switchToFree:'Freeに変更', selectPro:'Proを選択', selectEnterprise:'Enterpriseを選択' },
  ru: { employeePlaceholder:'например, Roberto Sanchez', apiVerification:'Проверка API: /api/audit/verify', currentPlan:'Текущий план', switchToFree:'Перейти на Free', selectPro:'Выбрать Pro', selectEnterprise:'Выбрать Enterprise' },
  ar: { employeePlaceholder:'مثال: Roberto Sanchez', apiVerification:'تحقق API: /api/audit/verify', currentPlan:'الخطة الحالية', switchToFree:'التبديل إلى المجانية', selectPro:'اختيار Pro', selectEnterprise:'اختيار Enterprise' },
};

export const dynamicTranslations: Record<Language, Record<string, string>> = {
  es: { role_owner:'Propietario', role_admin:'Administrador', role_manager:'Manager', role_employee:'Empleado', role_anonymous:'Anónimo', status_scheduled:'Programado', status_completed:'Completado', status_cancelled:'Cancelado', status_pending:'Pendiente', status_open:'Abierto', status_in_progress:'En curso', status_resolved:'Resuelto', status_catalogued:'Catalogada', status_verified:'Verificada', status_disabled:'Desactivada', failure_fail_degraded:'Degradado seguro', failure_fail_closed:'Cierre seguro', failure_human_review:'Revisión humana', failure_quarantine:'Cuarentena', failure_fail_open_supervised:'Apertura supervisada', profile_low:'Perfil de validación de riesgo bajo de AION Workforce', profile_medium:'Perfil de validación de riesgo medio de AION Workforce', profile_high:'Perfil de validación de riesgo alto de AION Workforce', profile_critical:'Perfil de validación de riesgo crítico de AION Workforce', source_eurostatapi_use:'Referencias estadísticas públicas y contexto económico; no datos personales.', source_dataeuropa_use:'Descubrimiento de conjuntos de datos públicos europeos.', source_openmeteo_use:'Contexto meteorológico opcional para planificación, nunca decisión salarial automática.', cadence_dataset:'Según dataset', cadence_cache:'Consulta bajo demanda con caché', fallback_cache:'Caché', fallback_manual:'Manual', fallback_disabled:'Desactivado' },
  en: { role_owner:'Owner', role_admin:'Administrator', role_manager:'Manager', role_employee:'Employee', role_anonymous:'Anonymous', status_scheduled:'Scheduled', status_completed:'Completed', status_cancelled:'Cancelled', status_pending:'Pending', status_open:'Open', status_in_progress:'In progress', status_resolved:'Resolved', status_catalogued:'Catalogued', status_verified:'Verified', status_disabled:'Disabled', failure_fail_degraded:'Safe degraded', failure_fail_closed:'Fail closed', failure_human_review:'Human review', failure_quarantine:'Quarantine', failure_fail_open_supervised:'Supervised fail open', profile_low:'AION Workforce low risk validation profile', profile_medium:'AION Workforce medium risk validation profile', profile_high:'AION Workforce high risk validation profile', profile_critical:'AION Workforce critical risk validation profile', source_eurostatapi_use:'Public statistics and economic context; no employee personal data.', source_dataeuropa_use:'Discovery of public European datasets.', source_openmeteo_use:'Optional weather context for planning, never automatic salary decisions.', cadence_dataset:'According to dataset', cadence_cache:'On-demand query with cache', fallback_cache:'Cache', fallback_manual:'Manual', fallback_disabled:'Disabled' },
  fr: { role_owner:'Propriétaire', role_admin:'Administrateur', role_manager:'Manager', role_employee:'Employé', role_anonymous:'Anonyme', status_scheduled:'Planifié', status_completed:'Terminé', status_cancelled:'Annulé', status_pending:'En attente', status_open:'Ouvert', status_in_progress:'En cours', status_resolved:'Résolu', status_catalogued:'Cataloguée', status_verified:'Vérifiée', status_disabled:'Désactivée', failure_fail_degraded:'Dégradé sécurisé', failure_fail_closed:'Fermeture sécurisée', failure_human_review:'Revue humaine', failure_quarantine:'Quarantaine', failure_fail_open_supervised:'Ouverture supervisée', profile_low:'Profil de validation AION Workforce à faible risque', profile_medium:'Profil de validation AION Workforce à risque moyen', profile_high:'Profil de validation AION Workforce à risque élevé', profile_critical:'Profil de validation AION Workforce à risque critique', source_eurostatapi_use:'Statistiques publiques et contexte économique ; aucune donnée personnelle.', source_dataeuropa_use:'Découverte de jeux de données publics européens.', source_openmeteo_use:'Contexte météo optionnel pour la planification, jamais pour le salaire.', cadence_dataset:'Selon le jeu de données', cadence_cache:'Requête à la demande avec cache', fallback_cache:'Cache', fallback_manual:'Manuel', fallback_disabled:'Désactivé' },
  de: { role_owner:'Eigentümer', role_admin:'Administrator', role_manager:'Manager', role_employee:'Mitarbeiter', role_anonymous:'Anonym', status_scheduled:'Geplant', status_completed:'Abgeschlossen', status_cancelled:'Storniert', status_pending:'Ausstehend', status_open:'Offen', status_in_progress:'In Bearbeitung', status_resolved:'Gelöst', status_catalogued:'Katalogisiert', status_verified:'Verifiziert', status_disabled:'Deaktiviert', failure_fail_degraded:'Sicher degradiert', failure_fail_closed:'Sicher geschlossen', failure_human_review:'Menschliche Prüfung', failure_quarantine:'Quarantäne', failure_fail_open_supervised:'Überwacht offen', profile_low:'AION Workforce Validierungsprofil mit geringem Risiko', profile_medium:'AION Workforce Validierungsprofil mit mittlerem Risiko', profile_high:'AION Workforce Validierungsprofil mit hohem Risiko', profile_critical:'AION Workforce Validierungsprofil mit kritischem Risiko', source_eurostatapi_use:'Öffentliche Statistiken und Wirtschaftskontext; keine personenbezogenen Daten.', source_dataeuropa_use:'Suche nach öffentlichen europäischen Datensätzen.', source_openmeteo_use:'Optionaler Wetterkontext für die Planung, nie für automatische Gehaltsentscheidungen.', cadence_dataset:'Je nach Datensatz', cadence_cache:'On-Demand-Abfrage mit Cache', fallback_cache:'Cache', fallback_manual:'Manuell', fallback_disabled:'Deaktiviert' },
  it: { role_owner:'Proprietario', role_admin:'Amministratore', role_manager:'Manager', role_employee:'Dipendente', role_anonymous:'Anonimo', status_scheduled:'Pianificato', status_completed:'Completato', status_cancelled:'Annullato', status_pending:'In attesa', status_open:'Aperto', status_in_progress:'In corso', status_resolved:'Risolto', status_catalogued:'Catalogata', status_verified:'Verificata', status_disabled:'Disattivata', failure_fail_degraded:'Degradato sicuro', failure_fail_closed:'Chiusura sicura', failure_human_review:'Revisione umana', failure_quarantine:'Quarantena', failure_fail_open_supervised:'Apertura supervisionata', profile_low:'Profilo di validazione AION Workforce a basso rischio', profile_medium:'Profilo di validazione AION Workforce a rischio medio', profile_high:'Profilo di validazione AION Workforce ad alto rischio', profile_critical:'Profilo di validazione AION Workforce a rischio critico', source_eurostatapi_use:'Statistiche pubbliche e contesto economico; nessun dato personale.', source_dataeuropa_use:'Scoperta di dataset pubblici europei.', source_openmeteo_use:'Contesto meteo opzionale per la pianificazione, mai per decisioni salariali automatiche.', cadence_dataset:'Secondo il dataset', cadence_cache:'Query su richiesta con cache', fallback_cache:'Cache', fallback_manual:'Manuale', fallback_disabled:'Disabilitato' },
  pt: { role_owner:'Proprietário', role_admin:'Administrador', role_manager:'Gestor', role_employee:'Funcionário', role_anonymous:'Anónimo', status_scheduled:'Agendado', status_completed:'Concluído', status_cancelled:'Cancelado', status_pending:'Pendente', status_open:'Aberto', status_in_progress:'Em curso', status_resolved:'Resolvido', status_catalogued:'Catalogada', status_verified:'Verificada', status_disabled:'Desativada', failure_fail_degraded:'Degradado seguro', failure_fail_closed:'Fecho seguro', failure_human_review:'Revisão humana', failure_quarantine:'Quarentena', failure_fail_open_supervised:'Abertura supervisionada', profile_low:'Perfil de validação AION Workforce de baixo risco', profile_medium:'Perfil de validação AION Workforce de risco médio', profile_high:'Perfil de validação AION Workforce de risco elevado', profile_critical:'Perfil de validação AION Workforce de risco crítico', source_eurostatapi_use:'Estatísticas públicas e contexto económico; sem dados pessoais.', source_dataeuropa_use:'Descoberta de conjuntos de dados públicos europeus.', source_openmeteo_use:'Contexto meteorológico opcional para planeamento, nunca para decisões salariais automáticas.', cadence_dataset:'Segundo o dataset', cadence_cache:'Consulta a pedido com cache', fallback_cache:'Cache', fallback_manual:'Manual', fallback_disabled:'Desativado' },
  zh: { role_owner:'所有者', role_admin:'管理员', role_manager:'经理', role_employee:'员工', role_anonymous:'匿名', status_scheduled:'已安排', status_completed:'已完成', status_cancelled:'已取消', status_pending:'待处理', status_open:'开放', status_in_progress:'进行中', status_resolved:'已解决', status_catalogued:'已编目', status_verified:'已验证', status_disabled:'已停用', failure_fail_degraded:'安全降级', failure_fail_closed:'安全关闭', failure_human_review:'人工审查', failure_quarantine:'隔离', failure_fail_open_supervised:'受监督开放', profile_low:'AION Workforce 低风险验证配置', profile_medium:'AION Workforce 中风险验证配置', profile_high:'AION Workforce 高风险验证配置', profile_critical:'AION Workforce 严重风险验证配置', source_eurostatapi_use:'公共统计和经济背景；不含个人数据。', source_dataeuropa_use:'发现欧洲公共数据集。', source_openmeteo_use:'用于规划的可选天气背景，绝不自动决定薪资。', cadence_dataset:'依据数据集', cadence_cache:'带缓存的按需查询', fallback_cache:'缓存', fallback_manual:'手动', fallback_disabled:'已停用' },
  ja: { role_owner:'所有者', role_admin:'管理者', role_manager:'マネージャー', role_employee:'従業員', role_anonymous:'匿名', status_scheduled:'予定', status_completed:'完了', status_cancelled:'キャンセル済み', status_pending:'保留中', status_open:'オープン', status_in_progress:'進行中', status_resolved:'解決済み', status_catalogued:'カタログ済み', status_verified:'検証済み', status_disabled:'無効', failure_fail_degraded:'安全な縮退', failure_fail_closed:'安全停止', failure_human_review:'人による確認', failure_quarantine:'隔離', failure_fail_open_supervised:'監督下の開放', profile_low:'AION Workforce 低リスク検証プロファイル', profile_medium:'AION Workforce 中リスク検証プロファイル', profile_high:'AION Workforce 高リスク検証プロファイル', profile_critical:'AION Workforce 重大リスク検証プロファイル', source_eurostatapi_use:'公開統計と経済コンテキスト。個人データは含みません。', source_dataeuropa_use:'欧州の公開データセットを検索します。', source_openmeteo_use:'計画用の任意の気象情報。給与判断には使用しません。', cadence_dataset:'データセットによる', cadence_cache:'キャッシュ付きオンデマンド照会', fallback_cache:'キャッシュ', fallback_manual:'手動', fallback_disabled:'無効' },
  ru: { role_owner:'Владелец', role_admin:'Администратор', role_manager:'Менеджер', role_employee:'Сотрудник', role_anonymous:'Аноним', status_scheduled:'Запланировано', status_completed:'Завершено', status_cancelled:'Отменено', status_pending:'Ожидает', status_open:'Открыто', status_in_progress:'В работе', status_resolved:'Решено', status_catalogued:'В каталоге', status_verified:'Проверено', status_disabled:'Отключено', failure_fail_degraded:'Безопасная деградация', failure_fail_closed:'Безопасное закрытие', failure_human_review:'Проверка человеком', failure_quarantine:'Карантин', failure_fail_open_supervised:'Контролируемое открытие', profile_low:'Профиль проверки AION Workforce с низким риском', profile_medium:'Профиль проверки AION Workforce со средним риском', profile_high:'Профиль проверки AION Workforce с высоким риском', profile_critical:'Профиль проверки AION Workforce с критическим риском', source_eurostatapi_use:'Открытая статистика и экономический контекст; без персональных данных.', source_dataeuropa_use:'Поиск открытых европейских наборов данных.', source_openmeteo_use:'Необязательный погодный контекст для планирования, не для автоматических решений о зарплате.', cadence_dataset:'По набору данных', cadence_cache:'Запрос по требованию с кэшем', fallback_cache:'Кэш', fallback_manual:'Вручную', fallback_disabled:'Отключено' },
  ar: { role_owner:'المالك', role_admin:'المسؤول', role_manager:'المدير', role_employee:'الموظف', role_anonymous:'مجهول', status_scheduled:'مجدول', status_completed:'مكتمل', status_cancelled:'ملغى', status_pending:'قيد الانتظار', status_open:'مفتوح', status_in_progress:'قيد التنفيذ', status_resolved:'تم الحل', status_catalogued:'مفهرس', status_verified:'تم التحقق', status_disabled:'معطل', failure_fail_degraded:'تدهور آمن', failure_fail_closed:'إغلاق آمن', failure_human_review:'مراجعة بشرية', failure_quarantine:'حجر', failure_fail_open_supervised:'فتح خاضع للإشراف', profile_low:'ملف تحقق AION Workforce منخفض المخاطر', profile_medium:'ملف تحقق AION Workforce متوسط المخاطر', profile_high:'ملف تحقق AION Workforce مرتفع المخاطر', profile_critical:'ملف تحقق AION Workforce حرج المخاطر', source_eurostatapi_use:'إحصاءات عامة وسياق اقتصادي؛ بلا بيانات شخصية.', source_dataeuropa_use:'اكتشاف مجموعات البيانات الأوروبية العامة.', source_openmeteo_use:'سياق طقس اختياري للتخطيط، وليس لاتخاذ قرارات رواتب آلية.', cadence_dataset:'حسب مجموعة البيانات', cadence_cache:'استعلام عند الطلب مع ذاكرة مؤقتة', fallback_cache:'ذاكرة مؤقتة', fallback_manual:'يدوي', fallback_disabled:'معطل' },
};

export function localizeDynamic(key: string, language: Language, fallback: string) {
  return dynamicTranslations[language][key] ?? dynamicTranslations.en[key] ?? fallback;
}

export function localizeRole(role: string, language: Language) {
  return localizeDynamic(`role_${role.toLowerCase()}`, language, role);
}

export function localizeStatus(status: string, language: Language) {
  return localizeDynamic(`status_${status.toLowerCase().replace(/[- ]/g, '_')}`, language, status);
}

export function localizeFailureMode(mode: string, language: Language) {
  return localizeDynamic(`failure_${mode}`, language, mode);
}

export function localizeProfileDescription(profileId: string, language: Language, fallback: string) {
  const risk = profileId.split('.').pop() ?? 'low';
  return localizeDynamic(`profile_${risk}`, language, fallback);
}

export function localizeSourceField(sourceId: string, field: 'use' | 'updateCadence' | 'fallback', value: string, language: Language) {
  if (field === 'use') return localizeDynamic(`source_${sourceId.replace(/-/g, '')}_use`, language, value);
  if (field === 'updateCadence') return localizeDynamic(value.includes('caché') || value.toLowerCase().includes('cache') ? 'cadence_cache' : 'cadence_dataset', language, value);
  return localizeDynamic(`fallback_${value}`, language, value);
}

export const unitTranslations: Record<Language, Record<string, string>> = {
  es: { hourUnit:'h', perHour:'/ h' }, en: { hourUnit:'h', perHour:'/ h' }, fr: { hourUnit:'h', perHour:'/ h' }, de: { hourUnit:'Std.', perHour:'/ Std.' }, it: { hourUnit:'h', perHour:'/ h' }, pt: { hourUnit:'h', perHour:'/ h' }, zh: { hourUnit:'小时', perHour:'/ 小时' }, ja: { hourUnit:'時間', perHour:'/ 時間' }, ru: { hourUnit:'ч', perHour:'/ ч' }, ar: { hourUnit:'س', perHour:'/ س' },
};

export const eventTranslations: Record<Language, Record<string, string>> = {
  es: { tenant_created:'Tenant creado', plan_updated:'Plan actualizado', member_added:'Miembro añadido', member_role_updated:'Rol de miembro actualizado', employee_created:'Empleado creado', employee_updated:'Empleado actualizado', employee_deleted:'Empleado eliminado', shift_created:'Turno creado', shift_updated:'Turno actualizado', shift_deleted:'Turno eliminado', incident_created:'Incidencia creada', incident_updated:'Incidencia actualizada', collective_agreement_created:'Convenio creado', absence_recorded:'Ausencia registrada', shifts_auto_assigned:'Turnos asignados automáticamente' },
  en: { tenant_created:'Tenant created', plan_updated:'Plan updated', member_added:'Member added', member_role_updated:'Member role updated', employee_created:'Employee created', employee_updated:'Employee updated', employee_deleted:'Employee deleted', shift_created:'Shift created', shift_updated:'Shift updated', shift_deleted:'Shift deleted', incident_created:'Incident created', incident_updated:'Incident updated', collective_agreement_created:'Agreement created', absence_recorded:'Absence recorded', shifts_auto_assigned:'Shifts auto-assigned' },
  fr: { tenant_created:'Tenant créé', plan_updated:'Forfait mis à jour', member_added:'Membre ajouté', member_role_updated:'Rôle du membre mis à jour', employee_created:'Employé créé', employee_updated:'Employé mis à jour', employee_deleted:'Employé supprimé', shift_created:'Quart créé', shift_updated:'Quart mis à jour', shift_deleted:'Quart supprimé', incident_created:'Incident créé', incident_updated:'Incident mis à jour', collective_agreement_created:'Accord créé', absence_recorded:'Absence enregistrée', shifts_auto_assigned:'Quarts attribués automatiquement' },
  de: { tenant_created:'Mandant erstellt', plan_updated:'Tarif aktualisiert', member_added:'Mitglied hinzugefügt', member_role_updated:'Mitgliederrolle aktualisiert', employee_created:'Mitarbeiter erstellt', employee_updated:'Mitarbeiter aktualisiert', employee_deleted:'Mitarbeiter gelöscht', shift_created:'Schicht erstellt', shift_updated:'Schicht aktualisiert', shift_deleted:'Schicht gelöscht', incident_created:'Vorfall erstellt', incident_updated:'Vorfall aktualisiert', collective_agreement_created:'Vereinbarung erstellt', absence_recorded:'Abwesenheit erfasst', shifts_auto_assigned:'Schichten automatisch zugewiesen' },
  it: { tenant_created:'Tenant creato', plan_updated:'Piano aggiornato', member_added:'Membro aggiunto', member_role_updated:'Ruolo membro aggiornato', employee_created:'Dipendente creato', employee_updated:'Dipendente aggiornato', employee_deleted:'Dipendente eliminato', shift_created:'Turno creato', shift_updated:'Turno aggiornato', shift_deleted:'Turno eliminato', incident_created:'Incidente creato', incident_updated:'Incidente aggiornato', collective_agreement_created:'Accordo creato', absence_recorded:'Assenza registrata', shifts_auto_assigned:'Turni assegnati automaticamente' },
  pt: { tenant_created:'Tenant criado', plan_updated:'Plano atualizado', member_added:'Membro adicionado', member_role_updated:'Função do membro atualizada', employee_created:'Funcionário criado', employee_updated:'Funcionário atualizado', employee_deleted:'Funcionário eliminado', shift_created:'Turno criado', shift_updated:'Turno atualizado', shift_deleted:'Turno eliminado', incident_created:'Incidente criado', incident_updated:'Incidente atualizado', collective_agreement_created:'Acordo criado', absence_recorded:'Ausência registada', shifts_auto_assigned:'Turnos atribuídos automaticamente' },
  zh: { tenant_created:'租户已创建', plan_updated:'计划已更新', member_added:'成员已添加', member_role_updated:'成员角色已更新', employee_created:'员工已创建', employee_updated:'员工已更新', employee_deleted:'员工已删除', shift_created:'班次已创建', shift_updated:'班次已更新', shift_deleted:'班次已删除', incident_created:'事件已创建', incident_updated:'事件已更新', collective_agreement_created:'协议已创建', absence_recorded:'缺勤已记录', shifts_auto_assigned:'班次已自动分配' },
  ja: { tenant_created:'テナントを作成', plan_updated:'プランを更新', member_added:'メンバーを追加', member_role_updated:'メンバーの役割を更新', employee_created:'従業員を作成', employee_updated:'従業員を更新', employee_deleted:'従業員を削除', shift_created:'シフトを作成', shift_updated:'シフトを更新', shift_deleted:'シフトを削除', incident_created:'インシデントを作成', incident_updated:'インシデントを更新', collective_agreement_created:'協定を作成', absence_recorded:'欠勤を記録', shifts_auto_assigned:'シフトを自動割当' },
  ru: { tenant_created:'Тенант создан', plan_updated:'План обновлён', member_added:'Участник добавлен', member_role_updated:'Роль участника обновлена', employee_created:'Сотрудник создан', employee_updated:'Сотрудник обновлён', employee_deleted:'Сотрудник удалён', shift_created:'Смена создана', shift_updated:'Смена обновлена', shift_deleted:'Смена удалена', incident_created:'Инцидент создан', incident_updated:'Инцидент обновлён', collective_agreement_created:'Соглашение создано', absence_recorded:'Отсутствие записано', shifts_auto_assigned:'Смены назначены автоматически' },
  ar: { tenant_created:'تم إنشاء المستأجر', plan_updated:'تم تحديث الخطة', member_added:'تمت إضافة العضو', member_role_updated:'تم تحديث دور العضو', employee_created:'تم إنشاء الموظف', employee_updated:'تم تحديث الموظف', employee_deleted:'تم حذف الموظف', shift_created:'تم إنشاء المناوبة', shift_updated:'تم تحديث المناوبة', shift_deleted:'تم حذف المناوبة', incident_created:'تم إنشاء الحادثة', incident_updated:'تم تحديث الحادثة', collective_agreement_created:'تم إنشاء الاتفاقية', absence_recorded:'تم تسجيل الغياب', shifts_auto_assigned:'تم تعيين المناوبات تلقائيًا' },
};

export function localizeEventType(eventType: string, language: Language) {
  return eventTranslations[language][eventType] ?? eventTranslations.en[eventType] ?? eventType.replace(/_/g, ' ');
}

export const knownEventTypes = [
  'tenant_created', 'plan_updated', 'member_added', 'member_role_updated', 'employee_created', 'employee_updated', 'employee_deleted',
  'shift_created', 'shift_updated', 'shift_deleted', 'incident_created', 'incident_updated', 'collective_agreement_created', 'absence_recorded', 'shifts_auto_assigned',
] as const;

export const auditTranslations: Record<Language, Record<string, string>> = {
  es: { technicalPayload:'Payload técnico (campos sensibles redactados)', payloadRedacted:'[redactado]' },
  en: { technicalPayload:'Technical payload (sensitive fields redacted)', payloadRedacted:'[redacted]' },
  fr: { technicalPayload:'Payload technique (champs sensibles masqués)', payloadRedacted:'[masqué]' },
  de: { technicalPayload:'Technische Nutzlast (sensible Felder geschwärzt)', payloadRedacted:'[geschwärzt]' },
  it: { technicalPayload:'Payload tecnico (campi sensibili oscurati)', payloadRedacted:'[oscurato]' },
  pt: { technicalPayload:'Payload técnico (campos sensíveis ocultados)', payloadRedacted:'[ocultado]' },
  zh: { technicalPayload:'技术载荷（敏感字段已隐藏）', payloadRedacted:'[已隐藏]' },
  ja: { technicalPayload:'技術ペイロード（機密フィールドは秘匿）', payloadRedacted:'[秘匿]' },
  ru: { technicalPayload:'Техническая нагрузка (чувствительные поля скрыты)', payloadRedacted:'[скрыто]' },
  ar: { technicalPayload:'البيانات التقنية (تم حجب الحقول الحساسة)', payloadRedacted:'[محجوب]' },
};
