import path from "path";
import fs from "fs";
import dotenv from "dotenv";

/**
 * Env loading strategy:
 * - If apps/worker/.env exists, load it first (recommended for local dev).
 * - Otherwise fall back to monorepo root .env (backwards compatible).
 * - In production (Fly/Railway), platform-injected env vars take precedence.
 */
const workerEnv = path.resolve(__dirname, "../.env");
const rootEnv = path.resolve(__dirname, "../../../.env");

if (fs.existsSync(workerEnv)) {
  dotenv.config({ path: workerEnv });
} else {
  dotenv.config({ path: rootEnv });
}
