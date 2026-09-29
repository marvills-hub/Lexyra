import { TextStats } from '../models/text-tool.model';

export class TextEngine {
  static stats(text: string): TextStats {
    const t = text.trim(),
      words = t ? t.split(/\s+/).length : 0;
    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words,
      sentences: t ? (t.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.length ?? 0) : 0,
      paragraphs: t ? text.split(/\n\s*\n/).filter((x) => x.trim()).length : 0,
      lines: text ? text.split(/\r?\n/).length : 0,
      readingMinutes: words ? Math.max(1, Math.ceil(words / 200)) : 0,
    };
  }
  static upper(t: string) {
    return t.toUpperCase();
  }
  static lower(t: string) {
    return t.toLowerCase();
  }
  static title(t: string) {
    return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  static sentence(t: string) {
    return t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
  }
  static camel(t: string) {
    return this.words(t)
      .map((w, i) => (i ? this.cap(w) : w.toLowerCase()))
      .join('');
  }
  static pascal(t: string) {
    return this.words(t)
      .map((w) => this.cap(w))
      .join('');
  }
  static snake(t: string) {
    return this.words(t)
      .map((w) => w.toLowerCase())
      .join('_');
  }
  static kebab(t: string) {
    return this.words(t)
      .map((w) => w.toLowerCase())
      .join('-');
  }
  static constant(t: string) {
    return this.words(t)
      .map((w) => w.toUpperCase())
      .join('_');
  }
  static dot(t: string) {
    return this.words(t)
      .map((w) => w.toLowerCase())
      .join('.');
  }
  static path(t: string) {
    return this.words(t)
      .map((w) => w.toLowerCase())
      .join('/');
  }
  static slug(t: string) {
    return this.removeDiacritics(t)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  static trim(t: string) {
    return t.trim();
  }
  static cleanSpaces(t: string) {
    return t
      .split(/\r?\n/)
      .map((x) => x.replace(/[ \t]+/g, ' ').trim())
      .join('\n');
  }
  static removeEmptyLines(t: string) {
    return t
      .split(/\r?\n/)
      .filter((x) => x.trim())
      .join('\n');
  }
  static removeDuplicateLines(t: string) {
    const s = new Set<string>();
    return t
      .split(/\r?\n/)
      .filter((x) => {
        if (s.has(x)) return false;
        s.add(x);
        return true;
      })
      .join('\n');
  }
  static uniqueWords(t: string) {
    return [...new Set(this.words(t).map((x) => x.toLowerCase()))].join('\n');
  }
  static removeDiacritics(t: string) {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  static normalizeUnicode(t: string) {
    return t.normalize('NFC');
  }
  static removeHtml(t: string) {
    const e = document.createElement('div');
    e.innerHTML = t;
    return e.textContent ?? '';
  }
  static sortAsc(t: string) {
    return t
      .split(/\r?\n/)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .join('\n');
  }
  static sortDesc(t: string) {
    return this.sortAsc(t).split('\n').reverse().join('\n');
  }
  static reverseLines(t: string) {
    return t.split(/\r?\n/).reverse().join('\n');
  }
  static reverseText(t: string) {
    return [...t].reverse().join('');
  }
  static shuffleLines(t: string) {
    const a = t.split(/\r?\n/);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.join('\n');
  }
  static numberLines(t: string) {
    return t
      .split(/\r?\n/)
      .map((x, i) => `${i + 1}. ${x}`)
      .join('\n');
  }
  static removeLineNumbers(t: string) {
    return t
      .split(/\r?\n/)
      .map((x) => x.replace(/^\s*\d+[.):\-]\s*/, ''))
      .join('\n');
  }
  static bullets(t: string) {
    return t
      .split(/\r?\n/)
      .map((x) => `• ${x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')}`)
      .join('\n');
  }
  static joinLines(t: string) {
    return t
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .join(' ');
  }
  static tabsToSpaces(t: string) {
    return t.replace(/\t/g, '    ');
  }
  static spacesToTabs(t: string) {
    return t.replace(/^ {4}/gm, '\t');
  }
  static urlEncode(t: string) {
    return encodeURIComponent(t);
  }
  static urlDecode(t: string) {
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  }
  static base64Encode(t: string) {
    try {
      const b = new TextEncoder().encode(t);
      let s = '';
      b.forEach((x) => (s += String.fromCharCode(x)));
      return btoa(s);
    } catch {
      return t;
    }
  }
  static base64Decode(t: string) {
    try {
      const s = atob(t.trim());
      return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
    } catch {
      return t;
    }
  }
  static htmlEncode(t: string) {
    return t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  static htmlDecode(t: string) {
    const e = document.createElement('textarea');
    e.innerHTML = t;
    return e.value;
  }
  static rot13(t: string) {
    return t.replace(/[a-z]/gi, (c) =>
      String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)),
    );
  }
  static textToBinary(t: string) {
    return [...new TextEncoder().encode(t)].map((x) => x.toString(2).padStart(8, '0')).join(' ');
  }
  static binaryToText(t: string) {
    try {
      return new TextDecoder().decode(
        Uint8Array.from(
          t
            .trim()
            .split(/\s+/)
            .map((x) => parseInt(x, 2)),
        ),
      );
    } catch {
      return t;
    }
  }
  static textToHex(t: string) {
    return [...new TextEncoder().encode(t)].map((x) => x.toString(16).padStart(2, '0')).join(' ');
  }
  static hexToText(t: string) {
    try {
      return new TextDecoder().decode(
        Uint8Array.from(
          t
            .trim()
            .replace(/0x/g, '')
            .split(/\s+/)
            .map((x) => parseInt(x, 16)),
        ),
      );
    } catch {
      return t;
    }
  }
  static jsonPretty(t: string) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return t;
    }
  }
  static jsonMinify(t: string) {
    try {
      return JSON.stringify(JSON.parse(t));
    } catch {
      return t;
    }
  }
  static jsonValidate(t: string) {
    try {
      JSON.parse(t);
      return 'Valid JSON';
    } catch (e) {
      return `Invalid JSON\n${e instanceof Error ? e.message : 'Unknown JSON error'}`;
    }
  }
  static csvToJson(t: string) {
    try {
      const l = t.trim().split(/\r?\n/);
      if (l.length < 2) return t;
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
      return t;
    }
  }
  static jsonToCsv(t: string) {
    try {
      const d = JSON.parse(t);
      if (!Array.isArray(d) || !d.length) return t;
      const h = [...new Set(d.flatMap((x: Record<string, unknown>) => Object.keys(x)))];
      const esc = (v: unknown) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [
        h.join(','),
        ...d.map((x: Record<string, unknown>) => h.map((k) => esc(x[k])).join(',')),
      ].join('\n');
    } catch {
      return t;
    }
  }
  static escapeJs(t: string) {
    return JSON.stringify(t).slice(1, -1);
  }
  static unescapeJs(t: string) {
    try {
      return JSON.parse(`"${t.replace(/"/g, '\\"')}"`);
    } catch {
      return t;
    }
  }
  static extractEmails(t: string) {
    return [...new Set(t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].join('\n');
  }
  static extractUrls(t: string) {
    return [...new Set(t.match(/https?:\/\/[^\s<>"']+/gi) ?? [])].join('\n');
  }
  static extractNumbers(t: string) {
    return (t.match(/[-+]?\d*\.?\d+/g) ?? []).join('\n');
  }
  static extractHashtags(t: string) {
    return [...new Set(t.match(/#[\p{L}\p{N}_]+/gu) ?? [])].join('\n');
  }
  static wordFrequency(t: string) {
    const m = new Map<string, number>();
    this.words(t)
      .map((x) => x.toLowerCase())
      .forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
    return [...m]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([w, n]) => `${w}\t${n}`)
      .join('\n');
  }
  static lineLength(t: string) {
    return t
      .split(/\r?\n/)
      .map((x, i) => `${i + 1}\t${x.length}\t${x}`)
      .join('\n');
  }
  static randomString(n = 32) {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      a = new Uint32Array(n);
    crypto.getRandomValues(a);
    return [...a].map((x) => c[x % c.length]).join('');
  }
  static uuid() {
    return crypto.randomUUID();
  }
  static password(n = 20) {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=',
      a = new Uint32Array(n);
    crypto.getRandomValues(a);
    return [...a].map((x) => c[x % c.length]).join('');
  }
  static passphrase() {
    const w = [
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
      ],
      a = new Uint32Array(5);
    crypto.getRandomValues(a);
    return [...a].map((x) => w[x % w.length]).join('-');
  }
  static lorem() {
    return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  }
  static timestamp() {
    return `${Date.now()}\n${Math.floor(Date.now() / 1000)}\n${new Date().toISOString()}`;
  }
  static cap(t: string) {
    return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t;
  }
  static words(t: string) {
    return t
      .trim()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }
  static csvRow(r: string) {
    const o: string[] = [];
    let c = '',
      q = false;
    for (let i = 0; i < r.length; i++) {
      const x = r[i];
      if (x === '"' && q && r[i + 1] === '"') {
        c += '"';
        i++;
      } else if (x === '"') q = !q;
      else if (x === ',' && !q) {
        o.push(c);
        c = '';
      } else c += x;
    }
    o.push(c);
    return o;
  }
}
