export type PixelOpticsPreset = 'standard' | 'highContrastText' | 'lowGhosting';
export type ColorMode = 'grayscale' | 'color';
export type FontSize = 'small' | 'medium' | 'large';
export type ThemePreset = 'normal' | 'highContrast';
export type Appearance = 'light' | 'dark';

export interface GlobalSettings {
  pixelOptics: PixelOpticsPreset;
  colorMode: ColorMode;
  fontSize: FontSize;
  theme: ThemePreset;
  appearance: Appearance;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  pixelOptics: 'standard',
  colorMode: 'grayscale',
  fontSize: 'medium',
  theme: 'normal',
  appearance: 'light',
};
