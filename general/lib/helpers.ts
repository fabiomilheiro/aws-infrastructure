import { StackProps } from "./types";

export const addPrefix = (source: string, stackProps: StackProps): string => {
  return `${stackProps.environmentName}-${stackProps.env?.region}-${source}`;
};
