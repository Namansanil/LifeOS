import { TextStyle } from 'react-native';

export const Typography = {
  // Editorial Display
  displayLarge: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.8,
  } as TextStyle,
  
  displayMedium: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,

  displayMetric: {
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -1.5,
  } as TextStyle,
  
  displayMetricSmall: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  } as TextStyle,

  // Section & Card Headings
  headingLarge: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
  } as TextStyle,
  
  headingMedium: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,
  
  headingSmall: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  } as TextStyle,

  // Uppercase Editorial Headers & Badges
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  } as TextStyle,

  eyebrowSmall: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Body Content
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } as TextStyle,
  
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,
  
  bodySmall: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
  } as TextStyle,

  // Labels & Controls
  labelBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  } as TextStyle,

  labelMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  } as TextStyle,

  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  } as TextStyle,

  // Monospace / Timer metrics
  monoMetric: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: 0.5,
  } as TextStyle,
};
