import type * as React from "react";

const THEMES = { light: "", dark: ".dark" } as const;

type TooltipNameType = number | string;

type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> })
>;

export { THEMES };
export type { ChartConfig, TooltipNameType };
