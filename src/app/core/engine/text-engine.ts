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
  static words(t: string) {
    return t
      .trim()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }
  static cap(t: string) {
    return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t;
  }
  static wordParts(t: string) {
    return this.words(t);
  }
  static lines(t: string) {
    return t.split(/\r?\n/);
  }
  static mapLines(t: string, fn: (x: string, i: number) => string) {
    return this.lines(t).map(fn).join('\n');
  }
  static randomFrom(chars: string, n: number) {
    const a = new Uint32Array(n);
    crypto.getRandomValues(a);
    return [...a].map((x) => chars[x % chars.length]).join('');
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
  static stripHtml(t: string) {
    return t
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#(?:39|039);/gi, "'");
  }
  static transform(id: string, t: string): string | null {
    const w = () => this.wordParts(t);
    switch (id) {
      case 'upper':
        return t.toUpperCase();
      case 'lower':
        return t.toLowerCase();
      case 'title':
        return t.toLowerCase().replace(/\b[\p{L}\p{N}]/gu, (c) => c.toUpperCase());
      case 'sentence':
        return t
          .toLowerCase()
          .replace(/(^\s*[\p{L}\p{N}]|[.!?]\s+[\p{L}\p{N}])/gu, (c) => c.toUpperCase());
      case 'capitalize':
        return t ? t[0].toUpperCase() + t.slice(1) : t;
      case 'toggleCase':
        return [...t]
          .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
          .join('');
      case 'alternating': {
        let i = 0;
        return [...t]
          .map((c) => (/\p{L}/u.test(c) ? (i++ % 2 ? c.toLowerCase() : c.toUpperCase()) : c))
          .join('');
      }
      case 'inverseAlternating': {
        let i = 0;
        return [...t]
          .map((c) => (/\p{L}/u.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c))
          .join('');
      }
      case 'camel':
        return w()
          .map((x, i) => (i ? this.cap(x) : x.toLowerCase()))
          .join('');
      case 'pascal':
        return w()
          .map((x) => this.cap(x))
          .join('');
      case 'snake':
        return w()
          .map((x) => x.toLowerCase())
          .join('_');
      case 'kebab':
        return w()
          .map((x) => x.toLowerCase())
          .join('-');
      case 'constant':
        return w()
          .map((x) => x.toUpperCase())
          .join('_');
      case 'dot':
        return w()
          .map((x) => x.toLowerCase())
          .join('.');
      case 'path':
        return w()
          .map((x) => x.toLowerCase())
          .join('/');
      case 'slug':
        return t
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      case 'train':
        return w()
          .map((x) => this.cap(x))
          .join('-');
      case 'spaceCase':
        return t
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_\-./]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      case 'quote':
        return this.mapLines(t, (x) => `> ${x}`);
      case 'markdownBold':
        return `**${t}**`;
      case 'markdownItalic':
        return `*${t}*`;
      case 'markdownStrike':
        return `~~${t}~~`;
      case 'markdownCode':
        return `\`${t}\``;
      case 'markdownH1':
        return this.mapLines(t, (x) => `# ${x.replace(/^#+\s*/, '')}`);
      case 'markdownH2':
        return this.mapLines(t, (x) => `## ${x.replace(/^#+\s*/, '')}`);
      case 'markdownH3':
        return this.mapLines(t, (x) => `### ${x.replace(/^#+\s*/, '')}`);
      case 'trim':
        return t.trim();
      case 'spaces':
        return this.mapLines(t, (x) => x.replace(/[ \t]+/g, ' ').trim());
      case 'trimLines':
        return this.mapLines(t, (x) => x.trim());
      case 'empty':
        return this.lines(t)
          .filter((x) => x.trim())
          .join('\n');
      case 'collapseEmpty':
        return t.replace(/(?:\r?\n\s*){3,}/g, '\n\n');
      case 'duplicates': {
        const s = new Set<string>();
        return this.lines(t)
          .filter((x) => (s.has(x) ? false : (s.add(x), true)))
          .join('\n');
      }
      case 'duplicateWords':
        return t.replace(/\b([\p{L}\p{N}]+)(\s+\1\b)+/giu, '$1');
      case 'uniqueWords':
        return [...new Set(w().map((x) => x.toLowerCase()))].join('\n');
      case 'diacritics':
        return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      case 'unicode':
        return t.normalize('NFC');
      case 'removeHtml':
        return this.stripHtml(t);
      case 'removePunctuation':
        return t.replace(/[\p{P}]/gu, '');
      case 'removeNumbersText':
        return t.replace(/\p{N}+/gu, '');
      case 'removeLetters':
        return t.replace(/\p{L}+/gu, '');
      case 'removeSymbols':
        return t.replace(/[^\p{L}\p{N}\s]/gu, '');
      case 'removeEmoji':
        return t.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '');
      case 'removeUrls':
        return t.replace(/https?:\/\/[^\s<>"']+/gi, '');
      case 'removeEmails':
        return t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '');
      case 'normalizeQuotes':
        return t.replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'");
      case 'normalizeDashes':
        return t.replace(/[–—−]/g, '-');
      case 'tabsSpaces':
        return t.replace(/\t/g, '    ');
      case 'spacesTabs':
        return t.replace(/^ {4}/gm, '\t');
      case 'stripTrailing':
        return t.replace(/[ \t]+$/gm, '');
      case 'stripLeading':
        return t.replace(/^[ \t]+/gm, '');
      case 'sortAsc':
        return this.lines(t)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
          .join('\n');
      case 'sortDesc':
        return this.lines(t)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
          .join('\n');
      case 'sortLengthAsc':
        return this.lines(t)
          .sort((a, b) => a.length - b.length)
          .join('\n');
      case 'sortLengthDesc':
        return this.lines(t)
          .sort((a, b) => b.length - a.length)
          .join('\n');
      case 'reverseLines':
        return this.lines(t).reverse().join('\n');
      case 'reverseText':
        return [...t].reverse().join('');
      case 'shuffleLines': {
        const a = this.lines(t);
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a.join('\n');
      }
      case 'number':
        return this.mapLines(t, (x, i) => `${i + 1}. ${x}`);
      case 'removeNumbers':
        return this.mapLines(t, (x) => x.replace(/^\s*\d+[.):\-]\s*/, ''));
      case 'bullets':
        return this.mapLines(t, (x) => `• ${x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')}`);
      case 'dashList':
        return this.mapLines(t, (x) => `- ${x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')}`);
      case 'checkboxList':
        return this.mapLines(
          t,
          (x) => `- [ ] ${x.replace(/^\s*(?:-\s*\[[ xX]\]|[-*•]|\d+[.)])\s*/, '')}`,
        );
      case 'joinLines':
        return this.lines(t)
          .map((x) => x.trim())
          .filter(Boolean)
          .join(' ');
      case 'splitWords':
        return w().join('\n');
      case 'prefixLines':
        return this.mapLines(t, (x) => `> ${x}`);
      case 'suffixComma':
        return this.mapLines(t, (x) => `${x.replace(/,\s*$/, '')},`);
      case 'commaList':
        return this.lines(t)
          .map((x) => x.trim())
          .filter(Boolean)
          .join(', ');
      case 'semicolonList':
        return this.lines(t)
          .map((x) => x.trim())
          .filter(Boolean)
          .join('; ');
      case 'urlEncode':
        return encodeURIComponent(t);
      case 'urlDecode':
        try {
          return decodeURIComponent(t);
        } catch {
          return t;
        }
      case 'base64Encode':
        try {
          const b = new TextEncoder().encode(t);
          let s = '';
          b.forEach((x) => (s += String.fromCharCode(x)));
          return btoa(s);
        } catch {
          return t;
        }
      case 'base64Decode':
        try {
          const s = atob(t.trim());
          return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
        } catch {
          return t;
        }
      case 'htmlEncode':
        return t
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      case 'htmlDecode':
        return t
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#(?:39|039);/gi, "'")
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&');
      case 'rot13':
        return t.replace(/[a-z]/gi, (c) =>
          String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)),
        );
      case 'textBinary':
        return [...new TextEncoder().encode(t)]
          .map((x) => x.toString(2).padStart(8, '0'))
          .join(' ');
      case 'binaryText':
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
      case 'textHex':
        return [...new TextEncoder().encode(t)]
          .map((x) => x.toString(16).padStart(2, '0'))
          .join(' ');
      case 'hexText':
        try {
          const clean = t.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
          if (clean.length % 2) return t;
          return new TextDecoder().decode(
            Uint8Array.from(clean.match(/.{2}/g)?.map((x) => parseInt(x, 16)) ?? []),
          );
        } catch {
          return t;
        }
      case 'textUnicode':
        return [...t].map((c) => `\\u{${c.codePointAt(0)!.toString(16).toUpperCase()}}`).join('');
      case 'unicodeText':
        try {
          return t.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) =>
            String.fromCodePoint(parseInt(a || b, 16)),
          );
        } catch {
          return t;
        }
      case 'decimalCodes':
        return [...t].map((c) => c.codePointAt(0)).join(' ');
      case 'decimalText':
        try {
          return t
            .trim()
            .split(/[\s,]+/)
            .map((x) => String.fromCodePoint(Number(x)))
            .join('');
        } catch {
          return t;
        }
      case 'uriComponent':
        return encodeURI(t);
      case 'uriDecode':
        try {
          return decodeURI(t);
        } catch {
          return t;
        }
      case 'newlineEscapes':
        return t
          .replace(/\\/g, '\\\\')
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t');
      case 'escapesNewline':
        return t
          .replace(/\\r\\n/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
      case 'jsonPretty':
        try {
          return JSON.stringify(JSON.parse(t), null, 2);
        } catch {
          return t;
        }
      case 'jsonMinify':
        try {
          return JSON.stringify(JSON.parse(t));
        } catch {
          return t;
        }
      case 'csvJson':
        try {
          const l = this.lines(t.trim());
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
      case 'jsonCsv':
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
      case 'queryJson':
        try {
          const q = t.replace(/^\?/, '');
          return JSON.stringify(Object.fromEntries(new URLSearchParams(q)), null, 2);
        } catch {
          return t;
        }
      case 'jsonQuery':
        try {
          const d = JSON.parse(t);
          return new URLSearchParams(Object.entries(d).map(([k, v]) => [k, String(v)])).toString();
        } catch {
          return t;
        }
      case 'htmlPretty':
        return t
          .replace(/>\s*</g, '>\n<')
          .replace(
            /(<\/(?:div|p|section|article|header|footer|main|ul|ol|li|table|tr|h[1-6])>)/gi,
            '$1\n',
          )
          .replace(/\n{2,}/g, '\n')
          .trim();
      case 'htmlMinify':
        return t
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/>\s+</g, '><')
          .replace(/\s{2,}/g, ' ')
          .trim();
      case 'cssMinify':
        return t
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s*([{}:;,>])\s*/g, '$1')
          .replace(/;}/g, '}')
          .trim();
      case 'sqlPretty':
        return t
          .replace(/\s+/g, ' ')
          .replace(
            /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|JOIN|UNION|AND|OR)\b/gi,
            (m) => `\n${m.toUpperCase()}`,
          )
          .trim();
      case 'xmlPretty':
        return t.replace(/>\s*</g, '>\n<').trim();
      case 'xmlMinify':
        return t.replace(/>\s+</g, '><').trim();
      case 'escapeJs':
        return JSON.stringify(t).slice(1, -1);
      case 'unescapeJs':
        try {
          return JSON.parse(`"${t.replace(/"/g, '\\"')}"`);
        } catch {
          return t;
        }
      case 'escapeRegex':
        return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      case 'quoteJsonString':
        return JSON.stringify(t);
      case 'unquoteJsonString':
        try {
          return JSON.parse(t);
        } catch {
          return t;
        }
      case 'indent2':
        return this.mapLines(t, (x) => `  ${x}`);
      case 'indent4':
        return this.mapLines(t, (x) => `    ${x}`);
      case 'outdent':
        return this.mapLines(t, (x) => x.replace(/^(?:\t| {1,4})/, ''));
      case 'lineEndingLf':
        return t.replace(/\r\n?/g, '\n');
      case 'lineEndingCrlf':
        return t.replace(/\r\n?|\n/g, '\r\n');
      case 'removeInvisible':
        return t.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
      default:
        return null;
    }
  }
  static result(id: string, t: string): string | null {
    switch (id) {
      case 'jsonValidate':
        try {
          JSON.parse(t);
          return 'Valid JSON';
        } catch (e) {
          return `Invalid JSON\n${e instanceof Error ? e.message : 'Unknown error'}`;
        }
      case 'emails':
        return [...new Set(t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].join('\n');
      case 'urls':
        return [...new Set(t.match(/https?:\/\/[^\s<>"']+/gi) ?? [])].join('\n');
      case 'numbersOnly':
        return (t.match(/[-+]?\d*\.?\d+/g) ?? []).join('\n');
      case 'hashtags':
        return [...new Set(t.match(/#[\p{L}\p{N}_]+/gu) ?? [])].join('\n');
      case 'mentions':
        return [...new Set(t.match(/@[\p{L}\p{N}_.-]+/gu) ?? [])].join('\n');
      case 'frequency': {
        const m = new Map<string, number>();
        this.words(t)
          .map((x) => x.toLowerCase())
          .forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
        return [...m]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([x, n]) => `${x}\t${n}`)
          .join('\n');
      }
      case 'lineLength':
        return this.lines(t)
          .map((x, i) => `${i + 1}\t${x.length}\t${x}`)
          .join('\n');
      case 'longestWords':
        return [...new Set(this.words(t))]
          .sort((a, b) => b.length - a.length || a.localeCompare(b))
          .slice(0, 50)
          .map((x) => `${x.length}\t${x}`)
          .join('\n');
      case 'duplicateLineReport': {
        const m = new Map<string, number>();
        this.lines(t)
          .filter(Boolean)
          .forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
        return (
          [...m]
            .filter(([, n]) => n > 1)
            .sort((a, b) => b[1] - a[1])
            .map(([x, n]) => `${n}×\t${x}`)
            .join('\n') || 'No duplicate lines'
        );
      }
      case 'alphabeticalWords':
        return [...new Set(this.words(t).map((x) => x.toLowerCase()))]
          .sort((a, b) => a.localeCompare(b))
          .join('\n');
      case 'statsReport': {
        const s = this.stats(t);
        return `Characters: ${s.characters}\nCharacters without spaces: ${s.charactersNoSpaces}\nWords: ${s.words}\nSentences: ${s.sentences}\nParagraphs: ${s.paragraphs}\nLines: ${s.lines}\nReading time: ${s.readingMinutes} min`;
      }
      case 'password':
        return this.randomFrom(
          'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=',
          24,
        );
      case 'passphrase': {
        const a = [
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
        const r = new Uint32Array(5);
        crypto.getRandomValues(r);
        return [...r].map((x) => a[x % a.length]).join('-');
      }
      case 'uuid':
        return crypto.randomUUID();
      case 'random':
        return this.randomFrom(
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          32,
        );
      case 'randomAlpha':
        return this.randomFrom('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 32);
      case 'randomNumeric':
        return this.randomFrom('0123456789', 16);
      case 'lorem':
        return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      case 'loremParagraphs': {
        const p =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
        return `${p}\n\n${p}\n\n${p}`;
      }
      case 'timestamp':
        return `${Date.now()}\n${Math.floor(Date.now() / 1000)}\n${new Date().toISOString()}`;
      case 'dateIso':
        return new Date().toISOString();
      case 'invisible': {
        const names: Record<number, string> = {
          9: 'TAB',
          10: 'LF',
          13: 'CR',
          32: 'SPACE',
          160: 'NBSP',
          8203: 'ZERO WIDTH SPACE',
          8204: 'ZERO WIDTH NON-JOINER',
          8205: 'ZERO WIDTH JOINER',
          8288: 'WORD JOINER',
          65279: 'BOM',
        };
        const out = [...t]
          .map((c, i) =>
            names[c.codePointAt(0)!]
              ? `${i}\tU+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}\t${names[c.codePointAt(0)!]}`
              : '',
          )
          .filter(Boolean);
        return out.join('\n') || 'No tracked invisible characters';
      }
      case 'passwordStrength': {
        const checks = [/[a-z]/.test(t), /[A-Z]/.test(t), /\d/.test(t), /[^\w\s]/.test(t)];
        let score = Math.min(4, Math.floor(t.length / 4)) + checks.filter(Boolean).length;
        return `Length: ${t.length}\nLowercase: ${checks[0] ? 'Yes' : 'No'}\nUppercase: ${checks[1] ? 'Yes' : 'No'}\nNumbers: ${checks[2] ? 'Yes' : 'No'}\nSymbols: ${checks[3] ? 'Yes' : 'No'}\nComposition score: ${Math.min(8, score)}/8`;
      }
      default:
        return null;
    }
  }
}
