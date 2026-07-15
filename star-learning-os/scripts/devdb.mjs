/**
 * PostgreSQL local de desarrollo sin Docker.
 * Usa los binarios oficiales empaquetados por embedded-postgres y los controla
 * con pg_ctl directamente, de modo que `up` retorna dejando el servidor corriendo.
 * Producción usa Cloud SQL (ADR-002); esto es exclusivamente para desarrollo.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DATA_DIR = path.join(ROOT, '.local', 'pgdata');
const LOG_FILE = path.join(ROOT, '.local', 'pg.log');
const PORT = process.env.STAR_PG_PORT ?? '55432';
const DB_NAME = 'star';
const PG_USER = 'postgres';

function findBinDir() {
  const candidates = [
    '@embedded-postgres/windows-x64/package.json',
    '@embedded-postgres/darwin-arm64/package.json',
    '@embedded-postgres/linux-x64/package.json',
  ];
  for (const candidate of candidates) {
    try {
      const pkgDir = path.dirname(require.resolve(candidate));
      const found = findFileDir(pkgDir, process.platform === 'win32' ? 'initdb.exe' : 'initdb');
      if (found) return found;
    } catch {
      // paquete de otra plataforma no instalado: continuar
    }
  }
  throw new Error('No se encontraron los binarios de PostgreSQL. Ejecuta `pnpm install` primero.');
}

function findFileDir(dir, fileName, depth = 0) {
  if (depth > 4) return null;
  const entries = readdirSync(dir);
  if (entries.includes(fileName)) return dir;
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      const found = findFileDir(full, fileName, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function bin(binDir, name) {
  return path.join(binDir, process.platform === 'win32' ? `${name}.exe` : name);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function isRunning(binDir) {
  const result = spawnSync(bin(binDir, 'pg_ctl'), ['status', '-D', DATA_DIR], { stdio: 'pipe' });
  return result.status === 0;
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
    run(bin(binDir, 'pg_ctl'), ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-w', '-o', `-p ${PORT}`]);
  }
  const check = spawnSync(bin(binDir, 'psql'), ['-p', PORT, '-U', PG_USER, '-d', DB_NAME, '-c', 'select 1'], { stdio: 'pipe' });
  if (check.status !== 0) {
    console.log(`Creando base de datos "${DB_NAME}"...`);
    run(bin(binDir, 'createdb'), ['-p', PORT, '-U', PG_USER, DB_NAME]);
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
