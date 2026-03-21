const exifr = require('exifr');

const AI_SOFTWARE_PATTERNS = [
  /stable\s*diffusion/i,
  /mid\s*journey|midjourney/i,
  /dall[\s\-]*e|dalle/i,
  /firefly/i,
  /comfy\s*ui|comfyui/i,
  /automatic\s*1111|a1111/i,
  /night\s*cafe|nightcafe/i,
  /dream\s*studio|dreamstudio/i,
  /runway/i,
  /pika/i,
  /sora/i,
  /leonardo/i,
  /invoke/i,
  /fooocus/i
];

const XMP_MARKERS = [
  'ai-generated',
  'generative',
  'contentcredentials',
  'c2pa',
  'synthetically',
  'ai.generated'
];

function buildSignal(name, severity, technical_description) {
  return { name, severity, technical_description };
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function calculateMetaVerdict(signals) {
  const criticalCount = signals.filter((s) => s.severity === 'CRITICAL').length;
  const warningCount = signals.filter((s) => s.severity === 'WARNING').length;
  const clearCount = signals.filter((s) => s.severity === 'CLEAR').length;

  if (criticalCount > 0) {
    return { metaVerdict: 'LIKELY_AI', metaConfidence: 86 };
  }
  if (warningCount >= 2) {
    return { metaVerdict: 'LIKELY_AI', metaConfidence: 70 };
  }
  if (clearCount >= 2) {
    return { metaVerdict: 'LIKELY_AUTHENTIC', metaConfidence: 72 };
  }
  return { metaVerdict: 'INCONCLUSIVE', metaConfidence: 50 };
}

async function analyzeMetadata(buffer) {
  const parsed = await exifr.parse(buffer, {
    tiff: true,
    ifd0: true,
    exif: true,
    xmp: true,
    iptc: true
  });

  const exifData = parsed || {};
  const hasExif = Object.keys(exifData).length > 0;
  const signals = [];

  const cameraMake = String(exifData.Make || '').trim();
  const cameraModelRaw = String(exifData.Model || '').trim();
  const cameraModel = [cameraMake, cameraModelRaw].filter(Boolean).join(' ').trim() || null;

  if (cameraModel) {
    signals.push(buildSignal(
      'Metadata: Camera Make/Model',
      'CLEAR',
      `Camera metadata is present (${cameraModel}), which is common in authentic camera-origin files.`
    ));
  } else {
    signals.push(buildSignal(
      'Metadata: Camera Make/Model',
      'WARNING',
      'Camera make/model tags are missing; many synthetic exports omit original camera metadata.'
    ));
  }

  const software =
    String(exifData.Software || exifData.ProcessingSoftware || exifData.CreatorTool || '').trim() || null;

  if (software) {
    const aiMatch = AI_SOFTWARE_PATTERNS.find((pattern) => pattern.test(software));
    if (aiMatch) {
      signals.push(buildSignal(
        'Metadata: Software Tag',
        'CRITICAL',
        `Software tag indicates a known AI tool (${software}).`
      ));
    } else {
      signals.push(buildSignal(
        'Metadata: Software Tag',
        'NOTE',
        `Software tag is present (${software}) but does not directly match known AI generators.`
      ));
    }
  } else {
    signals.push(buildSignal(
      'Metadata: Software Tag',
      'NOTE',
      'Software tag is missing; this is inconclusive on its own.'
    ));
  }

  // Raw metadata indicators can survive even when common EXIF fields are sparse.
  const rawText = `${JSON.stringify(exifData)} ${buffer.toString('latin1')}`.toLowerCase();
  const matchedMarkers = XMP_MARKERS.filter((marker) => rawText.includes(marker.toLowerCase()));
  if (matchedMarkers.length > 0) {
    signals.push(buildSignal(
      'Metadata: XMP AI Markers',
      'CRITICAL',
      `XMP/raw metadata contains AI-generation markers (${matchedMarkers.join(', ')}).`
    ));
  }

  const dateOriginal = parseDate(
    exifData.DateTimeOriginal || exifData.CreateDate || exifData.ModifyDate || null
  );
  const now = new Date();
  if (!dateOriginal) {
    signals.push(buildSignal(
      'Metadata: Timestamp',
      'NOTE',
      'Original capture timestamp is missing from metadata.'
    ));
  } else if (dateOriginal.getTime() > now.getTime()) {
    signals.push(buildSignal(
      'Metadata: Timestamp',
      'WARNING',
      `Original capture timestamp is in the future (${dateOriginal.toISOString()}).`
    ));
  } else {
    signals.push(buildSignal(
      'Metadata: Timestamp',
      'CLEAR',
      `Original capture timestamp appears plausible (${dateOriginal.toISOString()}).`
    ));
  }

  const { metaVerdict, metaConfidence } = calculateMetaVerdict(signals);

  return {
    hasExif,
    cameraModel,
    software,
    signals,
    metaVerdict,
    metaConfidence
  };
}

module.exports = { analyzeMetadata };
