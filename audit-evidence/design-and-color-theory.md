# Teoría del Color, Accesibilidad y Diseño UI/UX en AION Workforce

Para cumplir con el estándar de una plataforma de categoría mundial, la interfaz se ha estructurado siguiendo principios avanzados de diseño de sistemas y teoría del color aplicados a enterprise SaaS:

1. **Jerarquía cromática basada en tonos oscuros profundos (Slate 900/950)**:
   - Fondo principal: `bg-slate-900` (#0f172a) y `bg-slate-950` (#020617) para reducir fatiga visual y proporcionar contraste absoluto con elementos interactivos.
   - Superficies flotantes y tarjetas: `bg-slate-950/40` con bordes sutiles `border-slate-800` para un efecto de profundidad tipo glassmorfismo sutil.

2. **Color de acento e identidad (Indigo 600/500)**:
   - Utilizado para llamadas a la acción principales, enfoque activo e indicadores de navegación. El tono #4f46e5 transmite confianza, precisión y modernidad tecnológica.

3. **Señales semánticas funcionales**:
   - **Esmeralda (Emerald 400/500)**: éxito, cadenas de hash inmutables íntegras, tarifas y totales monetarios.
   - **Ámbar / Naranja (Amber 400/500)**: advertencias, turnos sin cubrir o incidencias abiertas.
   - **Rosa / Rojo (Rose 500)**: errores críticos, fallos de verificación de ledger o exclusiones de planes.

4. **Accesibilidad (WCAG AA)**:
   - Contraste de texto garantizado (`text-slate-100` sobre fondos oscuros supera ratio 7:1).
   - Anillos de enfoque visibles (`focus-visible:ring-2 focus-visible:ring-indigo-500`) en elementos interactivos y filas seleccionables.

## Recursos visuales abiertos y estables

AION conserva **Lucide React** para iconografía coherente, ligera y personalizable; la documentación oficial está en [Lucide React](https://lucide.dev/guide/react/) y el proyecto es open source en [lucide-icons/lucide](https://github.com/lucide-icons/lucide). Para interacciones complejas se mantienen los componentes **Radix UI** ya incluidos en el scaffold, cuya documentación de accesibilidad está en [Radix Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility). El sistema de estilos usa variables semánticas y valores OKLCH, alineados con el modelo de tokens de Tailwind 4, en lugar de acoplar la interfaz a colores de componentes aislados.

La decisión de estabilidad es deliberada: no se añaden librerías visuales nuevas ni recursos remotos que introduzcan cadenas de suministro innecesarias. Se reutilizan los componentes accesibles y el toolkit de iconos existentes, complementados con CSS propio para glassmorfismo, foco visible, gradientes sutiles y superficies con jerarquía.
