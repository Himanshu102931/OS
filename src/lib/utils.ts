/**
 * Simple, zero-dependency class name joiner for PlacementOS UI components.
 */
export function cn(...inputs: (string | number | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(" ");
}
