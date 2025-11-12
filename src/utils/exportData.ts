import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string | number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
  includeTimestamp?: boolean;
}

/**
 * Exports data to CSV format
 */
export const exportToCSV = (options: ExportOptions): void => {
  const { filename, columns, data, includeTimestamp = true } = options;
  
  // Create header row
  const headers = columns.map(col => col.label);
  
  // Create data rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      return col.format ? col.format(value) : value;
    })
  );
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');
  
  // Create and download file
  const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : '';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${filename}${timestamp}.csv`);
};

/**
 * Exports data to Excel format
 */
export const exportToExcel = (options: ExportOptions): void => {
  const { filename, sheetName = 'Sheet1', columns, data, includeTimestamp = true } = options;
  
  // Create header row
  const headers = columns.map(col => col.label);
  
  // Create data rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      return col.format ? col.format(value) : value;
    })
  );
  
  // Combine headers and rows
  const worksheetData = [headers, ...rows];
  
  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const columnWidths = columns.map(col => ({ wch: Math.max(col.label.length, 15) }));
  worksheet['!cols'] = columnWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate and download file
  const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : '';
  XLSX.writeFile(workbook, `${filename}${timestamp}.xlsx`);
};

/**
 * Helper function to download a file
 */
const downloadFile = (blob: Blob, filename: string): void => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Format currency for export (removes currency symbol)
 */
export const formatCurrencyForExport = (value: number): number => {
  return Number(value.toFixed(2));
};

