# Aion — unión de fuentes conocida, candidato NO RELEASE

Fecha: 2026-10-19. Este paquete contiene código modificado y pruebas, no una declaración de finalización de los 487 repositorios.

## Procedencia conciliada

- Git público `belentani7/aion`, ID **1380543886**, main `cd220fb4a21c9a034b93f2ea82f516fbbb23a6a5`.
- Archivo histórico de Drive basado en `60d7faa88ba769b3725a88a6c28ab5ec6d867444`, con las reparaciones locales anteriores de sesiones, almacenamiento y HTML. Los archivos modificados se cotejaron por SHA-256 contra su base de Git antes de la unión de tres vías.
- `aion.zip` de Drive: 100/100 archivos coinciden con Git `0c3536e`.
- Parche `fix-aion-RESTAURACION-41-archivos-ARENA-2026-10-17.patch`: aplicado a una copia separada y comparado con este candidato. Sus correcciones de calendario y dependencias están incluidas; los módulos restaurados conservan las correcciones posteriores descritas abajo.
- `ENTREGA-aion-FIX-COMMIT-INCLUIDO-ARENA-2026-10-17.zip`: comparado archivo a archivo, sin rutas fuente ausentes. Contiene un Git adicional cuyo main es `501dae83bb22f54f487e75d379805b8b98fbc492`, no presente entre los refs públicos indexados. Se indexó ese historial sin extraer configuraciones, credenciales ni hooks.
- `aion-fusion-60d7faa.zip`: comparado; no aporta rutas fuente ausentes. Las diferencias conservadas corresponden a actualizaciones y reparaciones documentadas.
- La carpeta Aion del catálogo contenía ZIP y parche; otra carpeta con nombre exacto Aion estaba vacía. La búsqueda exacta de esos nombres no tuvo página siguiente. Esto NO agota copias con otros nombres ni toda la familia Aion.
- Aion Unified, Workforce y Showcase son proyectos distintos: no se han mezclado por similitud de marca.

## Cambios reales de este candidato

1. Recuperación de 41 módulos eliminados de Git pero necesarios para compilar y operar la aplicación; se conserva la última versión anterior a su eliminación.
2. Conservación de las defensas anteriores de JWT: identidad de aplicación, expiración y secreto obligatorio. El proxy de almacenamiento continúa denegando acceso si falta una política de autorización por objeto.
3. Separación de `createApp()` y el proceso que escucha un puerto; entrada serverless `api/index.ts`, configuración Vercel y salida web `dist/public` separadas del JavaScript del servidor.
4. HTTP health explícitamente limitado a transporte; rutas API desconocidas devuelven JSON 404, nunca HTML del frontend.
5. Autorización de proyectos por propietario. Otro usuario autenticado no puede consultar plan, memoria, ejecuciones o estado de un proyecto ajeno. Registros históricos sin propietario no se asignan automáticamente.
6. Inserciones transaccionales en la ruta MySQL; los fallos de base de datos no se convierten silenciosamente en una sesión en memoria. En producción, el modo efímero requiere una habilitación explícita.
7. Eliminación de estados ficticios de auditoría completada: registrar una ruta genera un plan pendiente, no ejecuta un escaneo. El terminal se anuncia como no implementado, no como operativo.
8. Compatibilidad con el calendario actualizado, tipado de Vite y resolución correcta de la configuración asíncrona en desarrollo.
9. Inicio de sesión deshabilitado con explicación si falta configuración; validación de HTTPS y rechazo de URLs con credenciales antes de crear cookies de estado.
10. Tema conmutado realmente y almacenamiento local tolerante a restricciones; controles etiquetados, contraste claro/oscuro, tablas desplazables por teclado, carrusel y paginación adaptados a pantallas estrechas, landmark de la landing y alternativas de movimiento específicas en la aplicación.
11. Galería de componentes cargada bajo demanda: el chunk de entrada observado bajó aproximadamente de 887 kB a 170 kB sin ocultar la galería. Sigue existiendo un chunk diferido grande; no se declara optimización completa.

## Reproducir comprobaciones locales

Recomendado: Node 24.

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm run check
npm test
npm run build
node validation/source-contract.mjs
NODE_ENV=production PORT=4184 npm start
```

Se verificaron instalación limpia, tipos, 36 pruebas y compilación. Evidencia de navegador y procedencia: carpeta `validation/evidence/` del paquete. Las pruebas de propietario utilizan almacenamiento de prueba; no certifican una base de datos real.

## Bloqueos de publicación y funcionalidad pendiente

- **Vercel sigue vinculado al ID de repositorio 1348054320**, distinto del ID público actual. La producción observada sigue en `60d7faa...` y entrega JavaScript de servidor en `/`. El commit es ancestro del main público, pero la vinculación requiere reconciliación; no basta con cambiar `outputDirectory`.
- No se ha hecho push, deployment ni cambio de dominio, permisos o variables remotas con este candidato.
- La configuración Vercel está preparada en fuente; no se ha certificado con un despliegue real.
- Revisar/aplicar una sola vez `migrations/20261019-project-ownership.sql` y asignar propietarios históricos mediante evidencia válida. No se ha ejecutado esta migración sobre ninguna base de datos.
- OAuth, MySQL, proveedores de almacenamiento y AIOND/Ollama no se han validado en vivo. La inferencia local no aparece automáticamente en una función de Vercel.
- El servicio de auditoría conserva un plan de trabajo, pero todavía no realiza auditorías del filesystem. La ejecución de terminal sigue sin implementarse; no se ha añadido ejecución arbitraria de comandos desde la web.
- El health HTTP NO es una prueba de disponibilidad de estos proveedores.
- No se ha revisado cada parche histórico ni se ha completado la totalidad de los 487 proyectos. Los historiales privados no quedan resueltos por disponer de un ZIP.

## Métodos utilizados

Superpowers: investigación de causa raíz, regresiones que fallan antes del arreglo y verificación posterior. Impeccable: diagnóstico de accesibilidad, integridad de la implementación, responsividad, temas y rendimiento, seguido de cambios concretos y comprobaciones de navegador. Las revisiones exactas de los upstreams consultados se registran en `validation/evidence/provenance.json`.
