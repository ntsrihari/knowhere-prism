import { describe, expect, it } from 'vitest';
import { JsonParseError, MAX_JSON_DEPTH, parseStrictJson } from '../src/index.js';

describe('parseStrictJson', () => {
  it('parses standard JSON', () => {
    expect(parseStrictJson(' {"a":[1,-2.5e3,true,false,null,"\\u00e9\\n\\"x\\""]} ')).toEqual({ a: [1, -2500, true, false, null, 'é\n"x"'] });
  });
  it.each([
    ['duplicate keys', '{"a":1,"a":2}'],
    ['nested duplicate keys', '{"a":{"b":1,"b":1}}'],
    ['trailing data', '{} {}'],
    ['trailing comma', '[1,]'],
    ['single quotes', "{'a':1}"],
    ['leading zero', '[01]'],
    ['bare word', 'yes'],
    ['empty input', ''],
    ['control char in string', '"a\u0001"'],
    ['bad escape', '"\\x"'],
    ['NaN', 'NaN'],
    ['BOM', '﻿{}'],
    ['huge number', '1e400'],
  ])('rejects %s', (_, text) => {
    expect(() => parseStrictJson(text)).toThrow(JsonParseError);
  });
  it('limits nesting depth', () => {
    const ok = '['.repeat(MAX_JSON_DEPTH + 1) + ']'.repeat(MAX_JSON_DEPTH + 1);
    expect(() => parseStrictJson(ok)).not.toThrow();
    const deep = '['.repeat(MAX_JSON_DEPTH + 2) + ']'.repeat(MAX_JSON_DEPTH + 2);
    expect(() => parseStrictJson(deep)).toThrow(/too deep/);
  });
  it('keeps "__proto__" as a plain own key', () => {
    const v = parseStrictJson('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
    expect(Object.getPrototypeOf(v)).toBe(Object.prototype);
    expect(Object.keys(v)).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});
