export const WEAK_PASSWORDS = [
  "admin",
  "admin123",
  "password",
  "password123",
  "123456",
  "12345678",
  "editor123",
  "viewer123",
];

export function validatePasswordPolicy(password: string) {
  if (password.length < 12) {
    return "密码长度至少 12 位";
  }
  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    return "不能使用默认演示密码或常见弱密码";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "密码必须同时包含字母和数字";
  }
  return null;
}
