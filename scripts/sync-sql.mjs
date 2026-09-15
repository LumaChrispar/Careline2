import { copyFile } from 'node:fs/promises'
await copyFile(new URL('../database-migrations/20260910_careline.sql', import.meta.url), new URL('../database.sql', import.meta.url))
console.log('database.sql now matches the complete Careline migration.')
