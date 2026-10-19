import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { registerStorageProxy } from "./_core/storageProxy";
const original={forgeApiUrl:ENV.forgeApiUrl,forgeApiKey:ENV.forgeApiKey};
beforeEach(()=>{ENV.forgeApiUrl="https://storage.example.invalid/";ENV.forgeApiKey="fixture-only-no-real-credential"});
afterEach(()=>{Object.assign(ENV,original);vi.unstubAllGlobals()});
function setup(options?:any){
 let handler:any;let route:any;
 registerStorageProxy({get:(pattern:any,callback:any)=>{route=pattern;handler=callback}} as any,options);
 const res:any={status:vi.fn(),send:vi.fn(),set:vi.fn(),redirect:vi.fn()};
 for(const method of ["status","send","set","redirect"])res[method].mockReturnValue(res);
 return {handler,res,route};
}
describe("storage presign authorization",()=>{
 it("denies unconfigured access without contacting storage",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);const {handler,res}=setup();
  await handler({params:{0:"private/image.png"}},res);
  expect(res.status).toHaveBeenCalledWith(403);expect(fetcher).not.toHaveBeenCalled();
 });
 it("denies failed object authorization before storage",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);const {handler,res}=setup({authorize:async()=>false});
  await handler({params:{0:"other-user/image.png"}},res);
  expect(res.status).toHaveBeenCalledWith(403);expect(fetcher).not.toHaveBeenCalled();
 });
 it.each(["../private/key","folder/../key","folder\\\\key",""])("rejects malformed key %s",async(key)=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);const {handler,res}=setup({authorize:async()=>true});
  await handler({params:{0:key}},res);expect(res.status).toHaveBeenCalledWith(400);expect(fetcher).not.toHaveBeenCalled();
 });
 it("redirects only after explicit object authorization",async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({url:"https://files.example.invalid/fixture.png"})});
  vi.stubGlobal("fetch",fetcher);const authorize=vi.fn().mockResolvedValue(true);const {handler,res,route}=setup({authorize});
  const req={params:{0:"owned/fixture.png"}};await handler(req,res);
  expect(route).toBeInstanceOf(RegExp);expect(authorize).toHaveBeenCalledWith(req,"owned/fixture.png");
  expect(fetcher).toHaveBeenCalledTimes(1);expect(res.set).toHaveBeenCalledWith("Cache-Control","no-store");
  expect(res.redirect).toHaveBeenCalledWith(307,"https://files.example.invalid/fixture.png");
 });
 it("refuses a non-HTTPS provider redirect",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({url:"javascript:alert(1)"})}));
  const {handler,res}=setup({authorize:async()=>true});await handler({params:{0:"owned/fixture.png"}},res);
  expect(res.status).toHaveBeenCalledWith(502);expect(res.redirect).not.toHaveBeenCalled();
 });
 it("fails closed if authorization throws",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);const {handler,res}=setup({authorize:async()=>{throw new Error("fixture")}});
  await handler({params:{0:"owned/fixture.png"}},res);expect(res.status).toHaveBeenCalledWith(403);expect(fetcher).not.toHaveBeenCalled();
 });
});
