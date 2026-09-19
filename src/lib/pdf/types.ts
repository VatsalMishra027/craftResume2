import type { ResumeData, SectionKey } from '../types';

/**
 * Stage A: Raw text fragment extracted from PDF.js with spatial coordinates.
 */
export interface TextFragment {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  page: number;
}

/**
 * Stage A: Reconstructed visual line of text sorted in reading order.
 */
export interface TextLine {
  id: string;
  page: number;
  columnIndex: number;
  y: number;
  height: number;
  minX: number;
  maxX: number;
  text: string;
  items: TextFragment[];
  isAllUpper: boolean;
  maxFontSize: number;
  spacingBefore: number;
  spacingAfter: number;
}

/**
 * Stage A: Detected column region within a page.
 */
export interface ColumnRegion {
  index: number;
  minX: number;
  maxX: number;
  lines: TextLine[];
}

/**
 * Stage A: Grouped block of lines (paragraph, bullet item, or heading candidate).
 */
export interface TextBlock {
  id: string;
  page: number;
  columnIndex: number;
  lines: TextLine[];
  text: string;
  isHeadingCandidate: boolean;
  suggestedHeading?: string;
  headingConfidence?: 'high' | 'medium' | 'low';
}

/**
 * Stage A Intermediate Representation: Normalized document geometry and typography.
 */
export interface ParsedDocument {
  pages: {
    pageNumber: number;
    width: number;
    height: number;
    columns: ColumnRegion[];
    blocks: TextBlock[];
  }[];
  allBlocks: TextBlock[];
  allLines: TextLine[];
  typographyMetadata: {
    avgFontSize: number;
    headingThreshold: number;
    fontFamilies: string[];
  };
}

/**
 * Source location metadata for auditing where a field originated in the PDF.
 */
export interface SourceLocation {
  page: number;
  blockId: string;
  rawText: string;
}

export type ItemCategory =
  | 'achievements'
  | 'codingProfiles'
  | 'certifications'
  | 'experience'
  | 'projects'
  | 'publications'
  | 'custom';

/**
 * Extracted item within a detected section or unmapped block.
 * Preserves multi-line content, bullets, bold labels, dates, links, and metrics.
 */
export interface ExtractedSectionItem {
  id: string;
  text: string;
  name: string;
  detail?: string;
  date?: string;
  url?: string;
  suggestedCategory?: ItemCategory;
  suggestedCategoryLabel?: string;
  assignedCategory?: ItemCategory;
}

/**
 * Statistics and extracted item breakdown for each detected section.
 */
export interface DetectedSectionStat {
  heading: string;
  sectionKey: SectionKey | 'summary' | 'unmapped';
  itemCount: number;
  items: ExtractedSectionItem[];
}

/**
 * Any section that cannot be confidently mapped to a standard section.
 * Must never be silently discarded.
 */
export interface UnmappedSection {
  id: string;
  rawHeading: string;
  content: string;
  confidence: 'low';
  suggestedCategory?: SectionKey;
  source: SourceLocation;
  itemCount: number;
  items: ExtractedSectionItem[];
}

/**
 * Stage B Semantic Output: Standard ResumeData alongside confidence, source mapping, and unmapped sections.
 */
export interface ParsedResumeResult {
  data: ResumeData;
  confidence: Record<string, SectionConfidence>;
  sourceMapping: Record<string, SourceLocation>;
  unmappedSections: UnmappedSection[];
  stats: {
    pagesCount: number;
    detectedSections: string[];
    sectionStats: DetectedSectionStat[];
    experienceCount: number;
    educationCount: number;
    skillsCount: number;
    projectsCount: number;
    unmappedCount: number;
    needsReviewCount: number;
  };
}
