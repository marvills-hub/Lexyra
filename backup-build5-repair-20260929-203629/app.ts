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
  searchRegex = this.readBool('lexyra.search.regex');
  searchCase = this.readBool('lexyra.search.case');
  searchWholeWord = this.readBool('lexyra.search.wholeWord');
  searchIndex = signal(-1);
  searchCount = signal(0);
  searchError = signal('');
  commandOpen = signal(false);
  commandQuery = signal('');
  commandIndex = signal(0);
  gotoLineValue = 1;
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

  editorCommands = [
    { id: 'editor.selectAll', name: 'Select All', icon: 'scan-text', shortcut: 'Ctrl+A' },
    { id: 'editor.selectLine', name: 'Select Current Line', icon: 'text-select', shortcut: 'Alt+L' },
    { id: 'editor.duplicateLine', name: 'Duplicate Line / Selection', icon: 'copy-plus', shortcut: 'Alt+Shift+D' },
    { id: 'editor.deleteLine', name: 'Delete Line / Selection', icon: 'trash-2', shortcut: 'Alt+Shift+K' },
    { id: 'editor.moveLineUp', name: 'Move Line Up', icon: 'arrow-up', shortcut: 'Alt+ArrowUp' },
    { id: 'editor.moveLineDown', name: 'Move Line Down', icon: 'arrow-down', shortcut: 'Alt+ArrowDown' },
    { id: 'editor.indent', name: 'Indent Selection', icon: 'indent-increase', shortcut: 'Tab' },
    { id: 'editor.outdent', name: 'Outdent Selection', icon: 'indent-decrease', shortcut: 'Shift+Tab' },
    { id: 'editor.find', name: 'Focus Find', icon: 'search', shortcut: 'Ctrl+F' },
    { id: 'editor.gotoLine', name: 'Go to Line', icon: 'locate-fixed', shortcut: 'Ctrl+G' }
  ];

  commandItems = computed(() => {
    const q = this.commandQuery().trim().toLowerCase();

    const tools = this.tools.map((tool) => ({
      id: `tool.${tool.id}`,
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      type: 'tool' as const,
      favorite: this.favorites().includes(tool.id),
      recent: this.recentTools().includes(tool.id),
      shortcut: ''
    }));

    const commands = this.editorCommands.map((command) => ({
      ...command,
      description: 'Editor command',
      type: 'command' as const,
      favorite: false,
      recent: false
    }));

    let items = [...tools, ...commands];

    if (q) {
      items = items.filter((item) =>
        `${item.name} ${item.description} ${item.shortcut}`.toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (a.recent !== b.recent) return a.recent ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).slice(0, 30);
  });
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
      this.openCommandPalette();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      this.focusFind();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      this.focusGotoLine();
      return;
    }

    if (this.commandOpen()) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const max = Math.max(0, this.commandItems().length - 1);
        this.commandIndex.update((i) => Math.min(max, i + 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.commandIndex.update((i) => Math.max(0, i - 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = this.commandItems()[this.commandIndex()];
        if (item) this.executeCommandItem(item.id);
        return;
      }
    }

    const editorFocused = document.activeElement === this.editor?.nativeElement;

    if (editorFocused && e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) this.outdentSelection();
      else this.indentSelection();
      return;
    }

    if (editorFocused && e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.duplicateLineOrSelection();
      return;
    }

    if (editorFocused && e.altKey && e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.deleteLineOrSelection();
      return;
    }

    if (editorFocused && e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      this.moveLine(-1);
      return;
    }

    if (editorFocused && e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      this.moveLine(1);
      return;
    }

    if (editorFocused && e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      this.selectCurrentLine();
      return;
    }
    if (e.key === 'Escape') {
      this.resultOpen.set(false);
      this.activeOptionTool.set(null);
      this.commandOpen.set(false);
      this.commandQuery.set('');
      this.commandIndex.set(0);
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
  escapeRegexText(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\

  replace() {
    if (this.findText)
      this.workspace.set(this.workspace.text().split(this.findText).join(this.replaceText));
  }

  insertResult()');
  }

  buildSearchRegex(global = true) {
    if (!this.findText) return null;

    try {
      let source = this.searchRegex ? this.findText : this.escapeRegexText(this.findText);

      if (this.searchWholeWord) source = `\\b(?:${source})\\b`;

      return new RegExp(source, `${global ? 'g' : ''}${this.searchCase ? '' : 'i'}u`);
    } catch (error) {
      this.searchError.set(error instanceof Error ? error.message : 'Invalid regular expression');
      return null;
    }
  }

  findMatches() {
    const text = this.workspace.text();
    const regex = this.buildSearchRegex(true);

    this.searchError.set('');

    if (!regex || !this.findText) {
      this.searchCount.set(0);
      this.searchIndex.set(-1);
      return [] as { start: number; end: number; text: string }[];
    }

    const matches: { start: number; end: number; text: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text))) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });

      if (!match[0].length) regex.lastIndex++;
      if (matches.length >= 10000) break;
    }

    this.searchCount.set(matches.length);

    if (!matches.length) this.searchIndex.set(-1);

    return matches;
  }

  refreshSearch(selectCurrent = false) {
    const matches = this.findMatches();

    if (!matches.length) return;

    let index = this.searchIndex();

    if (index < 0 || index >= matches.length) {
      index = 0;
      this.searchIndex.set(0);
    }

    if (selectCurrent) this.selectSearchMatch(matches[index]);
  }

  findNext() {
    const matches = this.findMatches();

    if (!matches.length) return;

    const e = this.editor?.nativeElement;
    const caret = e?.selectionEnd ?? 0;
    let index = matches.findIndex((match) => match.start >= caret);

    if (index < 0) index = 0;

    this.searchIndex.set(index);
    this.selectSearchMatch(matches[index]);
  }

  findPrevious() {
    const matches = this.findMatches();

    if (!matches.length) return;

    const e = this.editor?.nativeElement;
    const caret = e?.selectionStart ?? this.workspace.text().length;
    let index = -1;

    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i].end <= caret) {
        index = i;
        break;
      }
    }

    if (index < 0) index = matches.length - 1;

    this.searchIndex.set(index);
    this.selectSearchMatch(matches[index]);
  }

  selectSearchMatch(match: { start: number; end: number }) {
    setTimeout(() => {
      const e = this.editor?.nativeElement;
      if (!e) return;

      e.focus();
      e.setSelectionRange(match.start, match.end);

      const textBefore = this.workspace.text().slice(0, match.start);
      const line = textBefore.split('\n').length;
      const totalLines = Math.max(1, this.workspace.stats().lines);
      e.scrollTop = ((line - 1) / totalLines) * Math.max(0, e.scrollHeight - e.clientHeight);
    });
  }

  replaceCurrent() {
    const matches = this.findMatches();

    if (!matches.length) return;

    let index = this.searchIndex();

    if (index < 0 || index >= matches.length) index = 0;

    const match = matches[index];
    const text = this.workspace.text();

    let replacement = this.replaceText;

    if (this.searchRegex) {
      const regex = this.buildSearchRegex(false);
      if (regex) replacement = match.text.replace(regex, this.replaceText);
    }

    this.workspace.set(text.slice(0, match.start) + replacement + text.slice(match.end));
    this.searchIndex.set(index);
    this.refreshSearch(true);
  }

  replace() {
    if (!this.findText) return;

    const regex = this.buildSearchRegex(true);

    if (!regex) return;

    const current = this.workspace.text();
    const next = current.replace(regex, this.replaceText);

    if (next !== current) this.workspace.set(next);

    this.searchIndex.set(-1);
    this.refreshSearch(false);
  }

  focusFind() {
    setTimeout(() => {
      const input = document.getElementById('findInput') as HTMLInputElement | null;
      input?.focus();
      input?.select();
      this.refreshSearch(false);
    });
  }

  focusGotoLine() {
    setTimeout(() => {
      const input = document.getElementById('gotoLineInput') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  goToLine() {
    const e = this.editor?.nativeElement;
    if (!e) return;

    const text = this.workspace.text();
    const lines = text.split('\n');
    const line = Math.max(1, Math.min(lines.length, Number(this.gotoLineValue) || 1));
    let start = 0;

    for (let i = 0; i < line - 1; i++) start += lines[i].length + 1;

    const end = start + lines[line - 1].length;

    e.focus();
    e.setSelectionRange(start, end);

    const totalLines = Math.max(1, lines.length);
    e.scrollTop = ((line - 1) / totalLines) * Math.max(0, e.scrollHeight - e.clientHeight);
  }

  selectedRangeOrLine() {
    const e = this.editor?.nativeElement;
    const text = this.workspace.text();

    if (!e) return { start: 0, end: 0 };

    if (e.selectionStart !== e.selectionEnd) {
      return { start: e.selectionStart, end: e.selectionEnd };
    }

    const start = text.lastIndexOf('\n', Math.max(0, e.selectionStart - 1)) + 1;
    const newline = text.indexOf('\n', e.selectionEnd);
    const end = newline < 0 ? text.length : newline;

    return { start, end };
  }

  selectCurrentLine() {
    const e = this.editor?.nativeElement;
    if (!e) return;

    const range = this.selectedRangeOrLine();
    e.focus();
    e.setSelectionRange(range.start, range.end);
  }

  selectAllEditor() {
    const e = this.editor?.nativeElement;
    if (!e) return;

    e.focus();
    e.setSelectionRange(0, this.workspace.text().length);
  }

  duplicateLineOrSelection() {
    const e = this.editor?.nativeElement;
    if (!e) return;

    const text = this.workspace.text();

    if (e.selectionStart !== e.selectionEnd) {
      const start = e.selectionStart;
      const end = e.selectionEnd;
      const selected = text.slice(start, end);
      this.workspace.set(text.slice(0, end) + selected + text.slice(end));

      setTimeout(() => {
        e.focus();
        e.setSelectionRange(end, end + selected.length);
      });
      return;
    }

    const range = this.selectedRangeOrLine();
    const line = text.slice(range.start, range.end);
    const insertion = `${line}\n`;

    this.workspace.set(text.slice(0, range.start) + insertion + text.slice(range.start));

    setTimeout(() => {
      const start = range.start + insertion.length;
      e.focus();
      e.setSelectionRange(start, start + line.length);
    });
  }

  deleteLineOrSelection() {
    const e = this.editor?.nativeElement;
    if (!e) return;

    const text = this.workspace.text();

    if (e.selectionStart !== e.selectionEnd) {
      const start = e.selectionStart;
      this.workspace.set(text.slice(0, start) + text.slice(e.selectionEnd));

      setTimeout(() => {
        e.focus();
        e.setSelectionRange(start, start);
      });
      return;
    }

    const range = this.selectedRangeOrLine();
    let start = range.start;
    let end = range.end;

    if (end < text.length && text[end] === '\n') end++;
    else if (start > 0 && text[start - 1] === '\n') start--;

    this.workspace.set(text.slice(0, start) + text.slice(end));

    setTimeout(() => {
      e.focus();
      e.setSelectionRange(start, start);
    });
  }

  selectedLineBlock() {
    const e = this.editor?.nativeElement;
    const text = this.workspace.text();

    if (!e) return null;

    const start = text.lastIndexOf('\n', Math.max(0, e.selectionStart - 1)) + 1;
    const newline = text.indexOf('\n', e.selectionEnd);
    const end = newline < 0 ? text.length : newline;

    return { start, end, text: text.slice(start, end) };
  }

  indentSelection() {
    const e = this.editor?.nativeElement;
    const block = this.selectedLineBlock();

    if (!e || !block) return;

    const indent = ' '.repeat(Math.max(1, this.options.indent));
    const changed = block.text.split('\n').map((line) => indent + line).join('\n');

    this.workspace.set(
      this.workspace.text().slice(0, block.start) +
      changed +
      this.workspace.text().slice(block.end)
    );

    setTimeout(() => {
      e.focus();
      e.setSelectionRange(block.start, block.start + changed.length);
    });
  }

  outdentSelection() {
    const e = this.editor?.nativeElement;
    const block = this.selectedLineBlock();

    if (!e || !block) return;

    const size = Math.max(1, this.options.indent);
    const pattern = new RegExp(`^(?:\\t| {1,${size}})`);
    const changed = block.text.split('\n').map((line) => line.replace(pattern, '')).join('\n');

    this.workspace.set(
      this.workspace.text().slice(0, block.start) +
      changed +
      this.workspace.text().slice(block.end)
    );

    setTimeout(() => {
      e.focus();
      e.setSelectionRange(block.start, block.start + changed.length);
    });
  }

  moveLine(direction: -1 | 1) {
    const e = this.editor?.nativeElement;
    if (!e) return;

    const text = this.workspace.text();
    const lines = text.split('\n');
    const beforeStart = text.slice(0, e.selectionStart);
    const beforeEnd = text.slice(0, e.selectionEnd);

    let startLine = beforeStart.split('\n').length - 1;
    let endLine = beforeEnd.split('\n').length - 1;

    if (e.selectionEnd > e.selectionStart && text[e.selectionEnd - 1] === '\n') endLine--;

    if (direction < 0 && startLine === 0) return;
    if (direction > 0 && endLine >= lines.length - 1) return;

    const selected = lines.splice(startLine, endLine - startLine + 1);

    if (direction < 0) {
      const previous = lines.splice(startLine - 1, 1);
      lines.splice(startLine - 1, 0, ...selected, ...previous);
      startLine--;
    } else {
      const next = lines.splice(startLine, 1);
      lines.splice(startLine, 0, ...next, ...selected);
      startLine++;
    }

    const nextText = lines.join('\n');
    this.workspace.set(nextText);

    let start = 0;
    for (let i = 0; i < startLine; i++) start += lines[i].length + 1;

    const length = selected.join('\n').length;

    setTimeout(() => {
      e.focus();
      e.setSelectionRange(start, start + length);
    });
  }

  openCommandPalette() {
    this.commandOpen.set(true);
    this.commandQuery.set('');
    this.commandIndex.set(0);

    setTimeout(() => document.getElementById('commandInput')?.focus());
  }

  commandQueryChanged(value: string) {
    this.commandQuery.set(value);
    this.commandIndex.set(0);
  }

  async executeCommandItem(id: string) {
    this.commandOpen.set(false);
    this.commandQuery.set('');
    this.commandIndex.set(0);

    if (id.startsWith('tool.')) {
      await this.run(id.slice(5));
      return;
    }

    switch (id) {
      case 'editor.selectAll':
        this.selectAllEditor();
        break;
      case 'editor.selectLine':
        this.selectCurrentLine();
        break;
      case 'editor.duplicateLine':
        this.duplicateLineOrSelection();
        break;
      case 'editor.deleteLine':
        this.deleteLineOrSelection();
        break;
      case 'editor.moveLineUp':
        this.moveLine(-1);
        break;
      case 'editor.moveLineDown':
        this.moveLine(1);
        break;
      case 'editor.indent':
        this.indentSelection();
        break;
      case 'editor.outdent':
        this.outdentSelection();
        break;
      case 'editor.find':
        this.focusFind();
        break;
      case 'editor.gotoLine':
        this.focusGotoLine();
        break;
    }
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

