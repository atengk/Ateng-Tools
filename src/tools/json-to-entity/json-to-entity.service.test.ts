import { describe, expect, it } from 'vitest';
import { DEFAULT_JSON_TO_ENTITY_OPTIONS } from './json-to-entity.models';
import {
  generateCodeFromJson,
  generateJavaFromClass,
  generateTsFromClass,
  parseJsonToClass,
} from './json-to-entity.service';

describe('JSON to Entity Service', () => {
  it('1. should accurately infer primitive types and snake_case to camelCase', () => {
    const json = JSON.stringify({
      user_id: 1008611,
      user_name: 'Ateng',
      is_active: true,
      score: 98.5,
    });

    const parsed = parseJsonToClass(json, DEFAULT_JSON_TO_ENTITY_OPTIONS);

    expect(parsed.fields.find(f => f.rawName === 'user_id')?.fieldName).toBe('userId');
    expect(parsed.fields.find(f => f.rawName === 'user_id')?.javaType).toBe('Long');
    expect(parsed.fields.find(f => f.rawName === 'user_name')?.javaType).toBe('String');
    expect(parsed.fields.find(f => f.rawName === 'is_active')?.javaType).toBe('Boolean');
    expect(parsed.fields.find(f => f.rawName === 'score')?.javaType).toBe('Double');
  });

  it('2. should infer ISO-8601 date string as LocalDateTime', () => {
    const json = JSON.stringify({
      created_at: '2026-09-18T14:30:00Z',
      birthday: '1995-05-20',
    });

    const parsed = parseJsonToClass(json, DEFAULT_JSON_TO_ENTITY_OPTIONS);

    expect(parsed.fields.find(f => f.rawName === 'created_at')?.javaType).toBe('LocalDateTime');
    expect(parsed.fields.find(f => f.rawName === 'birthday')?.javaType).toBe('LocalDate');
  });

  it('3. should recursively handle nested objects and generate static inner classes', () => {
    const json = JSON.stringify({
      order_no: 'ORD20260918',
      buyer: {
        buyer_id: 2001,
        nickname: 'Alice',
      },
    });

    const parsed = parseJsonToClass(json, DEFAULT_JSON_TO_ENTITY_OPTIONS);

    expect(parsed.nestedClasses.length).toBe(1);
    expect(parsed.nestedClasses[0].className).toBe('Buyer');
    expect(parsed.fields.find(f => f.rawName === 'buyer')?.javaType).toBe('Buyer');

    const javaCode = generateJavaFromClass(parsed, DEFAULT_JSON_TO_ENTITY_OPTIONS);

    expect(javaCode).toContain('public class RootDTO');
    expect(javaCode).toContain('public static class Buyer');
    expect(javaCode).toContain('@JsonProperty("buyer_id")');
    expect(javaCode).toContain('private Long buyerId;');
    expect(javaCode).toContain('@Data');
    expect(javaCode).toContain('@Builder');
  });

  it('4. should handle arrays of objects and infer List<Item>', () => {
    const json = JSON.stringify({
      items: [
        { item_id: 1, title: 'Book' },
        { item_id: 2, title: 'Pen' },
      ],
    });

    const parsed = parseJsonToClass(json, DEFAULT_JSON_TO_ENTITY_OPTIONS);

    expect(parsed.fields.find(f => f.rawName === 'items')?.javaType).toBe('List<Items>');
    expect(parsed.fields.find(f => f.rawName === 'items')?.tsType).toBe('Items[]');
    expect(parsed.nestedClasses.length).toBe(1);
  });

  it('5. should generate valid TypeScript interfaces', () => {
    const json = JSON.stringify({
      id: 123,
      name: 'Test',
      details: {
        category: 'Tech',
      },
    });

    const parsed = parseJsonToClass(json, DEFAULT_JSON_TO_ENTITY_OPTIONS);
    const tsCode = generateTsFromClass(parsed);

    expect(tsCode).toContain('export interface RootDTO {');
    expect(tsCode).toContain('export interface Details {');
    expect(tsCode).toContain('details?: Details;');
    expect(tsCode).toContain('name?: string;');
  });

  it('6. should integrate through generateCodeFromJson entrypoint', () => {
    const json = JSON.stringify({ success: true, code: 200 });

    const javaCode = generateCodeFromJson(json, {
      ...DEFAULT_JSON_TO_ENTITY_OPTIONS,
      targetLanguage: 'java',
    });
    expect(javaCode).toContain('public class RootDTO');

    const tsCode = generateCodeFromJson(json, {
      ...DEFAULT_JSON_TO_ENTITY_OPTIONS,
      targetLanguage: 'typescript',
    });
    expect(tsCode).toContain('export interface RootDTO');
  });
});
