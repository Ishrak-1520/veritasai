/**
 * pdfReport.js – Generate a professional forensic evidence PDF report.
 *
 * Exports:
 *   generateEvidenceReport(scan) → Promise<Buffer>
 */

const PDFDocument = require('pdfkit');

// ─── Color palette ────────────────────────────────────────────────────────────

const VERDICT_COLORS = {
  AI_GENERATED: '#ff3355',
  AUTHENTIC:    '#00cc66',
  UNCERTAIN:    '#ffaa00',
};

const SEVERITY_COLORS = {
  CRITICAL: '#cc0033',
  WARNING:  '#cc7700',
  NOTE:     '#006699',
  CLEAR:    '#007744',
};

const VERDICT_LABELS = {
  AI_GENERATED: '!! AI-GENERATED CONTENT DETECTED',
  AUTHENTIC:    '>> LIKELY AUTHENTIC',
  UNCERTAIN:    '?? INCONCLUSIVE ANALYSIS',
};

const VERDICT_META_LABELS = {
  AI_GENERATED: 'AI-GENERATED',
  AUTHENTIC:    'AUTHENTIC',
  UNCERTAIN:    'UNCERTAIN',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
  } catch (e) {
    return dateStr;
  }
}

function addSection(doc, title) {
  doc.moveDown(1);
  const y = doc.y;
  doc.font('Helvetica-Bold')
     .fontSize(9)
     .fillColor('#00aacc')
     .text(title.toUpperCase(), 60, y);
  
  doc.moveTo(60, doc.y + 2)
     .lineTo(doc.page.width - 60, doc.y + 2)
     .lineWidth(0.5)
     .stroke('#dddddd');
  
  doc.moveDown(0.6);
}

// ─── Main generator ───────────────────────────────────────────────────────────

