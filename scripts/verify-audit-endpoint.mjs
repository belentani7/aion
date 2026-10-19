const response = await fetch("http://localhost:3000/api/audit/verify?tenantId=1&limit=100");
const body = await response.json();
const result = { status: response.status, totalEvents: body.verification?.totalEvents ?? null, valid: body.verification?.valid ?? false, eventsReturned: body.events?.length ?? 0 };
console.log(JSON.stringify(result, null, 2));
if (response.status !== 200 || result.valid !== true || result.totalEvents < 1) process.exitCode = 1;
