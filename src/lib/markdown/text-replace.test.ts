import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { textReplace } from './text-replace';
import type { Article } from '@/shared/types';

describe('textReplace', () => {
  const baseArticle: Article = {
    title: 'Test Article',
    byline: 'John Doe',
    dir: null,
    lang: 'en',
    content: '<p>Content here</p>',
    textContent: 'Content here',
    length: 100,
    excerpt: 'A test excerpt',
    siteName: 'Example Site',
    publishedTime: '2024-01-15',
    baseURI: 'https://example.com/article',
    pageTitle: 'Test Article - Example Site',
    hash: '',
    host: 'example.com',
    origin: 'https://example.com',
    hostname: 'example.com',
    pathname: '/article',
    port: '',
    protocol: 'https:',
    search: '',
    keywords: ['test', 'example', 'article'],
    math: {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces simple placeholders with article values', () => {
    expect(textReplace('{title}', baseArticle)).toBe('Test Article');
    expect(textReplace('{byline}', baseArticle)).toBe('John Doe');
    expect(textReplace('{siteName}', baseArticle)).toBe('Example Site');
    expect(textReplace('{excerpt}', baseArticle)).toBe('A test excerpt');
  });

  it('handles multiple placeholders in one template', () => {
    const result = textReplace('{title} by {byline} on {siteName}', baseArticle);
    expect(result).toBe('Test Article by John Doe on Example Site');
  });

  it('applies lowercase transform', () => {
    expect(textReplace('{title:lower}', baseArticle)).toBe('test article');
  });

  it('applies uppercase transform', () => {
    expect(textReplace('{title:upper}', baseArticle)).toBe('TEST ARTICLE');
  });

  it('applies kebab-case transform', () => {
    expect(textReplace('{title:kebab}', baseArticle)).toBe('test-article');
  });

  it('applies mixed-kebab transform (preserves case)', () => {
    expect(textReplace('{title:mixed-kebab}', baseArticle)).toBe('Test-Article');
  });

  it('applies snake_case transform', () => {
    expect(textReplace('{title:snake}', baseArticle)).toBe('test_article');
  });

  it('applies mixed_snake transform (preserves case)', () => {
    expect(textReplace('{title:mixed_snake}', baseArticle)).toBe('Test_Article');
  });

  it('applies obsidian-cal transform', () => {
    const article = { ...baseArticle, title: 'Test  Article  Title' };
    expect(textReplace('{title:obsidian-cal}', article)).toBe('Test-Article-Title');
  });

  it('applies camelCase transform', () => {
    expect(textReplace('{title:camel}', baseArticle)).toBe('testArticle');
  });

  it('applies PascalCase transform', () => {
    expect(textReplace('{title:pascal}', baseArticle)).toBe('TestArticle');
  });

  it('replaces date placeholders with formatted dates', () => {
    expect(textReplace('{date:YYYY-MM-DD}', baseArticle)).toBe('2024-06-15');
    expect(textReplace('{date:DD/MM/YYYY}', baseArticle)).toBe('15/06/2024');
    expect(textReplace('{date:HH:mm}', baseArticle)).toBe('10:30');
  });

  it('handles multiple date placeholders', () => {
    const result = textReplace('Date: {date:YYYY-MM-DD} Time: {date:HH:mm}', baseArticle);
    expect(result).toBe('Date: 2024-06-15 Time: 10:30');
  });

  it('replaces keywords placeholder with comma-separated values', () => {
    expect(textReplace('{keywords}', baseArticle)).toBe('test,example,article');
  });

  it('replaces keywords with custom separator', () => {
    expect(textReplace('{keywords: }', baseArticle)).toBe('test example article');
    expect(textReplace('{keywords:, }', baseArticle)).toBe('test, example, article');
    expect(textReplace('{keywords: - }', baseArticle)).toBe('test - example - article');
  });

  it('handles articles without keywords', () => {
    const article = { ...baseArticle, keywords: undefined };
    expect(textReplace('{keywords}', article)).toBe('');
  });

  it('removes unmatched placeholders', () => {
    expect(textReplace('{unknownField}', baseArticle)).toBe('');
    expect(textReplace('Hello {unknown} World', baseArticle)).toBe('Hello  World');
  });

  it('applies disallowedChars to values', () => {
    const result = textReplace('{title}', baseArticle, '-');
    expect(result).toBe('Test Article');

    const article = { ...baseArticle, title: 'Test-Article-Title' };
    const resultWithDash = textReplace('{title}', article, '-');
    expect(resultWithDash).toBe('TestArticleTitle');
  });

  it('does not replace {content} placeholder', () => {
    expect(textReplace('{content}', baseArticle)).toBe('');
  });

  it('handles null/undefined article values', () => {
    const article = { ...baseArticle, byline: null };
    expect(textReplace('{byline}', article)).toBe('');
  });
});
