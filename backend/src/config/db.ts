
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USERNAME || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "finance_db",
  password: process.env.DB_PASSWORD || "shubham12345",
  port: Number(process.env.DB_PORT) || 5432,

  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});