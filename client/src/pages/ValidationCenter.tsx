import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowLeft, Bot, CheckCircle2, Database, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import { localizeFailureMode, localizeProfileDescription, localizeSourceField, localizeStatus } from "@/i18n";

const riskCopy = {
  low: { key: "riskLow", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  medium: { key: "riskMedium", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { key: "riskHigh", tone: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { key: "riskCritical", tone: "bg-rose-50 text-rose-700 border-rose-200" },
} as const;

type Translate = (key: string) => string;
export type ProfileFixture = { profileId: string; version: string; description: string; riskClass: string; layers: string[]; failureMode: string };
export type SourceFixture = { sourceId: string; name: string; url: string; use: string; updateCadence: string; fallback: string; status: string };

export function ValidationProfileDynamicCard({ profile, t, language }: { profile: ProfileFixture; t: Translate; language: Parameters<typeof localizeStatus>[1] }) {
  const risk = riskCopy[profile.riskClass as keyof typeof riskCopy] ?? riskCopy.low;
  return <Card data-testid="pvcu-profile-card" className="glass-panel border-0 transition-transform duration-200 hover:-translate-y-1"><CardHeader className="space-y-3"><div className="flex items-center justify-between gap-3"><Badge variant="outline" className={risk.tone}>{t(risk.key)}</Badge><span className="font-mono text-[11px] text-muted-foreground">{profile.version}</span></div><CardTitle className="text-base">{profile.profileId}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{localizeProfileDescription(profile.profileId, language, profile.description)}</p><Separator className="my-4" /><div className="flex flex-wrap gap-1.5">{profile.layers.map((layer) => <span key={layer} className="rounded-md bg-primary/8 px-2 py-1 font-mono text-[11px] text-primary">{layer}</span>)}</div><p className="mt-4 text-xs text-muted-foreground">{t('failureMode')}: <span className="font-medium text-foreground">{localizeFailureMode(profile.failureMode, language)}</span></p></CardContent></Card>;
}

export function OpenDataDynamicCard({ source, t, language }: { source: SourceFixture; t: Translate; language: Parameters<typeof localizeStatus>[1] }) {
  return <div data-testid="open-data-source-card" className="rounded-2xl border border-border/70 bg-background/45 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{source.name}</p><p className="mt-1 text-xs text-muted-foreground">{localizeSourceField(source.sourceId, 'use', source.use, language)}</p></div><Badge variant="outline" className="w-fit">{localizeStatus(source.status, language)}</Badge></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{t('updatedLabel')}: {localizeSourceField(source.sourceId, 'updateCadence', source.updateCadence, language)}</span><span>{t('fallbackLabel')}: {localizeSourceField(source.sourceId, 'fallback', source.fallback, language)}</span><a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noreferrer">{t('sourceLabel')} <ExternalLink className="size-3" /></a></div></div>;
}

export default function ValidationCenter() {
  const { isAuthenticated, loading } = useAuth();
  const { t, language } = useI18n();
  const profiles = trpc.validation.profiles.useQuery(undefined, { enabled: isAuthenticated });
  const sources = trpc.validation.openDataSources.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) return <div className="min-h-screen bg-background" aria-busy="true" />;
  if (!isAuthenticated) {
    return <main className="min-h-screen bg-background p-6"><div className="mx-auto max-w-xl glass-panel rounded-3xl p-8"><h1 className="text-2xl font-semibold">{t('validationTitle')}</h1><p className="mt-2 text-muted-foreground">{t('validationSubtitle')}</p><Link href="/"><Button className="mt-6">{t('validationBack')}</Button></Link></div></main>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="aion-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon" className="focus-ring" aria-label={t('validationBack')}><ArrowLeft className="size-5" /></Button></Link>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" /> {t('controlOperational')}</div>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t('validationTitle')}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('validationSubtitle')}</p>
            </div>
          </div>
          <Badge className="w-fit gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700"><CheckCircle2 className="size-4" /> {t('validationActive')} · v1.0.0</Badge>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label={t('controlOperational')}>
          <Card className="glass-panel border-0"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('activeLayers')}</span><LockKeyhole className="size-5 text-primary" /></div><p className="mt-3 text-3xl font-semibold">L0—L8</p><p className="mt-1 text-xs text-muted-foreground">{t('layersDescription')}</p></CardContent></Card>
          <Card className="glass-panel border-0"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('aiSpheres')}</span><Bot className="size-5 text-violet-600" /></div><p className="mt-3 text-3xl font-semibold">4-A · 2-A · 8</p><p className="mt-1 text-xs text-muted-foreground">{t('aiDescription')}</p></CardContent></Card>
          <Card className="glass-panel border-0"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('evidence')}</span><Activity className="size-5 text-emerald-600" /></div><p className="mt-3 text-3xl font-semibold">SHA-256</p><p className="mt-1 text-xs text-muted-foreground">{t('evidenceDescription')}</p></CardContent></Card>
        </section>

        <section className="mt-8" aria-labelledby="profiles-title">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">{t('validationProfiles')}</p><h2 id="profiles-title" className="mt-1 text-2xl font-semibold">{t('validationProfiles')}</h2></div><span className="text-xs text-muted-foreground">{t('safeBlock')}</span></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(profiles.data ?? []).map((profile) => {
              return <ValidationProfileDynamicCard key={profile.profileId} profile={profile} t={t} language={language} />;
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="sources-title">
          <Card className="glass-panel border-0"><CardHeader><div className="flex items-center gap-2"><Database className="size-5 text-primary" /><div><CardTitle id="sources-title">{t('validationSources')}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t('sourceDescription')}</p></div></div></CardHeader><CardContent className="space-y-4">{(sources.data ?? []).map((source) => <OpenDataDynamicCard key={source.sourceId} source={source} t={t} language={language} />)}</CardContent></Card>
          <Card className="glass-panel border-0"><CardHeader><CardTitle>{t('validationRules')}</CardTitle></CardHeader><CardContent><div className="space-y-4 text-sm leading-6 text-muted-foreground"><p><strong className="text-foreground">{t('noAutoApply')}</strong> {t('humanReview')}</p><p><strong className="text-foreground">{t('noRawPrompts')}</strong> {t('hashRetention')}</p><p><strong className="text-foreground">{t('noImplicitCertification')}</strong> {t('independentReview')}</p></div></CardContent></Card>
        </section>
      </div>
    </main>
  );
}
