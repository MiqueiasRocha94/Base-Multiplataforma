import { NavigationRoot } from "./navigation/navigation-root";
import type { NavigationProps } from "./navigation/types";

export function Navigation(props: NavigationProps) {
  return <NavigationRoot {...props} />;
}

export type { NavigationProps };
