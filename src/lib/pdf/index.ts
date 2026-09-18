import { extractPdf } from './extractor';
import { parseResume } from './parser';
import type { ParseResumeResult } from './types';

export * from './types';
export * from './extractor';
export * from './parser';

/**
 * High-level one-step resume parser: extracts and parses a PDF into ResumeData.
 */
export async function parsePdfResume(
  source: File | ArrayBuffer,
  meta?: { fileName?: string; fileSize?: number; fileType?: string },
): Promise<ParseResumeResult> {
  console.log('[PDF Pipeline] Starting parsePdfResume...');
  const extracted = await extractPdf(source, meta);
  console.log(
    `[PDF Pipeline] Stage A (Layout Extraction) complete: ${extracted.allLines.length} lines, ${extracted.allBlocks.length} blocks reconstructed.`,
  );
  const parsed = parseResume(extracted);
  console.log('[PDF Pipeline] Stage B (Semantic Parsing) complete:', parsed.stats);
  return parsed;
}
