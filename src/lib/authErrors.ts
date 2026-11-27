function errorCode(cause: unknown) {
  if (!cause || typeof cause !== 'object' || !('code' in cause)) return '';
  const code = (cause as { code?: unknown }).code;
  return typeof code === 'string' ? code.toLowerCase() : '';
}

function errorText(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  return `${errorCode(cause)} ${message}`.toLowerCase();
}

export function friendlyAuthError(cause: unknown, fallback: string) {
  if (
    cause instanceof TypeError ||
    (cause instanceof Error && /failed to fetch|network|load failed/i.test(cause.message))
  ) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
  }

  const text = errorText(cause);

  if (
    /notauthorizedexception|incorrect username or password|usuario o contraseña incorrectos/.test(
      text,
    )
  ) {
    return 'El correo o la contraseña no son correctos. Revísalos o usa «¿Olvidaste tu contraseña?».';
  }
  if (/usernotconfirmedexception|user is not confirmed|no está confirmado/.test(text)) {
    return 'Tu cuenta todavía no está verificada. Revisa el código enviado a tu correo o solicita uno nuevo.';
  }
  if (/passwordresetrequiredexception|password reset required/.test(text)) {
    return 'Debes cambiar tu contraseña antes de entrar. Usa «¿Olvidaste tu contraseña?».';
  }
  if (
    /toomanyrequestsexception|limitexceededexception|too many|password attempts exceeded/.test(text)
  ) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  }
  if (/invalidpasswordexception|password does not conform/.test(text)) {
    return 'La contraseña no cumple los requisitos de seguridad. Revisa la lista y vuelve a intentarlo.';
  }
  if (
    /codeexpiredexception|codemismatchexception|invalid verification code|expired code/.test(text)
  ) {
    return 'El código no es válido o venció. Solicita uno nuevo e inténtalo otra vez.';
  }
  if (/usernameexistsexception|aliasexistsexception|already exists/.test(text)) {
    return 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.';
  }

  return cause instanceof Error ? cause.message : fallback;
}
