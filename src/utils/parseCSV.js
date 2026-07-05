import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parses a CSV file into an array of row arrays (strings).
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: false, // keep blank cells, we need row alignment
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}

/**
 * Parses an XLSX/XLS file into an array of row arrays (strings).
 */
export async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  // header:1 => array of arrays, defval keeps empty cells as ''
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
}
