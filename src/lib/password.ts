export type PasswordChecks = {
  length: boolean;
  maxLength: boolean;
  matches?: boolean;
  variety: boolean;
};

export function passwordChecks(password: string, confirm?: string): PasswordChecks {
  const categories = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  return {
    length: password.length >= 12,
    maxLength: password.length > 0 && password.length <= 128,
    matches: confirm === undefined ? undefined : password.length > 0 && password === confirm,
    variety: categories >= 3,
  };
}
