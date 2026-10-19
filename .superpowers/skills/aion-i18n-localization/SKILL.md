---
name: aion-i18n-localization
description: Use when working with AION's i18n system (10 languages, RTL Arabic, regional formatting, contract enforcement).
---

# AION i18n Localization Skill

## Overview
Custom FormatJS-based i18n supporting 10 languages: ES, EN, FR, DE, IT, PT, ZH, JA, RU, AR (RTL). Type-safe, zero runtime deps.

## When to Use
- Adding new visible strings
- Supporting new language
- Debugging RTL/layout issues
- Regional date/currency formatting

## Architecture
```
client/src/
├── i18n.ts                 # Core: locale detection, formatting, translation
├── locales/
│   ├── es.json             # Source of truth
│   ├── en.json
│   ├── fr.json
│   ├── de.json
│   ├── it.json
│   ├── pt.json
│   ├── zh.json
│   ├── ja.json
│   ├── ru.json
│   └── ar.json
└── components/LanguageSelector.tsx
```

## Usage
```typescript
// In components
import { t, formatDate, formatCurrency } from '@/i18n';

const label = t('dashboard.metrics.totalHours');  // Type-safe key
const date = formatDate(new Date(), locale);      // Regional format
const money = formatCurrency(1234.56, locale, 'EUR');
```

## Key Features
1. **Type-Safe Keys** — TS extracts from `es.json`
2. **Nested Namespaces** — `pvcu.risk.levels.L5`
3. **Pluralization** — ICU-style: `{count, plural, one {# hora} other {# horas}}`
4. **RTL Support** — `document.dir = locale === 'ar' ? 'rtl' : 'ltr'`
5. **Fallback Chain** — `ar → en → es`
6. **Persistence** — localStorage + cookie

## Contract Enforcement
```bash
pnpm test:i18n  # 34 tests: 10 langs, RTL, dynamic labels, no hardcoded strings
```

## Dynamic Content Localization
- **Enums**: Roles, statuses → dictionary keys
- **API-driven**: PVC-U profiles, Open Data sources → localized descriptions
- **Event types**: Audit events → localized labels
- **Technical data**: Hashes, IDs remain unlocalized (marked technical)

## Red Flags
| Thought | Reality |
|---------|---------|
| "I'll hardcode this one string" | Contract test will fail |
| "English fallback is fine" | Users need native language |
| "RTL is just text direction" | Layout, icons, inputs all affected |

## Tests
- 34 Vitest tests passing
- Visual regression for RTL
- Smoke DOM for all 10 languages

## Related
- ADR-0008: i18n
- `client/src/i18n.ts`
- `client/src/locales/`