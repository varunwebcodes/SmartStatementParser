# Statement Fixer

A React app that fixes bank statements where the **Narration** column got
wrapped across multiple lines/rows (like a scanned image or a badly exported
sheet), and lets you download a clean `.xlsx` with one row per transaction.

## What it handles

| Input type        | How it's read                          | Merge strategy                                            |
|--------------------|-----------------------------------------|-------------------------------------------------------------|
| `.csv`             | PapaParse                              | Column-based: rows without a Date get folded into the Narration of the previous row |
| `.xlsx` / `.xls`   | SheetJS (`xlsx`)                       | Same column-based strategy                                   |
| `.pdf` (text-based)| `pdfjs-dist` text extraction           | Date-pattern strategy (see below) — works on text PDFs, not scanned image-only PDFs |
| `.png/.jpg/.webp`  | `tesseract.js` OCR, runs in the browser | Date-pattern strategy                                        |

**Date-pattern strategy** (used for OCR/PDF plain text): a line starting with
`dd/mm/yy` is treated as the start of a new transaction. Everything after it,
up until the next such line, gets folded into that transaction's Narration,
except trailing amount-looking tokens (which get assigned to Withdrawal /
Deposit / Closing Balance) and a trailing `dd/mm/yy` (Value Dt).

This mirrors exactly the problem in your screenshot: 5 visual lines of
narration text collapse into one cell, one row per transaction.

## Setup

```bash
# 1. Create the project (or copy this folder as-is into your MERN repo's /client or /frontend directory)
npm install

# 2. Run locally
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Folder structure

```
statement-fixer/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx                # UI: upload, preview table, download button
│   ├── index.css              # styling
│   └── utils/
│       ├── parseCSV.js        # CSV / XLSX -> array of rows
│       ├── parseImage.js      # image -> OCR text lines (tesseract.js)
│       ├── parsePDF.js        # PDF -> text lines (pdfjs-dist)
│       ├── normalizeRows.js   # THE CORE LOGIC: merges wrapped narration
│       └── exportExcel.js     # rows -> downloadable .xlsx (SheetJS)
```

## Plugging into your MERN app

This whole thing runs client-side — no backend needed for the core feature.
To drop it into an existing MERN app:

1. Copy the `src/utils/*` files and `App.jsx` into your React app.
2. `npm install papaparse xlsx tesseract.js pdfjs-dist`
3. If you're using Vite, keep the `?url` worker import in `parsePDF.js`. If
   you're on Create React App / Webpack instead, you'll need to configure the
   PDF.js worker differently — see the `pdfjs-dist` docs for your bundler.

### If you *do* want a Node/Express backend

Reasons you might still want one:
- Processing very large files without tying up the browser
- Using a proper table-OCR/document API (AWS Textract, Google Document AI,
  Azure Form Recognizer) instead of Tesseract — these are dramatically more
  accurate on real bank statement tables and scanned PDFs, since they
  understand table structure directly instead of guessing from raw text.
- Keeping statement data server-side/audited instead of only in the browser

If you want, the same `normalizeStructuredRows` / `normalizeOcrLines`
functions in `normalizeRows.js` are plain JS with no browser dependencies —
you can move them into an Express route as-is (e.g. `POST /api/fix-statement`
that takes an uploaded file via `multer`, runs the same parse + normalize
logic with `xlsx`/`pdfjs-dist`/a server OCR SDK, and returns the `.xlsx`
buffer for download).

## Known limitations

- OCR accuracy on screenshots depends heavily on image resolution/contrast.
  Always spot-check amounts and dates in the preview table before trusting
  the download.
- Scanned (image-only) PDFs aren't handled by `parsePDF.js` as-is, since it
  reads embedded text. For those, route the PDF's rendered pages through the
  same OCR path as images (render each page to a canvas with `pdfjs-dist`,
  then feed the canvas image to `tesseract.js`).
- The date-pattern strategy assumes `dd/mm/yy` or `dd/mm/yyyy` dates. Adjust
  `DATE_RE` in `normalizeRows.js` if your statements use a different format.
