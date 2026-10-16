import { Image, type ImageProps } from "expo-image";
import React from "react";

import { useColors } from "@/hooks/useColors";

const LOGO_DARK = require("@/assets/images/mfk-logo-clear.png");
const LOGO_LIGHT = require("@/assets/images/mfk-logo-on-light.png");

export function BrandLogo({ style, ...rest }: Omit<ImageProps, "source">) {
  const colors = useColors();
  const isDark = colors.mode === "dark";

  return (
    <Image
      source={isDark ? LOGO_DARK : LOGO_LIGHT}
      contentFit="contain"
      transition={0}
      style={style}
      {...rest}
    />
  );
}
