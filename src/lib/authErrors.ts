export function friendlyAuthError(cause: unknown, fallback: string) {
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
  }
  return cause instanceof Error ? cause.message : fallback;
}
