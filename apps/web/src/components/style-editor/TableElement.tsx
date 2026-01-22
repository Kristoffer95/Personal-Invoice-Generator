'use client'

import type { TemplateElement, TableColumn } from '@invoice-generator/shared-types'

interface TableElementProps {
  element: TemplateElement
}

// Sample data for preview
const WORK_HOURS_SAMPLE = [
  { date: 'Jan 2, 2024', description: 'Development work', hours: '8.0', rate: '$75.00', amount: '$600.00' },
  { date: 'Jan 3, 2024', description: 'Code review', hours: '6.0', rate: '$75.00', amount: '$450.00' },
  { date: 'Jan 4, 2024', description: 'Bug fixes', hours: '8.0', rate: '$75.00', amount: '$600.00' },
]

const LINE_ITEMS_SAMPLE = [
  { description: 'Software Development', quantity: '40', unitPrice: '$75.00', amount: '$3,000.00' },
  { description: 'Hosting Setup', quantity: '1', unitPrice: '$200.00', amount: '$200.00' },
]

const SUMMARY_SAMPLE = [
  { label: 'Subtotal', value: '$3,200.00' },
  { label: 'Discount (10%)', value: '-$320.00' },
  { label: 'Tax (8%)', value: '$230.40' },
  { label: 'Total', value: '$3,110.40', isTotal: true },
]

export function TableElement({ element }: TableElementProps) {
  const { tableStyle, type } = element

  const headerBg = tableStyle?.headerBackgroundColor ?? '#1a1a2e'
  const headerText = tableStyle?.headerTextColor ?? '#ffffff'
  const rowBg = tableStyle?.rowBackgroundColor ?? '#ffffff'
  const altRowBg = tableStyle?.alternateRowBackgroundColor ?? '#f8fafc'
  const borderColor = tableStyle?.borderColor ?? '#e0e0e0'
  const showHeaderBorder = tableStyle?.showHeaderBorder ?? true
  const showRowBorders = tableStyle?.showRowBorders ?? true

  if (type === 'table_summary') {
    return (
      <div className="w-full h-full overflow-hidden">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {SUMMARY_SAMPLE.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  backgroundColor: row.isTotal ? headerBg : 'transparent',
                  color: row.isTotal ? headerText : 'inherit',
                }}
              >
                <td
                  className="py-1.5 px-2"
                  style={{
                    borderBottom: showRowBorders && !row.isTotal ? `1px solid ${borderColor}` : undefined,
                    fontWeight: row.isTotal ? 'bold' : 'normal',
                  }}
                >
                  {row.label}
                </td>
                <td
                  className="py-1.5 px-2 text-right"
                  style={{
                    borderBottom: showRowBorders && !row.isTotal ? `1px solid ${borderColor}` : undefined,
                    fontWeight: row.isTotal ? 'bold' : 'normal',
                  }}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Determine columns and sample data based on type
  const getColumnsAndData = () => {
    if (type === 'table_work_hours') {
      const columns: TableColumn[] = tableStyle?.columns ?? [
        { id: 'date', header: 'Date', field: 'date', width: 20, align: 'left' },
        { id: 'description', header: 'Description', field: 'description', width: 40, align: 'left' },
        { id: 'hours', header: 'Hours', field: 'hours', width: 15, align: 'right' },
        { id: 'rate', header: 'Rate', field: 'rate', width: 15, align: 'right' },
        { id: 'amount', header: 'Amount', field: 'amount', width: 15, align: 'right' },
      ]
      return { columns, data: WORK_HOURS_SAMPLE }
    }

    // line_items
    const columns: TableColumn[] = tableStyle?.columns ?? [
      { id: 'item', header: 'Item', field: 'description', width: 50, align: 'left' },
      { id: 'qty', header: 'Qty', field: 'quantity', width: 15, align: 'right' },
      { id: 'price', header: 'Unit Price', field: 'unitPrice', width: 20, align: 'right' },
      { id: 'amount', header: 'Amount', field: 'amount', width: 15, align: 'right' },
    ]
    return { columns, data: LINE_ITEMS_SAMPLE }
  }

  const { columns, data } = getColumnsAndData()

  return (
    <div className="w-full h-full overflow-hidden">
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: headerBg, color: headerText }}>
            {columns.map((col) => (
              <th
                key={col.id}
                className="py-2 px-2 font-semibold uppercase text-[10px]"
                style={{
                  width: `${col.width}%`,
                  textAlign: col.align,
                  borderBottom: showHeaderBorder ? `1px solid ${borderColor}` : undefined,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{ backgroundColor: rowIdx % 2 === 1 ? altRowBg : rowBg }}
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className="py-1.5 px-2"
                  style={{
                    textAlign: col.align,
                    borderBottom: showRowBorders ? `1px solid ${borderColor}` : undefined,
                  }}
                >
                  {(row as Record<string, string>)[col.field]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
