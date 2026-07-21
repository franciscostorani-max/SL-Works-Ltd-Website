import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import clientsRouter from "./routes/clients.js";
import invoicesRouter from "./routes/invoices.js";
import { searchHubSpotContacts } from "./hubspot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, "../frontend/dist");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/clients", clientsRouter);
app.use("/api/invoices", invoicesRouter);

app.get("/api/hubspot/contacts", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json([]);
  try {
    const contacts = await searchHubSpotContacts(q);
    res.json(contacts);
  } catch (err) {
    console.error("HubSpot search error:", err.message);
    res.status(502).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Serve the built React frontend and handle SPA routing
import fs from "fs";
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

const port = process.env.PORT || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Garage Invoicer running on http://localhost:${port}`);
});
