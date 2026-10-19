import { closeDb, getUserByOpenId, upsertUser } from "../server/db";
import { ENV } from "../server/_core/env";

if (!ENV.ownerOpenId) throw new Error("OWNER_OPEN_ID is not configured");
await upsertUser({ openId: ENV.ownerOpenId, lastSignedIn: new Date() });
const user = await getUserByOpenId(ENV.ownerOpenId);
if (!user) throw new Error("Owner was not persisted");
console.log(JSON.stringify({ userId: user.id, openId: user.openId, status: "owner_upsert_ok" }, null, 2));
await closeDb();
