export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_REGEX.test(username);
}

export function isValidPassword(password: string) {
  return password.length >= 8;
}

export function isValidOtpToken(token: string) {
  return /^[0-9]{6}$/.test(token.trim());
}
