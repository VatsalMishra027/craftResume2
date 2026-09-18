import * as pdfjsLib from 'pdfjs-dist';
import type {
  ColumnRegion,
  ParsedDocument,
  TextBlock,
  TextFragment,
  TextLine,
} from './types';

/**
 * Configures PDF.js worker with same-origin URL from the public directory.
 * Ensures identical version match with pdfjs-dist (6.3.289) and works in both dev and build.
 */
function ensurePdfWorkerConfigured(): void {
  if (typeof window === 'undefined') return;

  try {
    const origin = window.location.origin || '';
    const workerUrl = `${origin}/pdf.worker.min.mjs`;

    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerUrl) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      console.log(`[PDF.js Worker] Configured same-origin worker: ${workerUrl}`);
    }
  } catch (err) {
    console.warn('[PDF.js Worker] Warning setting workerSrc:', err);
  }
}

// Initial attempt on module load
ensurePdfWorkerConfigured();

let lineCounter = 0;
let blockCounter = 0;

function nextLineId(): string {
  lineCounter += 1;
  return `line-${lineCounter}`;
}

function nextBlockId(): string {
  blockCounter += 1;
  return `block-${blockCounter}`;
}

/**
 * Stage A: Extracts raw PDF fragments and reconstructs geometry, columns, lines, and text blocks.
 */
