/**
 * Strict JSON decoding: exactly one RFC 8259 value, no duplicate object keys,
 * nesting depth at most MAX_JSON_DEPTH, no trailing data. Mirrors
 * knowhere-nexus internal/contract/strictjson.go.
 */
export const MAX_JSON_DEPTH = 32;

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
  }
}

const NUMBER_RE = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;

export function isJsonObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Defines an own enumerable property (safe for keys such as "__proto__"). */
export function setOwn(o: JsonObject, k: string, v: JsonValue): void {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}

export function hasOwn(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

export function parseStrictJson(text: string): JsonValue {
  let i = 0;
  const n = text.length;
  const fail = (msg: string): never => {
    throw new JsonParseError(`invalid JSON at offset ${i}: ${msg}`);
  };
  const ws = (): void => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) i++;
      else break;
    }
  };
  const str = (): string => {
    // text[i] === '"'
    i++;
    let out = '';
    let start = i;
    while (true) {
      if (i >= n) fail('unterminated string');
      const c = text.charCodeAt(i);
      if (c === 0x22) {
        out += text.slice(start, i);
        i++;
        return out;
      }
      if (c < 0x20) fail('control character in string');
      if (c === 0x5c) {
        out += text.slice(start, i);
        i++;
        const e = text[i];
        switch (e) {
          case '"': out += '"'; break;
          case '\\': out += '\\'; break;
          case '/': out += '/'; break;
          case 'b': out += '\b'; break;
          case 'f': out += '\f'; break;
          case 'n': out += '\n'; break;
          case 'r': out += '\r'; break;
          case 't': out += '\t'; break;
          case 'u': {
            const hex = text.slice(i + 1, i + 5);
            if (!/^[0-9A-Fa-f]{4}$/.test(hex)) fail('bad unicode escape');
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
            break;
          }
          default:
            fail('bad escape');
        }
        i++;
        start = i;
        continue;
      }
      i++;
    }
  };
  const value = (depth: number): JsonValue => {
    if (depth > MAX_JSON_DEPTH) throw new JsonParseError('JSON nesting too deep');
    ws();
    if (i >= n) fail('unexpected end of input');
    const c = text[i];
    if (c === '{') {
      i++;
      const o: JsonObject = {};
      ws();
      if (text[i] === '}') {
        i++;
        return o;
      }
      while (true) {
        ws();
        if (text[i] !== '"') fail('expected object key');
        const k = str();
        if (hasOwn(o, k)) throw new JsonParseError(`duplicate key ${JSON.stringify(k)}`);
        ws();
        if (text[i] !== ':') fail('expected ":"');
        i++;
        setOwn(o, k, value(depth + 1));
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === '}') {
          i++;
          return o;
        }
        fail('expected "," or "}"');
      }
    }
    if (c === '[') {
      i++;
      const a: JsonValue[] = [];
      ws();
      if (text[i] === ']') {
        i++;
        return a;
      }
      while (true) {
        a.push(value(depth + 1));
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ']') {
          i++;
          return a;
        }
        fail('expected "," or "]"');
      }
    }
    if (c === '"') return str();
    if (text.startsWith('true', i)) {
      i += 4;
      return true;
    }
    if (text.startsWith('false', i)) {
      i += 5;
      return false;
    }
    if (text.startsWith('null', i)) {
      i += 4;
      return null;
    }
    NUMBER_RE.lastIndex = i;
    const m = NUMBER_RE.exec(text);
    if (m) {
      i += m[0].length;
      const num = Number(m[0]);
      if (!Number.isFinite(num)) fail('number out of range');
      return num;
    }
    return fail('unexpected character');
  };
  // A leading UTF-8 BOM is not JSON; reject it like Go's decoder.
  const v = value(0);
  ws();
  if (i !== n) throw new JsonParseError('unexpected data after JSON value');
  return v;
}

export function utf8Length(s: string): number {
  return new TextEncoder().encode(s).length;
}
