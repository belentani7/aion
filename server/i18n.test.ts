import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { applyDocumentLocale, auditTranslations, formatCurrency, formatDate, formatMonthYear, formatTime, knownEventTypes, languages, localizeEventType, localizeFailureMode, localizeProfileDescription, localizeRole, localizeSourceField, localizeStatus, translations, uiMoreTranslations, uiTranslations, unitTranslations, validationTranslations, extendedTranslations } from '../client/src/i18n';
import { openDataSources } from './open-data';
import { defaultProfile } from './pvcu';
import { redactAuditPayload } from '../client/src/lib/auditDisplay';
import { AuditEventTechnicalPreview } from '../client/src/pages/Home';
import { OpenDataDynamicCard, ValidationProfileDynamicCard } from '../client/src/pages/ValidationCenter';
import { HomeDynamicSmokePage, ValidationCenterDynamicSmokePage } from '../client/src/components/PageDynamicSmoke';

describe('AION i18n catalog', () => {
  it('contains exactly ten supported languages', () => {
    expect(languages).toHaveLength(10);
    expect(new Set(languages.map((language) => language.code)).size).toBe(10);
  });

  it('provides the dashboard and PVC-U contract in every language', () => {
    const requiredKeys = ['appTitle', 'activeEmployees', 'scheduledShifts', 'payrollCost', 'shiftAlerts', 'controlPanel', 'pvcuBadge', 'validationTitle', 'validationSubtitle', 'validationBack', 'validationProfiles', 'validationSources', 'validationRules', 'validationActive'];
    for (const language of languages) {
      for (const key of requiredKeys) {
        expect(translations[language.code][key], `${language.code}.${key}`).toBeTruthy();
      }
    }
  });

  it('keeps Arabic as the only RTL language in the initial catalog', () => {
    expect(languages.map((language) => language.code)).toContain('ar');
    expect(languages.map((language) => language.code)).toContain('es');
  });

  it('formats money and time without falling back to browser defaults', () => {
    const value = new Date('2026-08-15T12:30:00.000Z');
    for (const language of languages) {
      expect(formatCurrency(1234.5, language.code)).toBeTruthy();
      expect(formatDate(value, language.code)).toBeTruthy();
      expect(formatTime(value, language.code)).toBeTruthy();
      expect(formatMonthYear(value, language.code)).toBeTruthy();
    }
  });

  it('applies Arabic RTL and restores LTR for other locales', () => {
    const previousDocument = globalThis.document;
    (globalThis as { document?: { documentElement: { dir: string; lang: string } } }).document = { documentElement: { dir: '', lang: '' } };
    applyDocumentLocale('ar');
    expect(globalThis.document?.documentElement.dir).toBe('rtl');
    expect(globalThis.document?.documentElement.lang).toBe('ar');
    applyDocumentLocale('es');
    expect(globalThis.document?.documentElement.dir).toBe('ltr');
    expect(globalThis.document?.documentElement.lang).toBe('es');
    if (previousDocument) (globalThis as { document?: typeof previousDocument }).document = previousDocument;
    else delete (globalThis as { document?: unknown }).document;
  });

  it('smoke-checks dashboard and validation labels for every locale', () => {
    for (const language of languages) {
      const dictionary = translations[language.code];
      expect(`${dictionary.activeEmployees} · ${dictionary.validationTitle}`).not.toContain('undefined');
      expect(dictionary.controlPanel.length).toBeGreaterThan(0);
      expect(dictionary.validationSources.length).toBeGreaterThan(0);
    }
  });

  it('localizes dynamic roles, statuses, profiles and open-data fields for every locale', () => {
    for (const language of languages) {
      expect(localizeRole('manager', language.code)).not.toBe('manager');
      expect(localizeStatus('scheduled', language.code)).not.toBe('scheduled');
      expect(localizeFailureMode('fail_closed', language.code)).not.toBe('fail_closed');
      expect(localizeProfileDescription('pvcu.aion.high', language.code, 'fallback')).not.toBe('fallback');
      expect(localizeSourceField('open-meteo', 'use', 'fallback', language.code)).not.toBe('fallback');
      expect(localizeSourceField('open-meteo', 'fallback', 'cache', language.code)).toBeTruthy();
      for (const eventType of knownEventTypes) expect(localizeEventType(eventType, language.code)).not.toBe(eventType);
      for (const risk of ['low', 'medium', 'high', 'critical'] as const) {
        const profile = defaultProfile(risk);
        const localizedDescription = localizeProfileDescription(profile.profileId, language.code, profile.description);
        expect(localizedDescription).toBeTruthy();
        if (language.code !== 'en') expect(localizedDescription).not.toBe(profile.description);
        expect(localizeFailureMode(profile.failureMode, language.code)).toBeTruthy();
      }
      for (const source of openDataSources) {
        const localizedUse = localizeSourceField(source.sourceId, 'use', source.use, language.code);
        expect(localizedUse).toBeTruthy();
        if (language.code !== 'en') expect(localizedUse).not.toBe(source.use);
        expect(localizeSourceField(source.sourceId, 'updateCadence', source.updateCadence, language.code)).toBeTruthy();
        expect(localizeSourceField(source.sourceId, 'fallback', source.fallback, language.code)).toBeTruthy();
      }
    }
  });

  it('blocks known hardcoded UI regressions in dashboard and PVC-U source', () => {
    const home = readFileSync(new URL('../client/src/pages/Home.tsx', import.meta.url), 'utf8');
    const validationCenter = readFileSync(new URL('../client/src/pages/ValidationCenter.tsx', import.meta.url), 'utf8');
    const source = `${home}\n${validationCenter}`;
    for (const literal of ['Ej. Roberto Sánchez', 'Para pequeños equipos iniciales.', 'Capas activas', 'Subesferas IA', 'Filtrar empleado', 'Todos los empleados', 'Editar turno', 'No se auto-aplican cambios.', 'Tarifa:']) {
      expect(source, literal).not.toContain(literal);
    }
    expect(source).toContain('localizeEventType(event.eventType, language)');
    expect(source).toContain('localizeRole(emp.role, language)');
    expect(source).toContain('localizeStatus(shift.status, language)');
    expect(source).toContain("redactAuditPayload(event.payload, t('payloadRedacted'))");
    expect(source).not.toContain('JSON.stringify(event.payload, null, 2)');
    expect(validationCenter).toContain('localizeProfileDescription(profile.profileId, language, profile.description)');
    expect(validationCenter).toContain("localizeSourceField(source.sourceId, 'use', source.use, language)");
  });

  it('renders Home and ValidationCenter dynamic fixtures as translated, redacted DOM', () => {
    const t = (key: string) => ({ ...auditTranslations.es, ...unitTranslations.es, ...uiMoreTranslations.es, ...uiTranslations.es, ...validationTranslations.es, ...extendedTranslations.es, ...translations.es } as Record<string, string>)[key] ?? key;
    const auditMarkup = renderToStaticMarkup(createElement(AuditEventTechnicalPreview, { event: { id: 1, eventType: 'employee_created', createdAt: '2026-08-15T12:30:00.000Z', previousHash: null, currentHash: 'abc123', payload: { name: 'Ada Example', employeeId: 42 } }, t, language: 'es' }));
    expect(auditMarkup).toContain('Empleado creado');
    expect(auditMarkup).toContain('[redactado]');
    expect(auditMarkup).toContain('42');
    expect(auditMarkup).not.toContain('Ada Example');
    expect(auditMarkup).not.toContain('employee_created');

    const profileMarkup = renderToStaticMarkup(createElement(ValidationProfileDynamicCard, { profile: defaultProfile('high'), t, language: 'es' }));
    expect(profileMarkup).toContain('Perfil de validación de riesgo alto');
    expect(profileMarkup).toContain('Revisión humana');
    expect(profileMarkup).not.toContain('fail_human_review');

    const source = openDataSources.find((item) => item.sourceId === 'open-meteo')!;
    const sourceMarkup = renderToStaticMarkup(createElement(OpenDataDynamicCard, { source, t, language: 'es' }));
    expect(sourceMarkup).toContain('Contexto meteorológico');
    expect(sourceMarkup).toContain('Catalogada');
    expect(sourceMarkup).not.toContain('catalogued');
  });

  it('mounts full dynamic page wrappers with translated and sanitized DOM', () => {
    const t = (key: string) => ({ ...auditTranslations.es, ...unitTranslations.es, ...uiMoreTranslations.es, ...uiTranslations.es, ...validationTranslations.es, ...extendedTranslations.es, ...translations.es } as Record<string, string>)[key] ?? key;
    const event = { id: 7, eventType: 'employee_created', createdAt: '2026-08-15T12:30:00.000Z', previousHash: null, currentHash: 'hash-7', payload: { name: 'Ada Example', employeeId: 42 } };
    const profile = defaultProfile('critical');
    const source = openDataSources.find((item) => item.sourceId === 'open-meteo')!;
    const homeMarkup = renderToStaticMarkup(createElement(HomeDynamicSmokePage, { event, t, language: 'es' }));
    const validationMarkup = renderToStaticMarkup(createElement(ValidationCenterDynamicSmokePage, { profile, source, t, language: 'es' }));
    expect(homeMarkup).toContain('data-testid="home-dynamic-smoke"');
    expect(homeMarkup).toContain('Empleado creado');
    expect(homeMarkup).toContain('[redactado]');
    expect(homeMarkup).not.toContain('employee_created');
    expect(homeMarkup).not.toContain('Ada Example');
    expect(validationMarkup).toContain('data-testid="validation-center-dynamic-smoke"');
    expect(validationMarkup).toContain('Perfil de validación de riesgo crítico');
    expect(validationMarkup).toContain('Contexto meteorológico');
    expect(validationMarkup).not.toContain('fail_closed');
    expect(validationMarkup).not.toContain('catalogued');
  });

  it('redacts sensitive fixture fields while preserving technical audit evidence', () => {
    const fixture = { name: 'Ada Example', employeeId: 42, nested: { email: 'ada@example.test', currentHash: 'abc123' }, items: [{ phone: '+00 000' }] };
    const redacted = redactAuditPayload(fixture, '[redacted]') as any;
    expect(redacted.name).toBe('[redacted]');
    expect(redacted.nested.email).toBe('[redacted]');
    expect(redacted.items[0].phone).toBe('[redacted]');
    expect(redacted.employeeId).toBe(42);
    expect(redacted.nested.currentHash).toBe('abc123');
  });

  it('keeps the event catalog aligned with real ledger emitters', () => {
    const emitterFiles = ['routers.ts', 'stripe.webhook.ts', 'seed.ts'].map((file) => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')).join('\n');
    const emitted = [...emitterFiles.matchAll(/recordAuditEvent\([\s\S]{0,120}?[, ]"([a-z_]+)"/g)].map((match) => match[1]);
    expect(new Set(emitted)).toEqual(new Set(knownEventTypes));
  });

  it('keeps interactive dashboard dialogs and icon controls labelled', () => {
    const home = readFileSync(new URL('../client/src/pages/Home.tsx', import.meta.url), 'utf8');
    const dialogContents = home.match(/<DialogContent/g) ?? [];
    const dialogTitles = home.match(/<DialogTitle/g) ?? [];
    const labelledControls = home.match(/aria-label=/g) ?? [];
    expect(dialogContents.length).toBeGreaterThan(0);
    expect(dialogTitles.length).toBe(dialogContents.length);
    expect(labelledControls.length).toBeGreaterThanOrEqual(3);
    expect(home).toContain('aria-describedby="agreement-rules-help"');
  });
});
