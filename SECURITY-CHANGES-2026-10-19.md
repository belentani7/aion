# Local security changes — not a production release

- JWT signing rejects absent, blank or short secrets. A minimum byte length does not establish entropy.
- Session verification requires expiration and the configured app identifier. An empty optional display name is supported consistently with the signer.
- The `/manus-storage/*` proxy now **denies access by default**. It no longer acts as an anonymous presigning endpoint.
- To enable downloads, supply `registerStorageProxy(app, { authorize })` with a policy that validates the authenticated caller AND ownership/access to the exact object key. A callback that always returns true is not a security policy.
- Legacy anonymous storage URLs will no longer work until an appropriate explicit policy is implemented. The archive does not provide a validated object-ownership model, so none was invented.
- Storage service requests and redirects require HTTPS. Error responses do not disclose provider response bodies or signed URLs.
- Tests use synthetic signing material and mocked storage; no real provider, database or credential rotation was used.

OAuth integration, multi-user object authorization, storage migration and deployed environments remain unverified. Earlier audit records are historical; this note supersedes the earlier open app-ID/expiration and anonymous-proxy findings, not the integration limitations.
