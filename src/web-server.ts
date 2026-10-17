import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import express from "express";
import { loadConfig } from "./config/index.js";
import {
  createHttpClient,
  type HttpClient,
} from "./client/http-client.js";
import { TOOLS } from "./tools/handlers.js";

const app = express();
const PORT = 3001;
const CONNECTION_FILE = path.resolve(process.cwd(), ".money-manager-connection.json");

// This server is intended for your own computer only.
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

let client: HttpClient | null = null;
let currentBaseUrl = "";

const toolMap = new Map(TOOLS.map((tool) => [tool.name, tool]));

function normalizeBaseUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Enter the Money Manager server address, including http:// and the port.");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid address, for example http://192.168.1.100:8888.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The server address must start with http:// or https://.");
  }
  if (!url.hostname || url.username || url.password) {
    throw new Error("Enter a valid server address without username or password.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Enter only the server address and port, without a path, query, or fragment.");
  }

  return url.origin;
}

async function createClientFor(baseUrl: string): Promise<HttpClient> {
  const config = await loadConfig({ baseUrl });
  // Keep session cookies separate for each endpoint. This prevents an old
  // session cookie being reused if the phone's IP or port changes.
  const cookieSuffix = createHash("sha256").update(baseUrl).digest("hex").slice(0, 12);
  return createHttpClient({
    ...config,
    server: { ...config.server, baseUrl },
    session: {
      ...config.session,
      cookieFile: `.session-cookies-${cookieSuffix}.json`,
    },
  });
}

async function readSavedBaseUrl(): Promise<string | null> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(CONNECTION_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || !("baseUrl" in parsed)) {
      throw new Error("Saved connection file has no baseUrl field.");
    }
    return normalizeBaseUrl((parsed as { baseUrl: unknown }).baseUrl);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.warn("Could not read the saved Money Manager address. Enter it again in the dashboard.", error);
    return null;
  }
}

async function persistBaseUrl(baseUrl: string): Promise<void> {
  const temporaryPath = `${CONNECTION_FILE}.tmp`;
  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify({ baseUrl }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await fs.rename(temporaryPath, CONNECTION_FILE);
}

// Check that the local API is running and report the current connection setting.
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Local Money Manager API is running",
    configured: Boolean(client),
  });
});

// Read the saved address so the UI can restore it after a dashboard restart.
app.get("/api/connection", (_req, res) => {
  res.json({
    success: true,
    data: {
      baseUrl: currentBaseUrl,
      configured: Boolean(client),
    },
  });
});

// Validate and test the new address before saving or replacing the current client.
app.post("/api/connection", async (req, res) => {
  let baseUrl: string;
  try {
    baseUrl = normalizeBaseUrl(req.body?.baseUrl);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid server address.",
    });
    return;
  }

  try {
    const candidate = await createClientFor(baseUrl);
    const initTool = toolMap.get("init_get_data");
    if (!initTool) throw new Error("The initialization tool is unavailable.");

    const args = initTool.schema.parse({});
    const handler = initTool.handler as (
      client: HttpClient,
      args: unknown,
    ) => Promise<unknown>;

    // A successful initialization request confirms that this address speaks
    // the expected Money Manager API before we persist it.
    await handler(candidate, args);
    await persistBaseUrl(baseUrl);

    client = candidate;
    currentBaseUrl = baseUrl;
    res.json({
      success: true,
      data: { baseUrl: currentBaseUrl, configured: true },
    });
  } catch (error) {
    console.error("Could not connect to the requested Money Manager server:", error);
    res.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : "Could not connect to Money Manager.",
    });
  }
});

// List the existing operations available through the upstream project.
app.get("/api/tools", (_req, res) => {
  res.json({
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  });
});

// Run a known, schema-validated Money Manager operation.
app.post("/api/tools/:name", async (req, res) => {
  const tool = toolMap.get(req.params.name);

  if (!tool) {
    res.status(404).json({
      success: false,
      error: "Unknown operation",
    });
    return;
  }

  const activeClient = client;
  if (!activeClient) {
    res.status(503).json({
      success: false,
      error: "Enter and connect your Money Manager server address before using the dashboard.",
    });
    return;
  }

  try {
    const args = tool.schema.parse(req.body ?? {});

    const handler = tool.handler as (
      client: HttpClient,
      args: unknown,
    ) => Promise<unknown>;

    const result = await handler(activeClient, args);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      res.status(400).json({
        success: false,
        error: "Invalid request data",
        details: error.issues,
      });
      return;
    }

    console.error("Money Manager request failed:", error);

    res.status(502).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Money Manager request failed",
    });
  }
});

async function main() {
  const savedBaseUrl = await readSavedBaseUrl();

  if (savedBaseUrl) {
    currentBaseUrl = savedBaseUrl;
    client = await createClientFor(savedBaseUrl);
    console.log(`Restored Money Manager address: ${savedBaseUrl}`);
  } else {
    // The dashboard intentionally does not use MONEY_MANAGER_BASE_URL from
    // .env. Enter the phone's current address in the UI and save it locally.
    console.log("No Money Manager address configured yet. Enter it in the dashboard.");
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Local API: http://127.0.0.1:${PORT}`);
  });
}

main().catch((error) => {
  console.error("Failed to start local API:", error);
  process.exit(1);
});