export async function extractPdf(
  source: File | ArrayBuffer,
  meta?: { fileName?: string; fileSize?: number; fileType?: string },
): Promise<ParsedDocument> {
  console.log('--- [PDF Extractor] Starting Extraction Pipeline ---');
  if (meta) {
    console.log(`[PDF Extractor] Uploaded filename: ${meta.fileName ?? 'unknown'}`);
    console.log(`[PDF Extractor] File size: ${meta.fileSize != null ? `${meta.fileSize} bytes` : 'unknown'}`);
    console.log(`[PDF Extractor] MIME type: ${meta.fileType ?? 'unknown'}`);
  }

  const data = source instanceof File ? await source.arrayBuffer() : source;
  console.log(`[PDF Extractor] ArrayBuffer byte length: ${data.byteLength} bytes`);

  ensurePdfWorkerConfigured();
  console.log(`[PDF Extractor] Current workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc || '(none)'}`);

  const docParams: any = {
    data: new Uint8Array(data),
    useSystemFonts: true,
  };

  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    docParams.cMapUrl = `${origin}/cmaps/`;
    docParams.cMapPacked = true;
    docParams.standardFontDataUrl = `${origin}/standard_fonts/`;
  }

  console.log('[PDF Extractor] Calling pdfjsLib.getDocument()...');
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument(docParams);
    pdf = await loadingTask.promise;
    console.log(`[PDF Extractor] getDocument() SUCCEEDED: loaded ${pdf.numPages} page(s).`);
  } catch (err) {
    console.error('[PDF Extractor] getDocument() FAILED:', err);
    throw err;
  }

  const allFragments: TextFragment[] = [];
  const parsedPages: ParsedDocument['pages'] = [];
  const allBlocks: TextBlock[] = [];
  const allLines: TextLine[] = [];

  lineCounter = 0;
  blockCounter = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    let page: pdfjsLib.PDFPageProxy;
    try {
      page = await pdf.getPage(pageNum);
      console.log(`[PDF Extractor] Page ${pageNum}: getPage() SUCCEEDED`);
    } catch (err) {
      console.error(`[PDF Extractor] Page ${pageNum}: getPage() FAILED:`, err);
      throw err;
    }

    const viewport = page.getViewport({ scale: 1.0 });
    let textContent: pdfjsLib.TextContent;
    try {
      textContent = await page.getTextContent();
      console.log(`[PDF Extractor] Page ${pageNum}: getTextContent() returned ${textContent.items.length} items`);
      console.log(
        `[PDF Extractor] Page ${pageNum}: first 5 raw PDF.js text items:`,
        textContent.items.slice(0, 5),
      );
    } catch (err) {
      console.error(`[PDF Extractor] Page ${pageNum}: getTextContent() FAILED:`, err);
      throw err;
    }

    const pageFragments: TextFragment[] = [];

    for (const item of textContent.items) {
      // Defensive structure check: item must be an object with 'str'
      if (!item || typeof item !== 'object' || !('str' in item)) continue;

      const rawItem = item as any;
      const str = rawItem.str;
      if (typeof str !== 'string' || !str.trim()) continue;

      const transform = Array.isArray(rawItem.transform) && rawItem.transform.length >= 6
        ? rawItem.transform
        : [10, 0, 0, 10, 0, 0];

      // Safe extraction of font size:
      // In PDF transformation matrices [a, b, c, d, e, f]:
      // scaleX = hypot(a, b), scaleY = hypot(c, d)
      const a = typeof transform[0] === 'number' ? transform[0] : 10;
      const b = typeof transform[1] === 'number' ? transform[1] : 0;
      const c = typeof transform[2] === 'number' ? transform[2] : 0;
      const d = typeof transform[3] === 'number' ? transform[3] : 10;

      const scaleX = Math.hypot(a, b);
      const scaleY = Math.hypot(c, d);
      const fontSize = Math.max(4, Math.round((scaleY || scaleX || 10) * 10) / 10);

      // Convert PDF coordinate origin (bottom-left) to top-down reading origin (top-left)
      const rawY = typeof transform[5] === 'number' ? transform[5] : 0;
      const rawX = typeof transform[4] === 'number' ? transform[4] : 0;
      const y = Math.max(0, viewport.height - rawY);
      const x = Math.max(0, rawX);

      // PDF.js does not guarantee height: if absent or 0, fallback to fontSize
      const height = typeof rawItem.height === 'number' && rawItem.height > 0
        ? rawItem.height
        : fontSize;

      // PDF.js width: if absent or 0, estimate from character length and font size
      const width = typeof rawItem.width === 'number' && rawItem.width > 0
        ? rawItem.width
        : Math.max(1, str.length * fontSize * 0.5);

      // Font family and style: textContent.styles provides font metadata
      const style = textContent.styles ? textContent.styles[rawItem.fontName] : undefined;
      const resolvedFontFamily = style?.fontFamily || rawItem.fontName || '';

      const frag: TextFragment = {
        text: str,
        x,
        y,
        width,
        height,
        fontSize,
        fontName: resolvedFontFamily,
        page: pageNum,
      };

      pageFragments.push(frag);
      allFragments.push(frag);
    }

    // Detect columns and reconstruct lines
    const columns = detectAndBuildColumns(pageFragments, viewport.width, pageNum);

    // Flatten lines in strict column reading order
    const pageLines: TextLine[] = [];
    columns.forEach((col) => {
      pageLines.push(...col.lines);
    });

    // Compute spacing before & after lines
    computeLineSpacings(pageLines);

    // Group lines into semantic blocks (paragraphs, bullets, heading candidates)
    const pageBlocks = groupLinesIntoBlocks(columns, pageNum);

    parsedPages.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      columns,
      blocks: pageBlocks,
    });

    allBlocks.push(...pageBlocks);
    allLines.push(...pageLines);
  }

  console.log(`[PDF Extractor] Final number of extracted fragments: ${allFragments.length}`);
  const totalTextLength = allFragments.reduce((acc, f) => acc + f.text.length, 0);
  console.log(`[PDF Extractor] Final extracted text length: ${totalTextLength} characters`);

  if (allFragments.length === 0) {
    console.warn('[PDF Extractor] Zero text fragments extracted from this document.');
    throw new Error(
      'No selectable text could be extracted from this PDF. It may be an image/scanned document or protected. Please upload a PDF with selectable text.',
    );
  }

  const sample = allFragments.slice(0, 15).map((f) => f.text).join(' ');
  console.log(`[PDF Extractor] First 300 characters of extracted text: "${sample.slice(0, 300)}"`);

  // Compute overall document typography metrics
  const fontSizes = allFragments.map((f) => f.fontSize).filter((s) => s > 0);
  const avgFontSize = fontSizes.length
    ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length
    : 10;

  const fontFamilies = Array.from(
    new Set(allFragments.map((f) => f.fontName).filter(Boolean)),
  );

  return {
    pages: parsedPages,
    allBlocks,
    allLines,
    typographyMetadata: {
      avgFontSize,
      headingThreshold: avgFontSize * 1.15,
      fontFamilies,
    },
  };
}

