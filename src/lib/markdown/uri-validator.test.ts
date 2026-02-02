import { describe, it, expect } from 'vitest';
import { validateUri } from './uri-validator';

describe('validateUri', () => {
  it('returns valid absolute URLs unchanged', () => {
    expect(validateUri('https://example.com/page', 'https://base.com')).toBe(
      'https://example.com/page'
    );
    expect(validateUri('http://example.com/path/to/resource', 'https://base.com')).toBe(
      'http://example.com/path/to/resource'
    );
  });

  it('resolves root-relative URLs against baseURI origin', () => {
    expect(validateUri('/page', 'https://example.com/foo/bar')).toBe(
      'https://example.com/page'
    );
    expect(validateUri('/assets/image.png', 'https://example.com:8080/path')).toBe(
      'https://example.com:8080/assets/image.png'
    );
  });

  it('resolves relative URLs against baseURI path', () => {
    expect(validateUri('page.html', 'https://example.com/docs/')).toBe(
      'https://example.com/docs/page.html'
    );
    expect(validateUri('image.png', 'https://example.com/assets')).toBe(
      'https://example.com/assets/image.png'
    );
  });

  it('handles baseURI without trailing slash', () => {
    expect(validateUri('file.md', 'https://example.com/path')).toBe(
      'https://example.com/path/file.md'
    );
  });

  it('handles baseURI with trailing slash', () => {
    expect(validateUri('file.md', 'https://example.com/path/')).toBe(
      'https://example.com/path/file.md'
    );
  });

  it('handles URLs with query parameters', () => {
    expect(validateUri('https://example.com/page?foo=bar', 'https://base.com')).toBe(
      'https://example.com/page?foo=bar'
    );
  });

  it('handles URLs with fragments', () => {
    expect(validateUri('https://example.com/page#section', 'https://base.com')).toBe(
      'https://example.com/page#section'
    );
  });
});
