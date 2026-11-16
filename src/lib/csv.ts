const cell = (value: string | number | null | undefined) => {
  let s = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) { return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') }
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}
