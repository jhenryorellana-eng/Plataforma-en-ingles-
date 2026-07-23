const SUPABASE_AUTH_FRAGMENT_KEYS = new Set([
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'id_token',
  'token',
  'token_hash',
  'token_type',
  'code',
  'expires_at',
  'expires_in',
  'error',
  'error_code',
  'error_description',
  'error_uri',
]);

/**
 * Devuelve una URL relativa sin el fragmento cuando Supabase dejó material de
 * autenticación en él. Los anclajes ordinarios se conservan sin cambios.
 */
export function urlWithoutSupabaseAuthFragment(
  pathname: string,
  search: string,
  hash: string,
): string | null {
  const rawFragment = hash.replace(/^#/, '');
  if (!rawFragment) return null;

  const params = new URLSearchParams(rawFragment);
  const containsAuthMaterial = [...params.keys()].some((key) =>
    SUPABASE_AUTH_FRAGMENT_KEYS.has(key.toLowerCase()),
  );

  return containsAuthMaterial ? `${pathname}${search}` : null;
}
