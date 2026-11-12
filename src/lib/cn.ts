/** Join class names, skipping falsy values. Tiny on purpose — no tailwind-merge. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
