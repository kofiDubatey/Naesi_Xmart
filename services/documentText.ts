const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();
const PDF_DATA_URL_PREFIX = /^data:application\/pdf;base64,/i;

const decodePdfLiteral = (value: string) => {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
};

const extractTextFromPdfBuffer = (buffer: ArrayBuffer): string => {
  const raw = new TextDecoder('latin1').decode(buffer);

  const segments: string[] = [];
  const literalMatches = raw.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || [];
  const arrayMatches = raw.match(/\[(?:.*?)\]\s*TJ/gms) || [];

  literalMatches.forEach(match => {
    const text = match.replace(/\)\s*Tj$/, '').slice(1);
    segments.push(decodePdfLiteral(text));
  });

  arrayMatches.forEach(match => {
    const inner = match.replace(/\]\s*TJ$/, '').slice(1);
    const parts = inner.match(/\((?:\\.|[^\\)])*\)/g) || [];
    parts.forEach(part => {
      segments.push(decodePdfLiteral(part.slice(1, -1)));
    });
  });

  const text = normalizeWhitespace(segments.join(' '));
  if (text.length < 120) {
    throw new Error('PDF_TEXT_EXTRACTION_FAILED');
  }

  return text;
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  return extractTextFromPdfBuffer(buffer);
};

export const extractTextFromPdfBlob = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  return extractTextFromPdfBuffer(buffer);
};

export const isPdfDataUrl = (value?: string | null) => !!value && PDF_DATA_URL_PREFIX.test(value);

export const extractTextFromPdfDataUrl = async (value: string): Promise<string> => {
  const base64 = value.replace(PDF_DATA_URL_PREFIX, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return extractTextFromPdfBuffer(bytes.buffer);
};

export const hasUsableGroundingText = (value?: string | null) => {
  if (!value) return false;
  const trimmed = normalizeWhitespace(value);
  if (trimmed.length < 120) return false;
  if (PDF_DATA_URL_PREFIX.test(trimmed)) return false;
  if (/^\[SESSION_DOC:/i.test(trimmed)) return false;
  return true;
};
