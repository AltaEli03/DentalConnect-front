export type PasswordChecks = {
  length: boolean;
  maxLength: boolean;
  matches?: boolean;
  variety: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  symbol: boolean;
};

export function passwordChecks(password: string, confirm?: string): PasswordChecks {
  const lowercase = /[a-z]/.test(password);
  const uppercase = /[A-Z]/.test(password);
  const number = /\d/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);
  const variety = [lowercase, uppercase, number, symbol].filter(Boolean).length >= 3;

  return {
    length: password.length >= 12,
    maxLength: password.length > 0 && password.length <= 128,
    matches: confirm === undefined ? undefined : password.length > 0 && password === confirm,
    variety,
    lowercase,
    uppercase,
    number,
    symbol,
  };
}
