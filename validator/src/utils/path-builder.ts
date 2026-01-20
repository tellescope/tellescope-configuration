/**
 * Build a JSON path string for error reporting
 */
export function buildPath(...segments: (string | number)[]): string {
  return segments
    .map((seg, i) => {
      if (typeof seg === 'number') {
        return `[${seg}]`;
      }
      return i === 0 ? seg : `.${seg}`;
    })
    .join('');
}

/**
 * Append a segment to an existing path
 */
export function appendPath(basePath: string, ...segments: (string | number)[]): string {
  let path = basePath;
  for (const seg of segments) {
    if (typeof seg === 'number') {
      path += `[${seg}]`;
    } else {
      path += `.${seg}`;
    }
  }
  return path;
}

/**
 * Safely stringify a value for error messages
 * Truncates long strings and handles circular references
 */
export function safeStringify(value: unknown, maxLength = 100): string {
  try {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';

    const str = typeof value === 'string' ? value : JSON.stringify(value);

    if (str.length > maxLength) {
      return str.substring(0, maxLength - 3) + '...';
    }
    return str;
  } catch {
    return '[circular or non-serializable]';
  }
}
