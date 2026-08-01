 
import { Pool } from "pg";

const hasUrl = !!process.env.DATABASE_URL;
export const pool = hasUrl
  ? new Pool({
      connectionString: String(process.env.DATABASE_URL),
      ssl: false,  
    })
  : new Pool({
   host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
   ssl: false,  
    });