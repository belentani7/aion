import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
function caller(id: number) {
  return appRouter.createCaller({user:{id,openId:`owner-test-${id}`,email:null,name:null,loginMethod:'test',role:'user',createdAt:new Date(),updatedAt:new Date(),lastSignedIn:new Date()},req:{} as TrpcContext['req'],res:{} as TrpcContext['res']});
}
describe('Aion object ownership and truthful execution state', () => {
  it('denies another authenticated user every project read', async () => {
    const a=caller(71),b=caller(72);
    const {projectId}=await a.aion.importProject({name:'Private test project',sourcePath:'/home/ubuntu/aion',sourceType:'server_path'});
    for(const method of ['plan','audit','executions','memory'] as const) {
      await expect(b.aion[method]({projectId})).rejects.toMatchObject({code:'NOT_FOUND'});
    }
    expect((await a.aion.plan({projectId})).tasks.length).toBeGreaterThan(0);
  });
  it('does not invent an audit result for a nonexistent project', async () => {
    await expect(caller(71).aion.audit({projectId:99999999})).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('never records scans or dependency checks as completed merely by registering a path', async () => {
    const a=caller(73);
    const {projectId}=await a.aion.importProject({name:'Metadata only',sourcePath:'/home/ubuntu/aion',sourceType:'server_path'});
    expect((await a.aion.executions({projectId})).some(row=>row.status==='completed')).toBe(false);
    expect(await a.aion.audit({projectId})).toMatchObject({status:'not_performed'});
  });
});
