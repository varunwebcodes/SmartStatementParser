import React, { useState, useCallback } from 'react';
import { parseCSVFile, parseExcelFile } from './utils/parseCSV';
import { parseImageFile } from './utils/parseImage';
import { parsePDFFile } from './utils/parsePDF';
import { normalizeStructuredRows, normalizeOcrLines, STANDARD_HEADERS } from './utils/normalizeRows';
import { exportToExcel } from './utils/exportExcel';

const STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  DONE: 'done',
  ERROR: 'error',
};

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setStatus(STATUS.WORKING);
    setError('');
    setRows([]);
    setProgress(0);
    setFileName(file.name);

    const ext = file.name.split('.').pop().toLowerCase();

    try {
      let normalized = [];

      if (ext === 'csv') {
        setStatusMessage('Reading CSV…');
        const table = await parseCSVFile(file);
        normalized = normalizeStructuredRows(table);
      } else if (ext === 'xlsx' || ext === 'xls') {
        setStatusMessage('Reading spreadsheet…');
        const table = await parseExcelFile(file);
        normalized = normalizeStructuredRows(table);
      } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) {
        setStatusMessage('Reading text from image (OCR)…');
        const lines = await parseImageFile(file, (pct) => {
          setProgress(pct);
          setStatusMessage(`Reading text from image (OCR)… ${pct}%`);
        });
        normalized = normalizeOcrLines(lines);
      } else if (ext === 'pdf') {
        setStatusMessage('Reading PDF text…');
        const lines = await parsePDFFile(file);
        normalized = normalizeOcrLines(lines);
      } else {
        throw new Error(`Unsupported file type: .${ext}. Try CSV, XLSX, PDF, or PNG/JPG.`);
      }

      if (normalized.length === 0) {
        throw new Error(
          'No transaction rows were detected. If this was a scanned image or PDF, ' +
            'try a higher-resolution screenshot, or export a CSV/XLSX directly from your bank if possible.'
        );
      }

      setRows(normalized);
      setStatus(STATUS.DONE);
      setStatusMessage(`Fixed ${normalized.length} rows.`);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
      setStatus(STATUS.ERROR);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const download = () => {
    const base = fileName.replace(/\.[^/.]+$/, '') || 'statement';
    exportToExcel(rows, `${base}-fixed.xlsx`);
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Smart Statement Parser</h1>
        <p className="subtitle">
          Upload a bank statement (CSV, XLSX, PDF, or a screenshot). Wrapped, multi-line
          Narration text gets collapsed back into a single cell per transaction — then
          download it as a clean Excel file.
        </p>
      </header>

      <main>
        <div
          className={`dropzone ${status === STATUS.WORKING ? 'dropzone--busy' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.bmp"
            onChange={onInputChange}
            disabled={status === STATUS.WORKING}
          />
          <label htmlFor="file-input" className="dropzone__label">
            {status === STATUS.WORKING ? (
              <span>{statusMessage || 'Working…'}</span>
            ) : (
              <span>Drop a file here, or click to choose one</span>
            )}
          </label>
          <p className="dropzone__hint">Supported: .csv .xlsx .xls .pdf .png .jpg</p>
        </div>

        {status === STATUS.ERROR && <div className="banner banner--error">{error}</div>}

        {status === STATUS.DONE && (
          <div className="results">
            <div className="results__bar">
              <span>{statusMessage}</span>
              <button onClick={download}>Download Excel</button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {STANDARD_HEADERS.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      {STANDARD_HEADERS.map((h) => (
                        <td key={h} className={h === 'Narration' ? 'cell-narration' : ''}>
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Note: OCR-based extraction (images / scanned PDFs) is heuristic — always spot-check
          the amounts and dates before relying on the output.
        </p>
      </footer>
    </div>
  );
}
