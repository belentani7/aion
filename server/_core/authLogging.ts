/** Safe diagnostic events. Never accept error objects, request headers, tokens or URLs. */
export type AuthDiagnostic =
  | "oauth-service-unconfigured"
  | "oauth-callback-failed"
  | "session-verification-rejected"
  | "user-sync-failed";

export function reportAuthFailure(stage: AuthDiagnostic): void {
  const message = `[Auth] ${stage}`;
  if (stage === "session-verification-rejected") {
    console.warn(message);
  } else {
    console.error(message);
  }
}
