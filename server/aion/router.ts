import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as service from "./service";

type AionTool = {
  name: string;
  status: string;
  riskLevel: "low" | "medium" | "high";
  permissions: string[];
  description: string;
};

const AION_TOOLS: AionTool[] = [
  {
    name: "managed_llm",
    status: "disabled_by_default",
    riskLevel: "medium",
    permissions: [],
    description: "Proveedor LLM gestionado. Deshabilitado por defecto; requiere habilitacion explicita.",
  },
  {
    name: "local_model_router",
    status: "available",
    riskLevel: "low",
    permissions: [],
    description: "Enrutador local de modelos. Devuelve fallback explicito cuando no hay proveedor local.",
  },
  {
    name: "terminal",
    status: "not_implemented",
    riskLevel: "high",
    permissions: ["workspace.read", "workspace.exec"],
    description: "Ejecucion de procesos no implementada; no se ejecutan comandos desde la web.",
  },
];

export const aionRouter = router({
  dashboard: protectedProcedure.query(() => ({
    network: "OFF" as const,
    externalProviders: "DISABLED" as const,
    tools: AION_TOOLS,
  })),

  importProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        sourcePath: z.string().min(1),
        sourceType: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => service.importProject({ ...input, ownerId: ctx.user.id })),

  plan: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => service.plan(input.projectId, ctx.user.id)),

  audit: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => service.audit(input.projectId, ctx.user.id)),

  executions: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => service.executions(input.projectId, ctx.user.id)),

  memory: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => service.memory(input.projectId, ctx.user.id)),
});
