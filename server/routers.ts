import { COOKIE_NAME } from "@shared/const";
import { aionRouter } from "./aion/router";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { defaultProfile, type RiskClass } from "./pvcu";
import { openDataSources } from "./open-data";

export const appRouter = router({
  system: systemRouter,

  aion: aionRouter,

  // Authenticated, read-only configuration catalogue. This is NOT a claim
  // that external data sources are live or the profiles are certified.
  validation: router({
    profiles: protectedProcedure.query(() =>
      (["low", "medium", "high", "critical"] as const satisfies readonly RiskClass[])
        .map((risk) => defaultProfile(risk))
    ),
    openDataSources: protectedProcedure.query(() => openDataSources),
  }),

  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
