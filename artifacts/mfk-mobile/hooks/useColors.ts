import colors from "@/constants/colors";
import { useThemeMode } from "@/context/ThemeContext";

export function useColors() {
  const { mode } = useThemeMode();

  return { ...colors[mode], radius: colors.radius, mode };
}
