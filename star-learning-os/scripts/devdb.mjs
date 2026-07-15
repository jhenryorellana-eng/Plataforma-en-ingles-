/**
 * PostgreSQL local de desarrollo sin Docker.
 * Usa los binarios oficiales del paquete @embedded-postgres/* (initdb, pg_ctl,
 * postgres) y crea la base en modo single-user, sin necesitar psql/createdb.
 * Producción usa Cloud SQL (ADR-002); esto es exclusivamente para desarrollo.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, '.local', 'pgdata');
const LOG_FILE = path.join(ROOT, '.local', 'pg.log');
const DB_MARKER = path.join(ROOT, '.local', 'db-star-created');
const PORT = process.env.STAR_PG_PORT ?? '55432';
const DB_NAME = 'star';
const PG_USER = 'postgres';

function findBinDir() {
  // Los paquetes de plataforma son dependencias transitivas; se localizan por
  // filesystem para cubrir tanto el layout de pnpm (.pnpm) como el de npm.
  const candidateRoots = [];
  const pnpmDir = path.join(ROOT, 'node_modules', '.pnpm');
  if (existsSync(pnpmDir)) {
    for (const entry of readdirSync(pnpmDir)) {
      if (entry.startsWith('@embedded-postgres+')) {
        candidateRoots.push(path.join(pnpmDir, entry, 'node_modules', '@embedded-postgres'));
      }
    }
  }
  candidateRoots.push(path.join(ROOT, 'node_modules', '@embedded-postgres'));

  for (const rootDir of candidateRoots) {
    if (!existsSync(rootDir)) continue;
    for (const pkg of readdirSync(rootDir)) {
      const binDir = path.join(rootDir, pkg, 'native', 'bin');
      if (existsSync(path.join(binDir, exeName('initdb')))) return binDir;
    }
  }
  throw new Error('No se encontraron los binarios de PostgreSQL. Ejecuta `pnpm install` primero.');
}

function exeName(name) {
  return process.platform === 'win32' ? `${name}.exe` : name;
}

function bin(binDir, name) {
  return path.join(binDir, exeName(name));
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function isRunning(binDir) {
  const result = spawnSync(bin(binDir, 'pg_ctl'), ['status', '-D', DATA_DIR], { stdio: 'pipe' });
  return result.status === 0;
}

function ensureDatabase(binDir) {
  if (existsSync(DB_MARKER)) return;
  console.log(`Creando base de datos "${DB_NAME}" (modo single-user)...`);
  const result = spawnSync(bin(binDir, 'postgres'), ['--single', '-D', DATA_DIR, 'postgres'], {
    input: `CREATE DATABASE ${DB_NAME};\n`,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0 && !output.includes('already exists')) {
    console.error(output);
    throw new Error('No se pudo crear la base de datos');
  }
  writeFileSync(DB_MARKER, new Date().toISOString());
}

function up(binDir) {
  mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  if (!existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('Inicializando clúster PostgreSQL de desarrollo...');
    run(bin(binDir, 'initdb'), ['-D', DATA_DIR, '-U', PG_USER, '-A', 'trust', '-E', 'UTF8', '--no-instructions']);
  }
  if (isRunning(binDir)) {
    console.log(`PostgreSQL ya está corriendo en el puerto ${PORT}.`);
  } else {
    ensureDatabase(binDir);
    // stdio ignore: postgres hereda los handles de pg_ctl y dejaría el pipe abierto para siempre.
    const start = spawnSync(bin(binDir, 'pg_ctl'), ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-w', '-o', `-p ${PORT}`], {
      stdio: 'ignore',
    });
    if (start.status !== 0) {
      throw new Error(`pg_ctl start falló; revisa ${LOG_FILE}`);
    }
  }
  console.log(`Listo: postgresql://${PG_USER}@127.0.0.1:${PORT}/${DB_NAME}`);
}

function stop(binDir) {
  if (!isRunning(binDir)) {
    console.log('PostgreSQL no está corriendo.');
    return;
  }
  run(bin(binDir, 'pg_ctl'), ['stop', '-D', DATA_DIR, '-m', 'fast']);
}

const command = process.argv[2];
const binDir = findBinDir();
if (command === 'up') up(binDir);
else if (command === 'stop') stop(binDir);
else if (command === 'status') {
  console.log(isRunning(binDir) ? `Corriendo en puerto ${PORT}` : 'Detenido');
} else {
  console.log('Uso: node scripts/devdb.mjs <up|stop|status>');
  process.exit(1);
}
