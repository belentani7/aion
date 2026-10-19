import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
const original={appId:ENV.appId,cookieSecret:ENV.cookieSecret};
beforeEach(()=>{ENV.appId="fixture-app";ENV.cookieSecret="fixture-only-not-a-production-signing-key-1234"});
afterEach(()=>{Object.assign(ENV,original)});
async function token(appId:string, expires=true, name="Test") {
 const jwt=new SignJWT({appId,openId:"fixture-user",name}).setProtectedHeader({alg:"HS256"});
 if(expires)jwt.setExpirationTime("1h");
 return jwt.sign(new TextEncoder().encode(ENV.cookieSecret));
}
describe("session app binding and expiry",()=>{
 it("rejects a signed session for another app",async()=>expect(await sdk.verifySession(await token("other-app"))).toBeNull());
 it("rejects a session without expiry",async()=>expect(await sdk.verifySession(await token("fixture-app",false))).toBeNull());
 it("accepts a configured-app signed session",async()=>expect((await sdk.verifySession(await token("fixture-app")))?.openId).toBe("fixture-user"));
 it("supports the signer's empty optional display name",async()=>expect((await sdk.verifySession(await token("fixture-app",true,"")))?.name).toBe(""));
 it("rejects expired sessions",async()=>{
  const value=await new SignJWT({appId:ENV.appId,openId:"fixture-user",name:"Test"}).setProtectedHeader({alg:"HS256"}).setExpirationTime(1).sign(new TextEncoder().encode(ENV.cookieSecret));
  expect(await sdk.verifySession(value)).toBeNull();
 });
});
