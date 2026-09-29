import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createIcons, icons } from 'lucide';
import { TextEngine } from './core/engine/text-engine';
import { TextWorkspaceService } from './core/services/text-workspace.service';
import { TEXT_TOOLS, TOOL_CATEGORIES } from './shared/constants/tools';
import { TextTool, ToolCategoryItem } from './core/models/text-tool.model';

interface ToolOptions {
  amount: number;
  length: number;
  indent: number;
  wrap: number;
  prefix: string;
  suffix: string;
  start: number;
  delimiter: string;
  jsonIndent: number;
  includeUpper: boolean;
  includeLower: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewChecked {
  @ViewChild('editor') editor?: ElementRef<HTMLTextAreaElement>;
  tools = TEXT_TOOLS;
  categories = TOOL_CATEGORIES;
  category = signal<ToolCategoryItem['id']>('all');
  search = signal('');
  result = signal('');
  resultTitle = signal('');
  resultOpen = signal(false);
  activeTypingTool = signal<string | null>(null);
  activeOptionTool = signal<string | null>(null);
  favorites = signal<string[]>(this.readArray('lexyra.favorites'));
  recentTools = signal<string[]>(this.readArray('lexyra.recentTools'));
  dark = signal(localStorage.getItem('lexyra.theme') !== 'light');
  copied = signal(false);
  resultCopied = signal(false);
  saved = signal(true);
  findText = '';
  replaceText = '';
  typingStart: number | null = null;
  typingRaw = '';
  options: ToolOptions = this.readOptions();
  configurableIds = new Set([
    'password',
    'random',
    'randomAlpha',
    'randomNumeric',
    'lorem',
    'loremParagraphs',
    'indent2',
    'indent4',
    'prefixLines',
    'suffixComma',
    'number',
    'jsonPretty',
  ]);
  visibleTools = computed(() => {
    const c = this.category(),
      q = this.search().trim().toLowerCase();
    let list = this.tools.filter(
      (t) =>
        (c === 'all' || t.category === c) &&
        (!q || `${t.name} ${t.description}`.toLowerCase().includes(q)),
    );
    const fav = this.favorites(),
      recent = this.recentTools();
    return [...list].sort((a, b) => {
      const af = fav.includes(a.id) ? 1 : 0,
        bf = fav.includes(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;
      const ar = recent.indexOf(a.id),
        br = recent.indexOf(b.id);
      if (ar >= 0 && br < 0) return -1;
      if (br >= 0 && ar < 0) return 1;
      if (ar >= 0 && br >= 0) return ar - br;
      return 0;
    });
  });
  favoriteTools = computed(() =>
    this.favorites()
      .map((id) => this.tools.find((t) => t.id === id))
      .filter((t): t is TextTool => !!t),
  );
  recentToolItems = computed(() =>
    this.recentTools()
      .map((id) => this.tools.find((t) => t.id === id))
      .filter((t): t is TextTool => !!t),
  );

  constructor(public workspace: TextWorkspaceService) {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }

  ngAfterViewChecked() {
    createIcons({ icons });
  }

  readArray(key: string) {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(value) ? value.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  readOptions(): ToolOptions {
    const defaults: ToolOptions = {
      amount: 3,
      length: 24,
      indent: 4,
      wrap: 80,
      prefix: '> ',
      suffix: ',',
      start: 1,
      delimiter: ',',
      jsonIndent: 2,
      includeUpper: true,
      includeLower: true,
      includeNumbers: true,
      includeSymbols: true,
    };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem('lexyra.toolOptions') ?? '{}') };
    } catch {
      return defaults;
    }
  }

  saveOptions() {
    localStorage.setItem('lexyra.toolOptions', JSON.stringify(this.options));
  }

