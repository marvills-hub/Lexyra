import { TextStats } from '../models/text-tool.model';

export class TextEngine {
  static stats(text: string): TextStats {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words,
      sentences: trimmed ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.length ?? 0) : 0,
      paragraphs: trimmed ? text.split(/\n\s*\n/).filter((x) => x.trim()).length : 0,
      lines: text ? text.split(/\r?\n/).length : 0,
      readingMinutes: words ? Math.max(1, Math.ceil(words / 200)) : 0,
    };
  }
  static upper(text: string) {
    return text.toUpperCase();
  }
  static lower(text: string) {
    return text.toLowerCase();
  }
  static title(text: string) {
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  static sentence(text: string) {
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
  }
  static camel(text: string) {
    const words = this.words(text);
    return words
      .map((w, i) => (i ? w[0]?.toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
      .join('');
  }
  static pascal(text: string) {
    return this.words(text)
      .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }
  static snake(text: string) {
    return this.words(text)
      .map((w) => w.toLowerCase())
      .join('_');
  }
  static kebab(text: string) {
    return this.words(text)
      .map((w) => w.toLowerCase())
      .join('-');
  }
  static constant(text: string) {
    return this.words(text)
      .map((w) => w.toUpperCase())
      .join('_');
  }
  static trim(text: string) {
    return text.trim();
  }
  static cleanSpaces(text: string) {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n');
  }
  static removeEmptyLines(text: string) {
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .join('\n');
  }
  static removeDuplicateLines(text: string) {
    const seen = new Set<string>();
    return text
      .split(/\r?\n/)
      .filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .join('\n');
  }
  static sortAsc(text: string) {
    return text
      .split(/\r?\n/)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .join('\n');
  }
  static sortDesc(text: string) {
    return this.sortAsc(text).split('\n').reverse().join('\n');
  }
  static reverseLines(text: string) {
    return text.split(/\r?\n/).reverse().join('\n');
  }
  static reverseText(text: string) {
    return [...text].reverse().join('');
  }
  static numberLines(text: string) {
    return text
      .split(/\r?\n/)
      .map((line, i) => `${i + 1}. ${line}`)
      .join('\n');
  }
  static urlEncode(text: string) {
    return encodeURIComponent(text);
  }
  static urlDecode(text: string) {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  }
  static base64Encode(text: string) {
    try {
      const bytes = new TextEncoder().encode(text);
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      return btoa(binary);
    } catch {
      return text;
    }
  }
  static base64Decode(text: string) {
    try {
      const binary = atob(text.trim());
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      return text;
    }
  }
  static htmlEncode(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  static htmlDecode(text: string) {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
  }
  static jsonPretty(text: string) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  static jsonMinify(text: string) {
    try {
      return JSON.stringify(JSON.parse(text));
    } catch {
      return text;
    }
  }
  static words(text: string) {
    return text
      .trim()
      .split(/[^A-Za-z0-9À-ž]+/)
      .filter(Boolean);
  }
}
