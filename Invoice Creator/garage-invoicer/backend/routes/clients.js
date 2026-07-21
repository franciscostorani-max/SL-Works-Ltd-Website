import { Router } from "express";
import { randomUUID } from "crypto";
import db from "../db.js";

const router = Router();

// List clients, optionally filtered by a search term (name/email/phone)
router.get("/", (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    rows = db
      .prepare(
        `SELECT * FROM clients
         WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY created_at DESC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare("SELECT * FROM clients ORDER BY created_at DESC").all();
  }
  res.json(rows);
});

// Get one client plus their vehicles and invoice history
router.get("/:id", (req, res) => {
  const client = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const vehicles = db
    .prepare("SELECT * FROM vehicles WHERE client_id = ?")
    .all(req.params.id);
  const invoices = db
    .prepare(
      "SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC"
    )
    .all(req.params.id);

  res.json({ ...client, vehicles, invoices });
});

router.post("/", (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: "Client name is required" });

  const id = randomUUID();
  db.prepare(
    `INSERT INTO clients (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, email || null, phone || null, address || null);

  res.status(201).json({ id, name, email, phone, address });
});

router.post("/:id/vehicles", (req, res) => {
  const { make, model, registration, notes } = req.body;
  const client = db
    .prepare("SELECT id FROM clients WHERE id = ?")
    .get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const id = randomUUID();
  db.prepare(
    `INSERT INTO vehicles (id, client_id, make, model, registration, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.params.id, make || null, model || null, registration || null, notes || null);

  res.status(201).json({ id, clientId: req.params.id, make, model, registration, notes });
});

export default router;