  @HostListener('document:keydown', ['$event'])
  keydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.resetTypingSession();
      this.workspace.undo();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
    ) {
      e.preventDefault();
      this.resetTypingSession();
      this.workspace.redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('toolSearch')?.focus();
    }
    if (e.key === 'Escape') {
      this.resultOpen.set(false);
      this.activeOptionTool.set(null);
      this.disableTypingTool();
    }
  }

  selectCategory(id: ToolCategoryItem['id']) {
    this.category.set(id);
    this.search.set('');
  }

  toggleFavorite(id: string, event?: Event) {
    event?.stopPropagation();
    const current = this.favorites();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    this.favorites.set(next);
    localStorage.setItem('lexyra.favorites', JSON.stringify(next));
  }

  isFavorite(id: string) {
    return this.favorites().includes(id);
  }

  recordRecent(id: string) {
    const next = [id, ...this.recentTools().filter((x) => x !== id)].slice(0, 12);
    this.recentTools.set(next);
    localStorage.setItem('lexyra.recentTools', JSON.stringify(next));
  }

  resetTypingSession() {
    this.typingStart = null;
    this.typingRaw = '';
  }

  disableTypingTool() {
    this.activeTypingTool.set(null);
    this.resetTypingSession();
  }

  update(v: string) {
    const active = this.activeTypingTool();
    const old = this.workspace.text();

    if (active) {
      const e = this.editor?.nativeElement;

      if (v.length > old.length) {
        let prefix = 0;
        while (prefix < old.length && prefix < v.length && old[prefix] === v[prefix]) prefix++;

        let suffix = 0;
        while (
          suffix < old.length - prefix &&
          suffix < v.length - prefix &&
          old[old.length - 1 - suffix] === v[v.length - 1 - suffix]
        )
          suffix++;

        const inserted = v.slice(prefix, v.length - suffix);

        if (
          this.typingStart === null ||
          prefix !== this.typingStart + this.currentTypingOutputLength()
        ) {
          this.typingStart = prefix;
          this.typingRaw = inserted;
        } else {
          this.typingRaw += inserted;
        }

        const transformed = this.configuredTransform(active, this.typingRaw);

        if (transformed !== null && this.typingStart !== null) {
          const start = this.typingStart;
          const before = old.slice(0, start);
          const previousLength = old.length - before.length - suffix;
          const after = old.slice(start + previousLength);
          v = before + transformed + after;
          const caret = start + transformed.length;

          setTimeout(() => {
            e?.focus();
            e?.setSelectionRange(caret, caret);
          });
        }
      } else {
        this.resetTypingSession();
      }
    }

    this.saved.set(false);
    this.workspace.set(v, false);
    setTimeout(() => this.saved.set(true), 250);
  }

  currentTypingOutputLength() {
    const active = this.activeTypingTool();
    if (!active || !this.typingRaw) return 0;
    return this.configuredTransform(active, this.typingRaw)?.length ?? this.typingRaw.length;
  }

  source() {
    const e = this.editor?.nativeElement,
      t = this.workspace.text();
    if (e && e.selectionStart !== e.selectionEnd) {
      return {
        text: t.slice(e.selectionStart, e.selectionEnd),
        start: e.selectionStart,
        end: e.selectionEnd,
        selected: true,
      };
    }
    return { text: t, start: 0, end: t.length, selected: false };
  }

  configuredTransform(id: string, value: string): string | null {
    switch (id) {
      case 'indent2':
      case 'indent4':
        return value
          .split(/\r?\n/)
          .map((x) => ' '.repeat(Math.max(0, this.options.indent)) + x)
          .join('\n');
      case 'prefixLines':
        return value
          .split(/\r?\n/)
          .map((x) => this.options.prefix + x)
          .join('\n');
      case 'suffixComma':
        return value
          .split(/\r?\n/)
          .map((x) => x.replace(/[,\s]+$/, '') + this.options.suffix)
          .join('\n');
      case 'number':
        return value
          .split(/\r?\n/)
          .map((x, i) => `${this.options.start + i}. ${x}`)
          .join('\n');
      case 'jsonPretty':
        try {
          return JSON.stringify(
            JSON.parse(value),
            null,
            Math.max(1, Math.min(10, this.options.jsonIndent)),
          );
        } catch {
          return value;
        }
      default:
        return TextEngine.transform(id, value);
    }
  }

  secureRandom(chars: string, length: number) {
    if (!chars) return '';
    const count = Math.max(1, Math.min(4096, length));
    const values = new Uint32Array(count);
    crypto.getRandomValues(values);
    return [...values].map((v) => chars[v % chars.length]).join('');
  }

  configuredResult(id: string, value: string): string | null {
    if (id === 'password') {
      let chars = '';
      if (this.options.includeUpper) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      if (this.options.includeLower) chars += 'abcdefghijkmnopqrstuvwxyz';
      if (this.options.includeNumbers) chars += '23456789';
      if (this.options.includeSymbols) chars += '!@#$%^&*_-+=';
      return this.secureRandom(chars || 'abcdefghijklmnopqrstuvwxyz', this.options.length);
    }
    if (id === 'random')
      return this.secureRandom(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        this.options.length,
      );
    if (id === 'randomAlpha')
      return this.secureRandom(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        this.options.length,
      );
    if (id === 'randomNumeric') return this.secureRandom('0123456789', this.options.length);
    if (id === 'lorem' || id === 'loremParagraphs') {
      const paragraph =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      return Array.from(
        { length: Math.max(1, Math.min(100, this.options.amount)) },
        () => paragraph,
      ).join('\n\n');
    }
    return TextEngine.result(id, value);
  }

  hasOptions(id: string) {
    return this.configurableIds.has(id);
  }

  openOptions(id: string, event?: Event) {
    event?.stopPropagation();
    this.activeOptionTool.set(this.activeOptionTool() === id ? null : id);
  }

  async digest(algorithm: string, text: string) {
    const hash = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
    return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  async run(id: string) {
    const tool = this.tools.find((t) => t.id === id);
    if (!tool) return;

    this.recordRecent(id);
    const src = this.source();

    if (tool.behavior === 'transform' && !src.selected) {
      const next = this.activeTypingTool() === id ? null : id;
      this.activeTypingTool.set(next);
      this.resetTypingSession();
      setTimeout(() => this.editor?.nativeElement.focus());
      return;
    }

    let output: string | null = null;

    if (id === 'sha256') output = await this.digest('SHA-256', src.text);
    else if (id === 'sha1') output = await this.digest('SHA-1', src.text);
    else if (id === 'sha384') output = await this.digest('SHA-384', src.text);
    else if (id === 'sha512') output = await this.digest('SHA-512', src.text);
    else if (tool.behavior === 'result') output = this.configuredResult(id, src.text);
    else output = this.configuredTransform(id, src.text);

    if (output === null) return;

    if (tool.behavior === 'result') {
      this.resultTitle.set(tool.name);
      this.result.set(output);
      this.resultOpen.set(true);
      return;
    }

    const current = this.workspace.text();

    if (src.selected) {
      this.workspace.set(current.slice(0, src.start) + output + current.slice(src.end));
      this.disableTypingTool();

      setTimeout(() => {
        const e = this.editor?.nativeElement;
        e?.focus();
        e?.setSelectionRange(src.start, src.start + output!.length);
      });
    }
  }

  replace() {
    if (this.findText)
      this.workspace.set(this.workspace.text().split(this.findText).join(this.replaceText));
  }

  insertResult() {
    const e = this.editor?.nativeElement,
      current = this.workspace.text();

    if (!e) {
      this.workspace.set(current + this.result());
      return;
    }

    const start = e.selectionStart,
      end = e.selectionEnd;
    const spacer = current && start === current.length && !current.endsWith('\n') ? '\n' : '';
    this.workspace.set(current.slice(0, start) + spacer + this.result() + current.slice(end));
    this.resultOpen.set(false);

    setTimeout(() => e.focus());
  }

  replaceWithResult() {
    this.workspace.set(this.result());
    this.resultOpen.set(false);
  }

  async copyText() {
    await navigator.clipboard.writeText(this.workspace.text());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1000);
  }

  async copyResult() {
    await navigator.clipboard.writeText(this.result());
    this.resultCopied.set(true);
    setTimeout(() => this.resultCopied.set(false), 1000);
  }

  importFile(input: HTMLInputElement) {
    input.click();
  }

  loadFile(ev: Event) {
    const input = ev.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = () => this.workspace.set(String(r.result ?? ''));
    r.readAsText(file);
    input.value = '';
  }

  download() {
    const b = new Blob([this.workspace.text()], { type: 'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'lexyra-text.txt';
    a.click();
    URL.revokeObjectURL(u);
  }

  toggleTheme() {
    this.dark.update((v) => !v);
    const t = this.dark() ? 'dark' : 'light';
    document.documentElement.dataset['theme'] = t;
    localStorage.setItem('lexyra.theme', t);
  }
}
