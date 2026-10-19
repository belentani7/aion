# Fuentes abiertas para la ampliación PVC-U

## OWASP ASVS 5.0.0

Fuente primaria: [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/). OWASP describe ASVS como una base para probar controles técnicos de seguridad web y como una lista de requisitos para desarrollo seguro. La página indica que la versión estable más reciente es la 5.0.0 y que los requisitos usan identificadores versionables como `v5.0.0-1.2.5`. La aplicación en AION será una matriz de controles trazable, no una afirmación de certificación.

## WCAG 2.2

Fuente primaria: [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/). WCAG 2.2 es una recomendación del W3C para hacer contenido accesible en dispositivos diversos. Organiza la accesibilidad en principios perceptible, operable, comprensible y robusto, con criterios verificables y niveles A, AA y AAA. AION usará WCAG 2.2 AA como objetivo de diseño y automatización, combinado con revisión humana; no se declarará conformidad total sin auditoría independiente.

## NIST AI RMF

Fuente primaria: [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework). NIST define AI RMF como un marco voluntario para incorporar consideraciones de confiabilidad en el diseño, desarrollo, uso y evaluación de sistemas de IA. La fuente enlaza el AI RMF 1.0, el Playbook, crosswalks y el perfil para IA generativa NIST-AI-600-1. AION adapta sus ideas mediante riesgo, evidencia, revisión humana, versión de modelo y detección de deriva, sin autoaplicar cambios de política.

## MLflow / Model Registry

Fuente primaria: [MLflow AI Model Registry Management Checklist](https://mlflow.org/articles/ai-model-registry-management-checklist/). La guía propone como metadatos mínimos `model_id`, `version`, `owner`, `use_case`, `dataset_fingerprint`, `training_commit`, `hyperparameters`, `evaluation_metrics`, `risk_tier`, `compliance_tags`, `last_review_date` y `deprecation_target`. También recomienda inmutabilidad por versión, gates automáticos, revisión manual, RBAC, procedencia, señales de drift, errores y retiro formal. AION implementa el contrato mínimo de ciclo de vida en `pvcu-ai.ts` como evidencia y validación, sin crear aún un registro de modelos productivo.

## Implicaciones para AION

| Área | Decisión aplicada |
|---|---|
| Seguridad | Versionar los controles PVC-U y mapearlos a una futura matriz ASVS; las pruebas locales no equivalen a certificación. |
| Accesibilidad | Usar contraste, foco visible, semántica y revisión desktop/móvil como base WCAG 2.2 AA. |
| IA | Separar prompt/response, semántica, ciclo de vida de modelo y acciones agénticas en subesferas independientes. |
| Gobernanza | Registrar hashes y metadatos mínimos; no almacenar prompts/respuestas crudos ni secretos. |
| Producción | Mantener la revisión humana para deriva, modelos no aprobados y acciones irreversibles. |

## Datos abiertos y APIs públicas

La [API de estadísticas de Eurostat](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started) es un servicio REST público para consultar estadísticas de Eurostat y resulta adecuado como fuente de referencia macroeconómica o contextual, no como fuente de horas laborales individuales. El [portal data.europa.eu](https://data.europa.eu/en) funciona como punto de acceso a datos abiertos europeos y ofrece APIs de búsqueda de sólo lectura documentadas en [su página de APIs](https://data.europa.eu/en/which-apis-are-available-and-where-can-i-find-information-about-them). [Open-Meteo](https://open-meteo.com/) ofrece una API de clima open source sin clave para usos no comerciales, con límites y sin garantía de uptime en el plan gratuito; por tanto, cualquier integración debe aplicar caché, límites, atribución y degradación segura.

AION no ingiere todavía datos externos automáticamente. Se añade un catálogo de procedencia y una política: cada fuente debe registrar URL, licencia/condiciones, fecha de consulta, esquema, frecuencia de actualización, límites, responsable, hash de respuesta y modo de fallback. Los datos públicos no deben mezclarse con información personal de empleados sin una finalidad y base jurídica documentadas.
