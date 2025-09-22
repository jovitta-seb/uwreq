// scripts/utils/normalize.js
export function normalizeCourseKey(code) {
  return code.replace(/\s+/g, "").toUpperCase(); // "MATH 237" -> "MATH237"
}
