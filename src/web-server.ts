
import express from "express";
import { loadConfig } from "./config/index.js";
import {
  createHttpClient,
  type HttpClient,
} from "./client/http-client.js";
import { TOOLS } from "./tools/handlers.js";

const app = express();
const PORT = 3001;

// This server is intended for your own computer only.
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

let client: HttpClient;

const toolMap = new Map(TOOLS.map((tool) => [tool.name, tool]));

// Check that the local API is running.
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Local Money Manager API is running",
  });
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

  try {
    const args = tool.schema.parse(req.body ?? {});

    // Each registered handler has its own validated input schema.
    const handler = tool.handler as (
      client: HttpClient,
      args: unknown,
    ) => Promise<unknown>;

    const result = await handler(client, args);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "issues" in error
    ) {
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
  const config = await loadConfig();
  client = await createHttpClient(config);

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Local API: http://127.0.0.1:${PORT}`);
  });
}

main().catch((error) => {
  console.error("Failed to start local API:", error);
  process.exit(1);
});
