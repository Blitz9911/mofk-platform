import colors from "@/constants/colors";

/**
 * Returns the MFK brand design tokens.
 * The app is always dark — returns the dark palette regardless of system theme.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
