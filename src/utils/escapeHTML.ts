/**
 * Sanitizes a string to prevent XSS injection when used in innerHTML.
 * Use this on any user-generated content before rendering.
 */
export function escapeHTML(str: string): string {
  return String(str).replace(/[&<>'"]/g, (tag) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return map[tag] ?? tag;
  });
}
