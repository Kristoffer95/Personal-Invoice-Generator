import { StyleSheet } from '@react-pdf/renderer'

export const colors = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  white: '#ffffff',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logo: {
    maxWidth: 120,
    maxHeight: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 3,
  },
  partiesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  partyBox: {
    flex: 1,
    maxWidth: '45%',
  },
  partyLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  partyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 2,
  },
  datesSection: {
    flexDirection: 'row',
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  dateBox: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowAlternate: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 10,
    color: colors.text,
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
    marginTop: 10,
    alignItems: 'flex-end',
  },
  summaryBox: {
    width: 250,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textLight,
  },
  summaryValue: {
    fontSize: 10,
    color: colors.text,
    fontFamily: 'Helvetica-Bold',
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    fontSize: 14,
    color: colors.white,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerSection: {
    marginBottom: 15,
  },
  footerTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 5,
  },
  footerText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  bankDetails: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    marginBottom: 15,
  },
  bankDetailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bankDetailLabel: {
    fontSize: 9,
    color: colors.textMuted,
    width: 100,
  },
  bankDetailValue: {
    fontSize: 9,
    color: colors.text,
    fontFamily: 'Helvetica-Bold',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: colors.textMuted,
  },
  workHoursSummary: {
    flexDirection: 'row',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  workHoursStat: {
    flex: 1,
    alignItems: 'center',
  },
  workHoursValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  workHoursLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})
