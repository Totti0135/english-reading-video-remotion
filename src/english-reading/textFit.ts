// Deterministic text measurement and font-size fitting.
// Uses a canvas 2D context so wrapping math matches what Chrome will paint.
// CJK characters wrap per character; Latin fragments wrap per word.

interface FitOptions {
  text: string;
  fontFamily: string;
  fontWeight?: number | string;
  maxWidth: number;
  maxHeight: number;
  lineHeightFactor?: number;
  minSize?: number;
  maxSize?: number;
  /** Width reserved for inline decorations (e.g. highlight span chrome). */
  extraWidth?: number;
}

let canvasContext: CanvasRenderingContext2D | null = null;

const getContext = (): CanvasRenderingContext2D => {
  if (canvasContext) {
    return canvasContext;
  }
  const canvas = document.createElement('canvas');
  canvasContext = canvas.getContext('2d');
  if (!canvasContext) {
    throw new Error('canvas 2d context unavailable for text measurement');
  }
  return canvasContext;
};

const isBreakable = (char: string): boolean =>
  /[　-鿿豈-﫿＀-￯]/.test(char);

const tokenize = (text: string): string[] => {
  const tokens: string[] = [];
  let latin = '';
  for (const char of text) {
    if (isBreakable(char) || /\s/.test(char)) {
      if (latin) {
        tokens.push(latin);
        latin = '';
      }
      if (!/\s/.test(char)) {
        tokens.push(char);
      }
    } else {
      latin += char;
    }
  }
  if (latin) {
    tokens.push(latin);
  }
  return tokens;
};

export const wrapLines = (
  text: string,
  font: string,
  maxWidth: number,
): string[] => {
  const context = getContext();
  context.font = font;
  const lines: string[] = [];
  let current = '';
  for (const token of tokenize(text)) {
    const candidate = current ? `${current} ${token}` : token;
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = token;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
};

export const fitFontSize = (options: FitOptions): number => {
  const {
    text,
    fontFamily,
    fontWeight = 400,
    maxWidth,
    maxHeight,
    lineHeightFactor = 1.35,
    minSize = 18,
    maxSize = 72,
    extraWidth = 0,
  } = options;
  const effectiveWidth = Math.max(200, maxWidth - extraWidth);
  for (let size = maxSize; size >= minSize; size -= 2) {
    const font = `${fontWeight} ${size}px ${fontFamily}`;
    const lines = wrapLines(text, font, effectiveWidth);
    if (lines.length * size * lineHeightFactor <= maxHeight) {
      return size;
    }
  }
  return minSize;
};

export const fitLines = (
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number | string,
  maxWidth: number,
): string[] =>
  wrapLines(text, `${fontWeight} ${fontSize}px ${fontFamily}`, maxWidth);
