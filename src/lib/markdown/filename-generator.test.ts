import { describe, it, expect } from 'vitest';
import { generateValidFileName, getImageFilename } from './filename-generator';
import type { Options } from '@/shared/types';

describe('generateValidFileName', () => {
  it('returns empty string for undefined or empty input', () => {
    expect(generateValidFileName(undefined)).toBe('');
    expect(generateValidFileName('')).toBe('');
  });

  it('removes illegal characters', () => {
    expect(generateValidFileName('file/name')).toBe('filename');
    expect(generateValidFileName('file\\name')).toBe('filename');
    expect(generateValidFileName('file?name')).toBe('filename');
    expect(generateValidFileName('file<name>')).toBe('filename');
    expect(generateValidFileName('file:name')).toBe('filename');
    expect(generateValidFileName('file*name')).toBe('filename');
    expect(generateValidFileName('file|name')).toBe('filename');
    expect(generateValidFileName('file"name')).toBe('filename');
  });

  it('replaces non-breaking spaces with regular spaces', () => {
    expect(generateValidFileName('hello\u00A0world')).toBe('hello world');
  });

  it('normalizes whitespace', () => {
    expect(generateValidFileName('hello   world')).toBe('hello world');
    expect(generateValidFileName('  hello world  ')).toBe('hello world');
    expect(generateValidFileName('hello\t\nworld')).toBe('hello world');
  });

  it('removes additional disallowed characters when specified', () => {
    expect(generateValidFileName('hello-world', '-')).toBe('helloworld');
    expect(generateValidFileName('hello_world', '_')).toBe('helloworld');
    expect(generateValidFileName('hello.world.md', '.')).toBe('helloworldmd');
  });

  it('handles regex special characters in disallowedChars', () => {
    expect(generateValidFileName('hello[world]', '[]')).toBe('helloworld');
    expect(generateValidFileName('hello(world)', '()')).toBe('helloworld');
    expect(generateValidFileName('hello$world', '$')).toBe('helloworld');
    expect(generateValidFileName('hello^world', '^')).toBe('helloworld');
  });
});

describe('getImageFilename', () => {
  const baseOptions: Options = {
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
    imageStyle: 'markdown',
    imageRefStyle: 'inlined',
    frontmatter: '',
    backmatter: '',
    title: 'article',
    includeTemplate: false,
    saveAs: false,
    downloadImages: false,
    imagePrefix: '',
    mdClipsFolder: null,
    disallowedChars: null,
    downloadMode: 'downloadsApi',
    turndownEscape: true,
    contextMenus: true,
    obsidianIntegration: false,
    obsidianVault: '',
    obsidianFolder: '',
    clipSelection: false,
  };

  it('extracts filename from URL path', () => {
    const result = getImageFilename(
      'https://example.com/images/photo.jpg',
      { ...baseOptions, title: 'article' },
      false
    );
    expect(result).toBe('photo.jpg');
  });

  it('removes query parameters from filename', () => {
    const result = getImageFilename(
      'https://example.com/images/photo.jpg?width=100',
      { ...baseOptions, title: 'article' },
      false
    );
    expect(result).toBe('photo.jpg');
  });

  it('handles base64 data URIs', () => {
    const result = getImageFilename(
      'data:image/png;base64,iVBORw0KGgo=',
      { ...baseOptions, title: 'article' },
      false
    );
    expect(result).toBe('image.png');
  });

  it('adds .idunno extension when no extension present', () => {
    const result = getImageFilename(
      'https://example.com/images/photo',
      { ...baseOptions, title: 'article' },
      false
    );
    expect(result).toBe('photo.idunno');
  });

  it('prepends title as folder when prependFilePath is true', () => {
    const result = getImageFilename(
      'https://example.com/images/photo.jpg',
      { ...baseOptions, title: 'my-article' },
      true
    );
    expect(result).toBe('my-article/photo.jpg');
  });

  it('uses imagePrefix when specified', () => {
    const result = getImageFilename(
      'https://example.com/images/photo.jpg',
      { ...baseOptions, title: 'article', imagePrefix: 'assets/' },
      false
    );
    expect(result).toBe('assets/photo.jpg');
  });

  it('combines title path and imagePrefix when prependFilePath is true', () => {
    const result = getImageFilename(
      'https://example.com/images/photo.jpg',
      { ...baseOptions, title: 'docs/article', imagePrefix: 'images/' },
      true
    );
    expect(result).toBe('docs/images/photo.jpg');
  });

  it('removes disallowed characters from filename', () => {
    const result = getImageFilename(
      'https://example.com/images/photo[1].jpg',
      { ...baseOptions, title: 'article', disallowedChars: '[]' },
      false
    );
    expect(result).toBe('photo1.jpg');
  });
});