function generateEvidenceReport(scan) {
  return new Promise((resolve, reject) => {
    console.log('[PDF] Generating report for scan:', scan.id, '| fields:', Object.keys(scan).join(', '));

    const doc = new PDFDocument({
      size: 'A4',
      margin: 60,
      bufferPages: true,
      info: {
        Title: 'VeritasAI Forensic Report — ' + scan.id,
        Author: 'VeritasAI',
        Subject: 'AI-Generated Media Forensic Analysis',
      }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const verdict = scan.verdict || 'UNCERTAIN';
    const verdictColor = VERDICT_COLORS[verdict] || VERDICT_COLORS.UNCERTAIN;

    // Fallbacks
    let fallbackSummary = 'Forensic analysis produced inconclusive results for this image.';
    if (verdict === 'AUTHENTIC') {
      fallbackSummary = 'This image shows characteristics consistent with authentic photography.';
    } else if (verdict === 'AI_GENERATED') {
      fallbackSummary = 'This image shows evidence of AI generation across multiple forensic dimensions.';
    }
    
    const summary = scan.summary || scan.forensic_summary || fallbackSummary;
    const suspectedModel = scan.suspected_model || 'Not determined';
    const inputType = (scan.input_type || 'unknown').toUpperCase();
    const mediaType = scan.media_type 
      ? scan.media_type.charAt(0).toUpperCase() + scan.media_type.slice(1)
      : 'Image';

    // ───────────────────────────────────────────────────────────────────────
    // HEADER BAND
    // ───────────────────────────────────────────────────────────────────────

    doc.save();
    doc.rect(0, 0, doc.page.width, 100).fill(verdictColor);

    const pageTop = 0;

    // Left side
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#ffffff');
    doc.text('VERITASAI', 60, pageTop + 22, { lineBreak: false });
    
    doc.font('Helvetica-Bold').fontSize(9).fillOpacity(0.8).fillColor('#ffffff');
    doc.text('AI-GENERATED MEDIA FORENSIC REPORT', 60, pageTop + 50, { lineBreak: false });
    
    doc.font('Helvetica').fontSize(8).fillOpacity(0.6).fillColor('#ffffff');
    doc.text('Forensic Analysis Platform', 60, pageTop + 63, { lineBreak: false });

    doc.fillOpacity(1); // Reset opacity

    // Center-right — verdict label
    const verdictLabel = VERDICT_LABELS[verdict] || VERDICT_LABELS.UNCERTAIN;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff');
    // Vertically centered around y=40 approximately
    doc.text(verdictLabel, doc.page.width - 280, pageTop + 42, { width: 180, align: 'right', lineBreak: false });

    // Right side — confidence
    const confStr = (scan.confidence || 0) + '%';
    doc.font('Helvetica-Bold').fontSize(42).fillColor('#ffffff');
    doc.text(confStr, doc.page.width - 155, pageTop + 24, { width: 90, align: 'right', lineBreak: false });
    
    doc.font('Helvetica-Bold').fontSize(8).fillOpacity(0.7).fillColor('#ffffff');
    doc.text('CONFIDENCE', doc.page.width - 155, pageTop + 68, { width: 90, align: 'right', lineBreak: false });
    
    doc.fillOpacity(1); // Reset opacity
    doc.restore();

    // ───────────────────────────────────────────────────────────────────────
    // DISCLAIMER
    // ───────────────────────────────────────────────────────────────────────

    doc.y = 100;
    doc.moveDown(1);
    
    const disclaimerY = doc.y;
    // Calculate height roughly based on text
    const disclaimerHeight = 44; 
    
    doc.save();
    doc.rect(doc.page.margins.left, disclaimerY, pageWidth, disclaimerHeight)
       .fill('#f5f5f5');
    
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    doc.text(
      'This report is generated by VeritasAI automated forensic analysis and is intended as supporting evidence only. ' +
      'Results are probabilistic, not definitive. Always verify findings with additional sources before taking legal action. ' +
      'VeritasAI (veritasai-g2u6.onrender.com)',
      doc.page.margins.left + 10, disclaimerY + 12,
      { width: pageWidth - 20 }
    );
    doc.restore();
    
    doc.y = disclaimerY + disclaimerHeight + 16;

    // ───────────────────────────────────────────────────────────────────────
    // SCAN METADATA
    // ───────────────────────────────────────────────────────────────────────

    addSection(doc, 'SCAN INFORMATION');

    const metaLeft = [
      ['Scan ID',      scan.id || 'N/A'],
      ['Date',         formatDate(scan.created_at)],
      ['Media Type',   mediaType],
      ['Input Method', inputType],
    ];

    const metaRight = [
      ['Verdict',         VERDICT_META_LABELS[verdict] || verdict],
      ['Confidence',      (scan.confidence || 0) + '%'],
      ['Suspected Model', suspectedModel],
      ['Platform',        'VeritasAI v1.0'],
    ];

    const metaStartY = doc.y;
    const leftColX = 60;
    const rightColX = 320;
    const rowHeight = 22;

    // Draw alternating backgrounds
    const totalRows = Math.max(metaLeft.length, metaRight.length);
    for (let i = 0; i < totalRows; i++) {
      if (i % 2 === 0) {
        doc.save();
        doc.rect(doc.page.margins.left, metaStartY + (i * rowHeight), pageWidth, 20).fill('#fafafa');
        doc.restore();
      }
    }

    metaLeft.forEach(([label, value], i) => {
      const rowY = metaStartY + (i * rowHeight) + 6;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#888888');
      doc.text(label + ':', leftColX, rowY, { width: 90, lineBreak: false });
      
      const isId = label === 'Scan ID';
      doc.font(isId ? 'Courier' : 'Helvetica').fontSize(10).fillColor('#333333');
      doc.text(value, leftColX + 90, rowY - 1, { width: rightColX - leftColX - 90 - 10, lineBreak: false });
    });

    metaRight.forEach(([label, value], i) => {
      const rowY = metaStartY + (i * rowHeight) + 6;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#888888');
      doc.text(label + ':', rightColX, rowY, { width: 100, lineBreak: false });
      
      const isVerdict = label === 'Verdict';
      doc.font(isVerdict ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
         .fillColor(isVerdict ? verdictColor : '#333333');
      doc.text(value, rightColX + 100, rowY - 1, { width: doc.page.width - doc.page.margins.right - rightColX - 100, lineBreak: false });
    });

    doc.y = metaStartY + (totalRows * rowHeight) + 20;

    // ───────────────────────────────────────────────────────────────────────
    // ANALYSIS SUMMARY
    // ───────────────────────────────────────────────────────────────────────

    addSection(doc, 'ANALYSIS SUMMARY');
    doc.font('Helvetica').fontSize(10).fillColor('#444444');
    doc.text(summary, {
      width: pageWidth, lineGap: 3
    });

    // ───────────────────────────────────────────────────────────────────────
    // FORENSIC SIGNALS
    // ───────────────────────────────────────────────────────────────────────

    addSection(doc, 'FORENSIC SIGNALS DETECTED');
    doc.font('Helvetica').fontSize(9).fillColor('#666666');
    doc.text('The following signals were identified during analysis:', { width: pageWidth });
    doc.moveDown(0.8);

    const signals = scan.signals || [];

    // Sanitize signals before rendering
    const cleanSignals = signals.filter(signal => {
      // Remove signals with broken names
      if (!signal.name) return false;
      if (signal.name.trim() === '\\') return false;
      if (signal.name.trim() === '') return false;
      if (signal.name.includes('}, {')) return false;
      if (signal.name.includes('\\\"')) return false;
      if (signal.name.length > 60) return false; // names should be short
      return true;
    }).map(signal => ({
      ...signal,
      // Clean the name
      name: signal.name
        .replace(/^[\\/"'\\s]+/, '')   // strip leading junk
        .replace(/[\\/"']+$/, '')     // strip trailing junk
        .replace(/\\\\+/g, '')          // remove backslashes
        .trim(),
      // Clean the description
      technical_description: (signal.technical_description || '')
        .replace(/^[\\/"'\\s]+/, '')   // strip leading junk chars
        .replace(/^\\\\?"?/, '')        // remove leading \\" or "
        .replace(/\\\\?"?$/, '')        // remove trailing \\" or "
        .replace(/\\\\"/g, '"')         // unescape escaped quotes
        .replace(/"\\s*},\\s*\\{.*$/s, '') // remove JSON fragments at end
        .replace(/\\}\\s*\\].*$/s, '')   // remove array closing fragments
        .replace(/\\s+/g, ' ')         // collapse whitespace
        .trim()
        // If description is still garbage (too short or has JSON chars), replace it
        || 'Analysis detected this signal during forensic examination.'
    })).filter(signal => {
      // Second pass — remove any that still look broken after cleaning
      if (signal.name.length < 2) return false;
      if (signal.technical_description.startsWith('{')) return false;
      if (signal.technical_description.startsWith('[')) return false;
      return true;
    });

    cleanSignals.forEach(signal => {
      const sevColor = SEVERITY_COLORS[signal.severity] || '#006699';

      // Estimate block height (title + desc lines)
      doc.font('Helvetica').fontSize(9.5);
      const descHeight = doc.heightOfString(signal.technical_description || ' ', { width: pageWidth - 24 });
      const blockHeight = 24 + descHeight + 10;

      // Check if we need a new page
      if (doc.y + blockHeight > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }

      const blockY = doc.y;

      // Light background rect
      doc.save();
      doc.roundedRect(doc.page.margins.left, blockY, pageWidth, blockHeight, 4).fill('#fafafa');
      doc.restore();

      // Colored left bar
      doc.save();
      doc.path(`M ${doc.page.margins.left + 4} ${blockY} 
                L ${doc.page.margins.left} ${blockY} 
                L ${doc.page.margins.left} ${blockY + blockHeight} 
                L ${doc.page.margins.left + 4} ${blockY + blockHeight} Z`)
         .fill(sevColor);
      doc.restore();

      // Signal name
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#222222');
      doc.text(signal.name || 'Unknown Signal', 74, blockY + 10, {
        width: pageWidth - 100, lineBreak: false
      });

      // Severity badge
      doc.font('Helvetica-Bold').fontSize(10).fillColor(sevColor);
      doc.text('[' + (signal.severity || 'NOTE') + ']', doc.page.margins.left + pageWidth - 80, blockY + 10, {
        width: 70, align: 'right', lineBreak: false
      });

      // Description
      doc.font('Helvetica').fontSize(9.5).fillColor('#444444');
      doc.text(signal.technical_description || '', 74, blockY + 28, {
        width: pageWidth - 24, lineGap: 3
      });

      doc.y = blockY + blockHeight;
      doc.moveDown(0.6);
    });

    // ───────────────────────────────────────────────────────────────────────
    // EDUCATION SECTION
    // ───────────────────────────────────────────────────────────────────────

    const exp = scan.explanation || {};

    if (exp.how_detected || exp.what_to_look_for || exp.technology_note) {
      if (doc.y > doc.page.height - 180) {
        doc.addPage();
        doc.y = doc.page.margins.top;
      }

      addSection(doc, 'UNDERSTANDING THIS RESULT');

      if (exp.how_detected) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333');
        doc.text('How It Was Detected');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(9.5).fillColor('#444444');
        doc.text(exp.how_detected, { width: pageWidth, lineGap: 3 });
        doc.moveDown(0.8);
      }

      if (exp.what_to_look_for) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 60) { doc.addPage(); doc.y = doc.page.margins.top; }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333');
        doc.text('What To Look For Yourself');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(9.5).fillColor('#444444');
        doc.text(exp.what_to_look_for, { width: pageWidth, lineGap: 3 });
        doc.moveDown(0.8);
      }

      if (exp.technology_note) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 60) { doc.addPage(); doc.y = doc.page.margins.top; }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333');
        doc.text('About The Technology');
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(9.5).fillColor('#444444');
        doc.text(exp.technology_note, { width: pageWidth, lineGap: 3 });
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // FOOTER on every page
    // ───────────────────────────────────────────────────────────────────────

    // ── FOOTERS ──────────────────────────────────────
    // Must happen after all content, before doc.end()
    const pageRange = doc.bufferedPageRange();
    const pageCount = pageRange.count;
    console.log('[PDF] Total content pages:', pageCount);
  
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      doc.switchToPage(pageIndex);
  
      const pageBottom = doc.page.height - 50;
      const pageLeft = 60;
      const pageRight = doc.page.width - 60;
  
      // Horizontal line above footer
      doc.save();
      doc.moveTo(pageLeft, pageBottom)
         .lineTo(pageRight, pageBottom)
         .lineWidth(0.5)
         .strokeColor('#cccccc')
         .stroke();
      doc.restore();
  
      // Left: Scan ID in Courier
      doc.save();
      doc.font('Courier')
         .fontSize(7)
         .fillColor('#999999')
         .text(
           'VeritasAI — Scan: ' + (scan.id || 'N/A'),
           pageLeft,
           pageBottom + 8,
           { lineBreak: false, width: 300 }
         );
      doc.restore();
  
      // Right: Page number in Helvetica
      doc.save();
      doc.font('Helvetica')
         .fontSize(7)
         .fillColor('#999999')
         .text(
           'Page ' + (pageIndex + 1) + ' of ' + pageCount,
           pageLeft,
           pageBottom + 8,
           { 
             lineBreak: false, 
             width: pageRight - pageLeft,
             align: 'right' 
           }
         );
      doc.restore();
    }
  
    // ONE AND ONLY doc.end() call — absolutely last line
    doc.end();
  });
}

module.exports = { generateEvidenceReport };
