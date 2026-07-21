import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR env var lets Railway (or any host) mount a persistent volume here.
// Falls back to ./data for local dev.
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "garage.db"));
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    make TEXT,
    model TEXT,
    registration TEXT,
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    vehicle_id TEXT,
    status TEXT DEFAULT 'draft',
    line_items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    notes TEXT,
    square_invoice_id TEXT,
    square_payment_url TEXT,
    pdf_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  );
`);

// Add columns introduced after initial release (safe to run repeatedly)
try { db.exec("ALTER TABLE invoices ADD COLUMN invoice_number TEXT"); } catch {}
try { db.exec("ALTER TABLE invoices ADD COLUMN doc_type TEXT DEFAULT 'Invoice'"); } catch {}
try { db.exec("ALTER TABLE invoices ADD COLUMN square_requested INTEGER DEFAULT 0"); } catch {}

export default db;
