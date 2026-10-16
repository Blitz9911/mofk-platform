declare module "expo-print" {
  export function printToFileAsync(options: {
    html: string;
    base64?: boolean;
    width?: number;
    height?: number;
    margins?: {
      left?: number;
      top?: number;
      right?: number;
      bottom?: number;
    };
  }): Promise<{ uri: string; numberOfPages?: number; base64?: string }>;
}

declare module "expo-sharing" {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(
    url: string,
    options?: {
      mimeType?: string;
      dialogTitle?: string;
      UTI?: string;
    },
  ): Promise<void>;
}
