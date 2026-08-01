import { Pool } from "pg";
import { loadEnvConfig } from '@next/env'
 import dotenv from "dotenv";

 dotenv.config();

const projectDir = process.cwd()
loadEnvConfig(projectDir)

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS, 
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,

});

export default pool;