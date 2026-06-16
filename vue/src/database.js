import mysql from 'mysql2/promise';

import { config } from './config.js';

/** Shared MySQL connection pool used by route handlers and background sync. */
export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  namedPlaceholders: true
});
