import * as XLSX from 'xlsx';
import { STANDARD_HEADERS } from './normalizeRows';

/**
 * Takes normalized row objects and triggers a download of a .xlsx file.
 */
export function exportToExcel(rows, filename = 'fixed-statement.xlsx') {
  const worksheetData = [STANDARD_HEADERS, ...rows.map((r) => STANDARD_HEADERS.map((h) => r[h] ?? ''))];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Reasonable column widths
  worksheet['!cols'] = [
    { wch: 10 }, // Date
    { wch: 60 }, // Narration
    { wch: 20 }, // Chq/Ref
    { wch: 10 }, // Value Dt
    { wch: 14 }, // Withdrawal
    { wch: 14 }, // Deposit
    { wch: 16 }, // Closing Balance
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
  XLSX.writeFile(workbook, filename);
}
