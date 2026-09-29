// Only for an existing database created from the original, migration-free schema.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL first.');
const prisma='node_modules/prisma/build/index.js';
const run=args=>spawnSync(process.execPath,[prisma,...args],{stdio:'inherit',windowsHide:true});
const diff=run(['migrate','diff','--from-schema-datasource','prisma/legacy-schema.prisma','--to-schema-datamodel','prisma/legacy-schema.prisma','--exit-code']);
if(diff.status!==0) {
  console.error('Baseline stopped: this database does not exactly match the original schema, or it could not be inspected. No migration was marked as applied.');
  process.exit(1);
}
const baseline=run(['migrate','resolve','--applied','202609290001_baseline']);
process.exit(baseline.status??1);
