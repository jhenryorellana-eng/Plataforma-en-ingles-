/**
 * Prisma abre por defecto `2 * CPU + 1` conexiones por proceso. En pools
 * compartidos pequeños (como Supabase Session Pooler) una sola instancia local
 * puede consumir casi todo el cupo. Añadimos un límite conservador sin tocar
 * una configuración explícita proporcionada por infraestructura.
 */
export function withDatabaseConnectionLimit(databaseUrl: string, connectionLimit: number): string {
  if (/(?:\?|&)connection_limit=/i.test(databaseUrl)) return databaseUrl;

  const separator = databaseUrl.endsWith('?') || databaseUrl.endsWith('&')
    ? ''
    : databaseUrl.includes('?')
      ? '&'
      : '?';
  return `${databaseUrl}${separator}connection_limit=${connectionLimit}`;
}
