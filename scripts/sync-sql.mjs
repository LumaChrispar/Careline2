import { readFile, writeFile } from 'node:fs/promises'
const migrations = ['20260910_careline.sql', '20260915_care_coordination.sql', '20260916_staff_handover.sql']
const parts = await Promise.all(migrations.map(name => readFile(new URL('../database-migrations/' + name, import.meta.url), 'utf8')))
await writeFile(new URL('../database.sql', import.meta.url), parts.join('\n'))
console.log('database.sql contains the complete Careline installation and care coordination upgrade.')
