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
    const w = this.words(text);
    return w.map((x, i) => (i ? this.cap(x) : x.toLowerCase())).join('');
  }
  static pascal(text: string) {
    return this.words(text)
      .map((x) => this.cap(x))
      .join('');
  }
  static snake(text: string) {
    return this.words(text)
      .map((x) => x.toLowerCase())
      .join('_');
  }
  static kebab(text: string) {
    return this.words(text)
      .map((x) => x.toLowerCase())
      .join('-');
  }
  static constant(text: string) {
    return this.words(text)
      .map((x) => x.toUpperCase())
      .join('_');
  }
  static dot(text: string) {
    return this.words(text)
      .map((x) => x.toLowerCase())
      .join('.');
  }
  static path(text: string) {
    return this.words(text)
      .map((x) => x.toLowerCase())
      .join('/');
  }
  static slug(text: string) {
    return this.kebab(text).replace(/[^a-z0-9-]/g, '');
  }
  static trim(text: string) {
    return text.trim();
  }
  static cleanSpaces(text: string) {
    return text
      .split(/\r?\n/)
      .map((x) => x.replace(/[ \t]+/g, ' ').trim())
      .join('\n');
  }
  static removeEmptyLines(text: string) {
    return text
      .split(/\r?\n/)
      .filter((x) => x.trim())
      .join('\n');
  }
  static removeDuplicateLines(text: string) {
    const s = new Set<string>();
    return text
      .split(/\r?\n/)
      .filter((x) => !s.has(x) && !!s.add(x))
      .join('\n');
  }
  static uniqueWords(text: string) {
    return [...new Set(this.words(text).map((x) => x.toLowerCase()))].join('\n');
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
  static shuffleLines(text: string) {
    const a = text.split(/\r?\n/);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.join('\n');
  }
  static numberLines(text: string) {
    return text
      .split(/\r?\n/)
      .map((x, i) => `${i + 1}. ${x}`)
      .join('\n');
  }
  static bullets(text: string) {
    return text
      .split(/\r?\n/)
      .map((x) => `• ${x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')}`)
      .join('\n');
  }
  static removeLineNumbers(text: string) {
    return text
      .split(/\r?\n/)
      .map((x) => x.replace(/^\s*\d+[.):\-]\s*/, ''))
      .join('\n');
  }
  static joinLines(text: string) {
    return text
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .join(' ');
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
      const b = new TextEncoder().encode(text);
      let s = '';
      b.forEach((x) => (s += String.fromCharCode(x)));
      return btoa(s);
    } catch {
      return text;
    }
  }
  static base64Decode(text: string) {
    try {
      const s = atob(text.trim());
      return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
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
    const e = document.createElement('textarea');
    e.innerHTML = text;
    return e.value;
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
  static jsonValidate(text: string) {
    try {
      JSON.parse(text);
      return 'Valid JSON';
    } catch (e) {
      return `Invalid JSON\n${e instanceof Error ? e.message : 'Unknown JSON error'}`;
    }
  }
  static csvToJson(text: string) {
    try {
      const l = text.trim().split(/\r?\n/);
      if (l.length < 2) return text;
      const h = this.csvRow(l[0]);
      return JSON.stringify(
        l.slice(1).map((r) => {
          const v = this.csvRow(r);
          return Object.fromEntries(h.map((k, i) => [k, v[i] ?? '']));
        }),
        null,
        2,
      );
    } catch {
      return text;
    }
  }
  static jsonToCsv(text: string) {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.length) return text;
      const h = [...new Set(data.flatMap((x: Record<string, unknown>) => Object.keys(x)))];
      const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [
        h.join(','),
        ...data.map((x: Record<string, unknown>) => h.map((k) => esc(x[k])).join(',')),
      ].join('\n');
    } catch {
      return text;
    }
  }
  static rot13(text: string) {
    return text.replace(/[a-z]/gi, (c) =>
      String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)),
    );
  }
  static textToBinary(text: string) {
    return [...new TextEncoder().encode(text)].map((x) => x.toString(2).padStart(8, '0')).join(' ');
  }
  static binaryToText(text: string) {
    try {
      return new TextDecoder().decode(
        Uint8Array.from(
          text
            .trim()
            .split(/\s+/)
            .map((x) => parseInt(x, 2)),
        ),
      );
    } catch {
      return text;
    }
  }
  static textToHex(text: string) {
    return [...new TextEncoder().encode(text)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join(' ');
  }
  static hexToText(text: string) {
    try {
      return new TextDecoder().decode(
        Uint8Array.from(
          text
            .trim()
            .replace(/0x/g, '')
            .split(/\s+/)
            .map((x) => parseInt(x, 16)),
        ),
      );
    } catch {
      return text;
    }
  }
  static tabsToSpaces(text: string) {
    return text.replace(/\t/g, '    ');
  }
  static spacesToTabs(text: string) {
    return text.replace(/^ {4}/gm, '\t');
  }
  static normalizeUnicode(text: string) {
    return text.normalize('NFC');
  }
  static removeDiacritics(text: string) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  static extractEmails(text: string) {
    return [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].join('\n');
  }
  static extractUrls(text: string) {
    return [...new Set(text.match(/https?:\/\/[^\s<>"']+/gi) ?? [])].join('\n');
  }
  static extractNumbers(text: string) {
    return (text.match(/[-+]?\d*\.?\d+/g) ?? []).join('\n');
  }
  static extractHashtags(text: string) {
    return [...new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? [])].join('\n');
  }
  static wordFrequency(text: string) {
    const m = new Map<string, number>();
    this.words(text)
      .map((x) => x.toLowerCase())
      .forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
    return [...m]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([w, n]) => `${w}\t${n}`)
      .join('\n');
  }
  static lineLength(text: string) {
    return text
      .split(/\r?\n/)
      .map((x, i) => `${i + 1}\t${x.length}\t${x}`)
      .join('\n');
  }
  static removeHtml(text: string) {
    const e = document.createElement('div');
    e.innerHTML = text;
    return e.textContent ?? '';
  }
  static escapeJs(text: string) {
    return JSON.stringify(text).slice(1, -1);
  }
  static unescapeJs(text: string) {
    try {
      return JSON.parse(`"${text.replace(/"/g, '\\"')}"`);
    } catch {
      return text;
    }
  }
  static randomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const a = new Uint32Array(length);
    crypto.getRandomValues(a);
    return [...a].map((x) => chars[x % chars.length]).join('');
  }
  static uuid() {
    return crypto.randomUUID();
  }
  static password(length = 20) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
    const a = new Uint32Array(length);
    crypto.getRandomValues(a);
    return [...a].map((x) => chars[x % chars.length]).join('');
  }
  static passphrase() {
    const words = [
      'amber',
      'atlas',
      'breeze',
      'cedar',
      'comet',
      'coral',
      'ember',
      'falcon',
      'forest',
      'galaxy',
      'harbor',
      'lunar',
      'maple',
      'meadow',
      'nova',
      'ocean',
      'orbit',
      'pixel',
      'quartz',
      'river',
      'solar',
      'storm',
      'tiger',
      'velvet',
      'willow',
      'zephyr',
    ];
    const a = new Uint32Array(5);
    crypto.getRandomValues(a);
    return [...a].map((x) => words[x % words.length]).join('-');
  }
  static lorem() {
    return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  }
  static timestamp() {
    return `${Date.now()}\n${Math.floor(Date.now() / 1000)}\n${new Date().toISOString()}`;
  }
  static cap(x: string) {
    return x ? x[0].toUpperCase() + x.slice(1).toLowerCase() : x;
  }
  static words(text: string) {
    return text
      .trim()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }
  static csvRow(row: string) {
    const out: string[] = [];
    let cur = '',
      q = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"' && q && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        q = !q;
      } else if (c === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out;
  }
}
