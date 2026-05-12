import ExcelJS from 'exceljs';

export interface ConditionEntry {
  condition: string;
  tab: string;
  isHeading: boolean;
}

export interface ExtractionResult {
  conditions: ConditionEntry[];
  stepCount: number;
  sheets: string[];
}

/**
 * Extracts unique conditions and step counts from a BPD Excel file.
 */
export async function extractConditions(file: File): Promise<ExtractionResult> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const results: ConditionEntry[] = [];
  let totalStepCount = 0;
  const allSheetNames: string[] = [];

  // Keywords that indicate a switch from conditions to other sections
  const stopKeywords = new Set([
    'disposition',
    'possible next steps',
    'possible dispositions',
    'possible screen dispositions',
    'possible interview dispositions',
    'possible review dispositions',
    'possible assessment dispositions',
    'possible assesment dispositions',
    'configure automatic stage routing'
  ]);

  // Blacklist for logic rows - applied to the whole cell content
  const blacklist = new Set([
    'type', 'action', 'if', 'row', 'job application', 'default definition',
    'screen', 'assessment', 'review', 'interview', 'condition', 'logic',
    'status', 'owner', 'stage', 'comment', 'description', 'step',
    'configure automatic stage routing',
    'possible next steps', 'possible dispositions', 'disposition', 'step', 'if',
    'specify'
  ]);

  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name.trim();
    allSheetNames.push(sheetName);

    let captureSteps = false;
    let captureConditions = false;
    const tabSeen = new Set<string>();

    worksheet.eachRow((row) => {
      // Helper to get string value from cell
      const getVal = (col: number) => {
        const cell = row.getCell(col);
        const v = cell.value;
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'object') {
          if ('result' in v) return String(v.result || '').trim();
          if ('text' in v) return String(v.text || '').trim();
          if ('richText' in v && Array.isArray(v.richText)) {
            return v.richText.map((rt: any) => rt.text).join('').trim();
          }
        }
        return String(v).trim();
      };

      const cellB_obj = row.getCell(2);
      const cellB_font = cellB_obj.font;
      const cellB_align = cellB_obj.alignment;
      
      // Styling criteria: Bold and Center Aligned indicates a Section Heading
      const isBold = cellB_font && cellB_font.bold === true;
      const isCenter = cellB_align && cellB_align.horizontal === 'center';
      const isHeadingStyle = !!(isBold && isCenter);

      const cellA = getVal(1);
      const cellB = getVal(2);

      const normalizedA = cellA.replace(/\s+/g, ' ');
      const normalizedB = cellB.replace(/\s+/g, ' ');
      
      const lowerA = normalizedA.toLowerCase();
      const lowerB = normalizedB.toLowerCase();

      // 1. Step Counting Logic (Start trigger)
      if (lowerA.includes('possible next steps')) {
        captureSteps = true;
      }

      // 2. Condition Extraction Logic (Toggling Capture)
      if (isHeadingStyle) {
        if (lowerB === 'if') {
          // Found an "If" section heading -> START capturing conditions
          captureConditions = true;
        } else if (normalizedB.length > 0) {
          // Found a different section heading (e.g., "Specify", "Disposition") -> STOP capturing
          captureConditions = false;
        }
        return; // Headings themselves are never conditions, so skip to next row
      }

      // 3. Global Stop Logic (Terminal sections)
      if (lowerA.includes('automatic next stages') || 
          lowerA.includes('configure automatic stage routing') || 
          lowerB.includes('configure automatic stage routing')) {
        captureSteps = false;
        captureConditions = false;
        return;
      }

      // 4. Extraction/Counting Execution
      
      // Extract Conditions (Column B)
      // Only extract if capture is active AND it's not a known non-condition header
      if (captureConditions && normalizedB.length >= 2) {
        const isBlacklisted = stopKeywords.has(lowerB) || blacklist.has(lowerB);
        if (!isBlacklisted && !tabSeen.has(normalizedB)) {
          results.push({
            condition: normalizedB,
            tab: sheetName,
            isHeading: false
          });
          tabSeen.add(normalizedB);
        }
      }

      // Count Steps (Column A)
      if (captureSteps) {
        // Ignore heading rows themselves
        const isKnownHeader = blacklist.has(lowerA) || 
                             lowerA.includes('possible next steps') || 
                             lowerA.includes('possible dispositions') ||
                             lowerA === 'step';
        
        if (!isKnownHeader && normalizedA.length > 0) {
          totalStepCount++;
        }
      }
    });
  });

  return {
    conditions: results,
    stepCount: totalStepCount,
    sheets: allSheetNames
  };
}
