import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts text lines from a text-based PDF (not scanned/image-only PDFs).
 * Groups text items by their vertical (y) position to approximate lines.
 */
export async function parsePDFFile(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items into lines using their y coordinate (rounded)
    const linesMap = new Map();
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y).push(item);
    });

    // Sort lines top-to-bottom (pdf y-axis grows upward, so descending)
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

    sortedY.forEach((y) => {
      const lineItems = linesMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = lineItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
      if (lineText) allLines.push(lineText);
    });
  }

  return allLines;
}
