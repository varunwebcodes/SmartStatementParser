import { createWorker } from 'tesseract.js';

/**
 * Runs OCR on an image file and returns raw extracted text (line by line).
 * Note: OCR on table screenshots is heuristic. It works best on clean,
 * high-resolution screenshots like bank statement tables. For production-grade
 * table extraction, consider a dedicated table-OCR service (e.g. AWS Textract,
 * Google Document AI) instead of client-side Tesseract.
 */
export async function parseImageFile(file, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const { data } = await worker.recognize(file);
  await worker.terminate();

  // data.text is the full recognized text, newline separated
  return data.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
