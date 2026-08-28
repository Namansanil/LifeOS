export const Palette = {
  // Brand / Editorial Core
  cream: '#FAF8F5',
  creamDark: '#F2EDE4',
  paperLight: '#F7F5F0',
  white: '#FFFFFF',
  
  // Surfaces & Dark Mode
  midnight: '#121418',
  darkSurface: '#16191F',
  darkSurfaceElevated: '#21252E',
  darkBorder: '#2C323E',
  
  // Athletic & Ocean Accents
  forestGreen: '#1B3B2B',
  forestGreenLight: '#26543E',
  forestGreenMuted: '#E7EFEA',
  
  coastalNavy: '#1B2E3D',
  coastalNavyLight: '#28465C',
  coastalNavyMuted: '#E5ECF2',
  
  streakAmber: '#C25E00',
  streakAmberLight: '#E67300',
  streakAmberMuted: '#FFF0E0',
  
  // Secondary / Natural Editorial Accents
  terracotta: '#C85A32',
  terracottaMuted: '#FAECE7',
  
  sage: '#3D5A45',
  sageMuted: '#EBF1ED',
  
  slate: '#475569',
  slateLight: '#64748B',
  slateMuted: '#94A3B8',
  stoneBorder: '#E5E0D6',
  stoneBorderLight: '#EFECE6',
  
  // Semantic status
  success: '#1B3B2B',
  warning: '#C25E00',
  error: '#BA1A1A',
  info: '#1B2E3D',
};

export const LightTheme = {
  background: Palette.cream,
  backgroundSecondary: Palette.paperLight,
  surface: Palette.white,
  surfaceElevated: Palette.white,
  surfaceSubdued: Palette.creamDark,
  
  border: Palette.stoneBorder,
  borderLight: Palette.stoneBorderLight,
  
  textPrimary: '#14171A',
  textSecondary: '#5C6470',
  textMuted: '#8C94A0',
  textInverse: Palette.white,
  
  primary: Palette.forestGreen,
  primaryForeground: Palette.white,
  primaryMuted: Palette.forestGreenMuted,
  
  navy: Palette.coastalNavy,
  navyForeground: Palette.white,
  navyMuted: Palette.coastalNavyMuted,
  
  amber: Palette.streakAmber,
  amberForeground: Palette.white,
  amberMuted: Palette.streakAmberMuted,
  
  terracotta: Palette.terracotta,
  terracottaMuted: Palette.terracottaMuted,
  
  badgeBackground: Palette.creamDark,
  badgeText: Palette.forestGreen,
  
  cardShadow: 'rgba(20, 23, 26, 0.04)',
  divider: Palette.stoneBorderLight,
};

export const DarkTheme = {
  background: Palette.midnight,
  backgroundSecondary: '#16181D',
  surface: Palette.darkSurface,
  surfaceElevated: Palette.darkSurfaceElevated,
  surfaceSubdued: '#1A1E26',
  
  border: Palette.darkBorder,
  borderLight: '#232833',
  
  textPrimary: '#F5F6F8',
  textSecondary: '#A2A9B6',
  textMuted: '#6B7280',
  textInverse: Palette.midnight,
  
  primary: '#4ADE80',
  primaryForeground: Palette.midnight,
  primaryMuted: '#143823',
  
  navy: '#60A5FA',
  navyForeground: Palette.midnight,
  navyMuted: '#172B45',
  
  amber: '#FB923C',
  amberForeground: Palette.midnight,
  amberMuted: '#3D220E',
  
  terracotta: '#F87171',
  terracottaMuted: '#3D1515',
  
  badgeBackground: Palette.darkSurfaceElevated,
  badgeText: '#4ADE80',
  
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  divider: '#232833',
};

export type ThemeTokens = typeof LightTheme;
