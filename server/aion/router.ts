import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
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
    status: "available",
    riskLevel: "high",
    permissions: ["workspace.read", "workspace.exec"],
    description: "Ejecucion de procesos en el workspace. Requiere aprobacion explicita (AION_AGENT_APPROVED=YES).",
  },
];

export const aionRouter = router({
  dashboard: publicProcedure.query(() => ({
    network: "OFF" as const,
    externalProviders: "DISABLED" as const,
    tools: AION_TOOLS,
  })),

  importProject: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        sourcePath: z.string().min(1),
        sourceType: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => service.importProject(input)),

  plan: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => service.plan(input.projectId)),

  audit: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => service.audit(input.projectId)),

  executions: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => service.executions(input.projectId)),

  memory: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => service.memory(input.projectId)),
});
