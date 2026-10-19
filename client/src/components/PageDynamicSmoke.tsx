import React from 'react';
import { AuditEventTechnicalPreview, type AuditEventFixture } from '@/pages/Home';
import { OpenDataDynamicCard, ValidationProfileDynamicCard, type ProfileFixture, type SourceFixture } from '@/pages/ValidationCenter';

type Translate = (key: string) => string;
type Locale = Parameters<typeof ValidationProfileDynamicCard>[0]['language'];

export function HomeDynamicSmokePage({ event, t, language }: { event: AuditEventFixture; t: Translate; language: Locale }) {
  return <main data-testid="home-dynamic-smoke"><h1>{t('auditTitle')}</h1><AuditEventTechnicalPreview event={event} t={t} language={language} /></main>;
}

export function ValidationCenterDynamicSmokePage({ profile, source, t, language }: { profile: ProfileFixture; source: SourceFixture; t: Translate; language: Locale }) {
  return <main data-testid="validation-center-dynamic-smoke"><h1>{t('validationTitle')}</h1><ValidationProfileDynamicCard profile={profile} t={t} language={language} /><OpenDataDynamicCard source={source} t={t} language={language} /></main>;
}