/**
 * Detects whether page fragments form 1, 2, or 3 columns by inspecting horizontal gutters.
 */
function detectAndBuildColumns(
  fragments: TextFragment[],
  pageWidth: number,
  pageNum: number,
): ColumnRegion[] {
  if (!fragments.length) return [];

  // Look for vertical gutters where no text crosses
  const gutterSplit = findGutterSplit(fragments, pageWidth);

  if (gutterSplit !== null) {
    const col1Frags = fragments.filter((f) => f.x < gutterSplit);
    const col2Frags = fragments.filter((f) => f.x >= gutterSplit);

    const col1Lines = groupFragmentsIntoLines(col1Frags, pageNum, 0);
    const col2Lines = groupFragmentsIntoLines(col2Frags, pageNum, 1);

    return [
      {
        index: 0,
        minX: 0,
        maxX: gutterSplit,
        lines: col1Lines,
      },
      {
        index: 1,
        minX: gutterSplit,
        maxX: pageWidth,
        lines: col2Lines,
      },
    ];
  }

  // Single Column
  const singleLines = groupFragmentsIntoLines(fragments, pageNum, 0);
  return [
    {
      index: 0,
      minX: 0,
      maxX: pageWidth,
      lines: singleLines,
    },
  ];
}

/**
 * Finds a clear vertical gutter between columns.
 */
function findGutterSplit(fragments: TextFragment[], pageWidth: number): number | null {
  if (fragments.length < 25) return null;

  const numBuckets = 30;
  const bucketWidth = pageWidth / numBuckets;
  const bucketCounts = new Array(numBuckets).fill(0);

  // Mark all horizontal buckets covered by each fragment's bounding box
  for (const f of fragments) {
    const startBucket = Math.max(0, Math.floor(f.x / bucketWidth));
    const endBucket = Math.min(numBuckets - 1, Math.floor((f.x + f.width) / bucketWidth));

    for (let b = startBucket; b <= endBucket; b += 1) {
      bucketCounts[b] += 1;
    }
  }

  // Search for an empty or very low density valley between 20% and 65% of page width
  const minSearchIndex = Math.floor(numBuckets * 0.2);
  const maxSearchIndex = Math.floor(numBuckets * 0.65);

  let bestSplitX: number | null = null;
  let lowestCount = Infinity;

  for (let b = minSearchIndex; b <= maxSearchIndex; b += 1) {
    // If bucket has 0 or 1 item crossing and left/right both have substantial content
    if (bucketCounts[b] <= 1 && bucketCounts[b] < lowestCount) {
      const leftTotal = bucketCounts.slice(0, b).reduce((a, c) => a + c, 0);
      const rightTotal = bucketCounts.slice(b + 1).reduce((a, c) => a + c, 0);

      // Require at least 15% on left and 25% on right
      if (leftTotal >= fragments.length * 0.15 && rightTotal >= fragments.length * 0.25) {
        lowestCount = bucketCounts[b];
        bestSplitX = (b + 0.5) * bucketWidth;
      }
    }
  }

  return bestSplitX;
}

/**
 * Groups fragments that share similar Y coordinates into a single line.
 */
