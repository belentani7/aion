# Revisión visual de AION Workforce

## Desktop 1280x720

La pantalla pública muestra una composición centrada con fondo azul oscuro, halo violeta, badge de producto, titular de alto contraste, descripción breve y CTA visible. El CTA tiene contraste suficiente y la jerarquía tipográfica es clara. No se observaron overflow ni elementos cortados en el viewport.

## Móvil 375x812

La captura autenticada muestra la cabecera, badge del plan, estado de la cadena, métricas apiladas y scroll vertical usable. La navegación compacta conserva el nombre de la organización y el control de sesión. Las tarjetas mantienen contraste y separación suficiente; el contenido operativo continúa debajo del viewport.

## Límite de evidencia

La captura autenticada persistió por el estado de sesión del navegador, pero no se automatizó un flujo completo de creación de empleado/turno/calendario. Esa cobertura queda pendiente de una prueba E2E autenticada en staging.

## Revisión móvil posterior al ajuste

La cabecera ahora se distribuye en dos filas de forma explícita: marca y plan arriba, selector de empresa a ancho completo y estado de auditoría/sesión debajo. El selector muestra `roberto7sena Workforce` y el viewport de 375px no presenta desbordamiento horizontal visible. Las métricas siguen apiladas con tarjetas legibles.

## Revisión visual final tras cerrar brechas

En desktop autenticado, la cabecera mantiene marca, plan, selector de empresa, estado de cadena y sesión; las cuatro métricas se alinean en una cuadrícula estable y el panel operativo conserva acciones de alta jerarquía. La pestaña de empleados permanece legible con datos reales y sin overflow visible.

En móvil autenticado, el selector de empresa ocupa una fila completa, el estado SHA-256 y la sesión quedan debajo, y las tarjetas KPI se apilan sin recorte horizontal. Con datos sembrados se muestran 5 empleados, 10 turnos y €714,00 de nómina, lo que confirma que la vista no depende sólo de estados vacíos.

La revisión visual no sustituye una prueba E2E de click en filtros, edición, cancelación y exportación; esos flujos quedan indicados como cobertura pendiente de staging.
