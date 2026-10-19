import { createApp } from "../server/_core/app";

// Vercel invokes the Express handler. Never import the listening server entrypoint.
export default createApp();
