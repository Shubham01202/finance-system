// Path: backend/src/server.ts


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth.routes";
import loanRoutes from "./routes/loan.routes";
import caRoutes   from "./routes/ca.routes";
import serviceModuleRoutes from "./routes/serviceModule.routes";
import publicCatalogRoutes from "./routes/publicCatalog.routes";
import { pool } from "./config/db";

import adminRoutes from "./routes/admin.routes";
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

/* ==============================
   MIDDLEWARE
============================== */

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL || "",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ==============================
   ROUTES
============================== */


app.use("/api/auth", authRoutes);
app.use("/api/loan", loanRoutes);
app.use("/api/ca",   caRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", serviceModuleRoutes);
app.use("/api/catalog", publicCatalogRoutes);




/* ==============================
   HEALTH CHECK ROUTE
============================== */

app.get("/", (req, res) => {
  res.json({ message: "Finance Backend API Running 🚀" });
});

/* ==============================
   DATABASE CONNECTION TEST
============================== */

pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed:", err.message);
  });

/* ==============================
   404 HANDLER
============================== */

app.use((req, res) => {
  res.status(404).json({ error: "Route Not Found" });
});

/* ==============================
   GLOBAL ERROR HANDLER
============================== */

app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ==============================
   START SERVER
============================== */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});