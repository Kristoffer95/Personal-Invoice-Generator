import { StyleSheet } from '@react-pdf/renderer'

export type PdfTheme = 'light' | 'dark' | 'noir' | 'midnight' | 'minimal'

// Light theme colors - clean Swiss-inspired design
const lightColors = {
  primary: '#000000',
  secondary: '#404040',
  accent: '#171717',
  text: '#171717',
  textLight: '#525252',
  textMuted: '#737373',
  border: '#e5e5e5',
  borderLight: '#f5f5f5',
  background: '#ffffff',
  cardBackground: '#fafafa',
  tableRowAlt: '#fafafa',
  workHoursBg: '#f5f5f5',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

// Dark theme colors - slate-based dark mode
const darkColors = {
  primary: '#fafafa',
  secondary: '#a3a3a3',
  accent: '#60a5fa',
  text: '#fafafa',
  textLight: '#a3a3a3',
  textMuted: '#737373',
  border: '#404040',
  borderLight: '#262626',
  background: '#0a0a0a',
  cardBackground: '#171717',
  tableRowAlt: '#171717',
  workHoursBg: '#1a1a2e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

// Noir theme colors - pure black Vercel-inspired aesthetic
const noirColors = {
  primary: '#ffffff',
  secondary: '#a3a3a3',
  accent: '#ffffff',
  text: '#ffffff',
  textLight: '#a3a3a3',
  textMuted: '#737373',
  border: '#262626',
  borderLight: '#171717',
  background: '#000000',
  cardBackground: '#0a0a0a',
  tableRowAlt: '#0a0a0a',
  workHoursBg: '#0a0a0a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

// Midnight theme - deep blue-black elegant
const midnightColors = {
  primary: '#e2e8f0',
  secondary: '#94a3b8',
  accent: '#38bdf8',
  text: '#e2e8f0',
  textLight: '#94a3b8',
  textMuted: '#64748b',
  border: '#1e293b',
  borderLight: '#0f172a',
  background: '#020617',
  cardBackground: '#0f172a',
  tableRowAlt: '#0f172a',
  workHoursBg: '#0f172a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

// Minimal theme - ultra clean light mode
const minimalColors = {
  primary: '#18181b',
  secondary: '#52525b',
  accent: '#18181b',
  text: '#18181b',
  textLight: '#52525b',
  textMuted: '#a1a1aa',
  border: '#f4f4f5',
  borderLight: '#fafafa',
  background: '#ffffff',
  cardBackground: '#ffffff',
  tableRowAlt: '#fafafa',
  workHoursBg: '#fafafa',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

export function getColors(theme: PdfTheme = 'light') {
  switch (theme) {
    case 'noir':
      return noirColors
    case 'dark':
      return darkColors
    case 'midnight':
      return midnightColors
    case 'minimal':
      return minimalColors
    default:
      return lightColors
  }
}

// Keep default export for backwards compatibility
export const colors = lightColors

export function createStyles(theme: PdfTheme = 'light') {
  const c = getColors(theme)
  const isDark = theme === 'dark' || theme === 'noir' || theme === 'midnight'

  // Use Helvetica as base (Geist not available in react-pdf, Helvetica is closest)
  const fontFamily = 'Helvetica'
  const fontBold = 'Helvetica-Bold'

  return StyleSheet.create({
    page: {
      fontFamily,
      fontSize: 10,
      paddingTop: 48,
      paddingBottom: 64,
      paddingHorizontal: 48,
      backgroundColor: c.background,
      color: c.text,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 36,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      flex: 1,
      alignItems: 'flex-end',
    },
    logo: {
      maxWidth: 100,
      maxHeight: 48,
      marginBottom: 12,
    },
    title: {
      fontSize: 32,
      fontFamily: fontBold,
      color: c.primary,
      marginBottom: 4,
      letterSpacing: -1,
    },
    invoiceNumber: {
      fontSize: 11,
      color: c.textLight,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    partiesSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    partyBox: {
      flex: 1,
      maxWidth: '45%',
    },
    partyLabel: {
      fontSize: 9,
      fontFamily: fontBold,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    partyName: {
      fontSize: 13,
      fontFamily: fontBold,
      color: c.primary,
      marginBottom: 6,
    },
    partyDetail: {
      fontSize: 10,
      color: c.text,
      marginBottom: 2,
      lineHeight: 1.5,
    },
    datesSection: {
      flexDirection: 'row',
      marginBottom: 28,
      padding: 16,
      backgroundColor: c.cardBackground,
      borderRadius: 8,
      ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
    },
    dateBox: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 9,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    dateValue: {
      fontSize: 11,
      fontFamily: fontBold,
      color: c.text,
    },
    table: {
      marginBottom: 24,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? c.cardBackground : c.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
    },
    tableHeaderCell: {
      color: isDark ? c.text : '#ffffff',
      fontSize: 9,
      fontFamily: fontBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    tableRowAlternate: {
      backgroundColor: c.tableRowAlt,
    },
    tableCell: {
      fontSize: 10,
      color: c.text,
    },
    colDate: {
      width: '20%',
    },
    colDescription: {
      width: '40%',
    },
    colHours: {
      width: '15%',
      textAlign: 'right',
    },
    colRate: {
      width: '15%',
      textAlign: 'right',
    },
    colAmount: {
      width: '15%',
      textAlign: 'right',
    },
    colQty: {
      width: '10%',
      textAlign: 'right',
    },
    summarySection: {
      marginTop: 16,
      alignItems: 'flex-end',
    },
    summaryBox: {
      width: 260,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    summaryLabel: {
      fontSize: 10,
      color: c.textLight,
    },
    summaryValue: {
      fontSize: 10,
      color: c.text,
      fontFamily: fontBold,
    },
    summaryDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginVertical: 8,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: isDark ? c.cardBackground : c.primary,
      borderRadius: 6,
      ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
    },
    totalLabel: {
      fontSize: 12,
      color: isDark ? c.text : '#ffffff',
      fontFamily: fontBold,
      letterSpacing: 0.5,
    },
    totalValue: {
      fontSize: 16,
      color: isDark ? c.text : '#ffffff',
      fontFamily: fontBold,
    },
    footer: {
      position: 'absolute',
      bottom: 48,
      left: 48,
      right: 48,
    },
    footerSection: {
      marginBottom: 16,
    },
    footerTitle: {
      fontSize: 10,
      fontFamily: fontBold,
      color: c.primary,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    footerText: {
      fontSize: 9,
      color: c.textLight,
      lineHeight: 1.6,
    },
    bankDetails: {
      padding: 14,
      backgroundColor: c.cardBackground,
      borderRadius: 6,
      marginBottom: 16,
      ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
    },
    bankDetailRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    bankDetailLabel: {
      fontSize: 9,
      color: c.textMuted,
      width: 100,
    },
    bankDetailValue: {
      fontSize: 9,
      color: c.text,
      fontFamily: fontBold,
    },
    pageNumber: {
      position: 'absolute',
      bottom: 24,
      right: 48,
      fontSize: 9,
      color: c.textMuted,
      letterSpacing: 0.5,
    },
    workHoursSummary: {
      flexDirection: 'row',
      marginBottom: 24,
      padding: 18,
      backgroundColor: c.workHoursBg,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: c.accent,
      ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
    },
    workHoursStat: {
      flex: 1,
      alignItems: 'center',
    },
    workHoursValue: {
      fontSize: 20,
      fontFamily: fontBold,
      color: c.primary,
      marginBottom: 6,
    },
    workHoursLabel: {
      fontSize: 9,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  })
}

// Default styles for backwards compatibility
export const styles = createStyles('light')

// Export theme presets for UI selection
export const THEME_PRESETS = [
  { id: 'light', name: 'Light', description: 'Clean Swiss-inspired design' },
  { id: 'minimal', name: 'Minimal', description: 'Ultra clean and simple' },
  { id: 'dark', name: 'Dark', description: 'Slate-based dark mode' },
  { id: 'noir', name: 'Noir', description: 'Pure black Vercel aesthetic' },
  { id: 'midnight', name: 'Midnight', description: 'Deep blue-black elegant' },
] as const