function groupFragmentsIntoLines(
  fragments: TextFragment[],
  pageNum: number,
  columnIndex: number,
): TextLine[] {
  if (!fragments.length) return [];

  // Sort primarily by Y, then by X
  const sorted = [...fragments].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= 3.0) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const lines: TextLine[] = [];
  let currentGroup: TextFragment[] = [];
  let currentBaseY = sorted[0].y;

  for (const frag of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(frag);
      currentBaseY = frag.y;
      continue;
    }

    if (Math.abs(frag.y - currentBaseY) <= 3.2) {
      currentGroup.push(frag);
    } else {
      lines.push(buildTextLine(currentGroup, pageNum, columnIndex));
      currentGroup = [frag];
      currentBaseY = frag.y;
    }
  }

  if (currentGroup.length > 0) {
    lines.push(buildTextLine(currentGroup, pageNum, columnIndex));
  }

  return lines;
}

function buildTextLine(items: TextFragment[], pageNum: number, columnIndex: number): TextLine {
  items.sort((a, b) => a.x - b.x);

  let text = '';
  let prevRight = -1;

  for (const item of items) {
    const raw = item.text;
    if (!raw) continue;

    // Check if space needed between fragments
    if (prevRight >= 0 && item.x - prevRight > 2.5) {
      if (!text.endsWith(' ') && !raw.startsWith(' ')) {
        text += ' ';
      }
    }

    text += raw;
    prevRight = item.x + item.width;
  }

  text = text.replace(/\s+/g, ' ').trim();

  const maxFontSize = items.reduce((max, it) => Math.max(max, it.fontSize), 0);
  const minX = items.length ? Math.min(...items.map((i) => i.x)) : 0;
  const maxX = items.length ? Math.max(...items.map((i) => i.x + i.width)) : 0;
  const height = items.length ? Math.max(...items.map((i) => i.height)) : 10;
  const y = items.length ? items[0].y : 0;

  const isAllUpper =
    text.length >= 3 &&
    /[A-Z]/.test(text) &&
    text === text.toUpperCase() &&
    !/[0-9@/\\:;,.]/.test(text);

  return {
    id: nextLineId(),
    page: pageNum,
    columnIndex,
    y,
    height,
    minX,
    maxX,
    text,
    items,
    isAllUpper,
    maxFontSize,
    spacingBefore: 0,
    spacingAfter: 0,
  };
}

function computeLineSpacings(lines: TextLine[]): void {
  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) {
      lines[i].spacingBefore = Math.max(0, lines[i].y - (lines[i - 1].y + lines[i - 1].height));
    }
    if (i < lines.length - 1) {
      lines[i].spacingAfter = Math.max(0, lines[i + 1].y - (lines[i].y + lines[i].height));
    }
  }
}

/**
 * Groups lines within columns into cohesive TextBlocks.
 */
function groupLinesIntoBlocks(columns: ColumnRegion[], pageNum: number): TextBlock[] {
  const blocks: TextBlock[] = [];

  for (const col of columns) {
    let currentBlockLines: TextLine[] = [];

    for (let i = 0; i < col.lines.length; i += 1) {
      const line = col.lines[i];

      // If line is isolated by space or has heading typography, treat as distinct block
      const isLargeGap = line.spacingBefore > line.height * 1.6;
      const isBullet = /^[\s•\-\*\–\—\▪\▫\►\✔\⁃\◦]/.test(line.text);

      if (currentBlockLines.length > 0 && (isLargeGap || line.isAllUpper || isBullet)) {
        blocks.push(buildTextBlock(currentBlockLines, pageNum, col.index));
        currentBlockLines = [line];
      } else {
        currentBlockLines.push(line);
      }
    }

    if (currentBlockLines.length > 0) {
      blocks.push(buildTextBlock(currentBlockLines, pageNum, col.index));
    }
  }

  return blocks;
}

function buildTextBlock(lines: TextLine[], pageNum: number, columnIndex: number): TextBlock {
  const text = lines.map((l) => l.text).join('\n');
  const maxFont = Math.max(...lines.map((l) => l.maxFontSize));
  const isSingleShortLine = lines.length === 1 && lines[0].text.length <= 40;

  const isHeadingCandidate =
    isSingleShortLine && (lines[0].isAllUpper || maxFont >= 11);

  return {
    id: nextBlockId(),
    page: pageNum,
    columnIndex,
    lines,
    text,
    isHeadingCandidate,
  };
}
