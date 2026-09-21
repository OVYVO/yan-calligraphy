/** Keep Han characters only; drop whitespace and punctuation. */
export function splitText(text: string): string[] {
  return Array.from(text).filter(char => /^\p{Script=Han}$/u.test(char))
}
