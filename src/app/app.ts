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
import { ToolCategoryItem } from './core/models/text-tool.model';

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
  dark = signal(localStorage.getItem('lexyra.theme') !== 'light');
  copied = signal(false);
  resultCopied = signal(false);
  saved = signal(true);
  findText = '';
  replaceText = '';
  visibleTools = computed(() => {
    const c = this.category(),
      q = this.search().trim().toLowerCase();
    return this.tools.filter(
      (t) =>
        (c === 'all' || t.category === c) &&
        (!q || `${t.name} ${t.description}`.toLowerCase().includes(q)),
    );
  });
  constructor(public workspace: TextWorkspaceService) {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }
  ngAfterViewChecked() {
    createIcons({ icons });
  }
  @HostListener('document:keydown', ['$event'])
  keydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.workspace.undo();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
    ) {
      e.preventDefault();
      this.workspace.redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('toolSearch')?.focus();
    }
    if (e.key === 'Escape') {
      this.resultOpen.set(false);
      this.activeTypingTool.set(null);
    }
  }
  selectCategory(id: ToolCategoryItem['id']) {
    this.category.set(id);
    this.search.set('');
  }
  update(v: string) {
    const active = this.activeTypingTool();
    if (active) {
      const old = this.workspace.text();
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
        const transformed = this.applyTransform(active, inserted);
        if (transformed !== null) {
          v = v.slice(0, prefix) + transformed + v.slice(v.length - suffix);
          const nextCaret = prefix + transformed.length;
          setTimeout(() => {
            const editor = this.editor?.nativeElement;
            editor?.focus();
            editor?.setSelectionRange(nextCaret, nextCaret);
          });
        }
      }
    }
    this.saved.set(false);
    this.workspace.set(v, false);
    setTimeout(() => this.saved.set(true), 250);
  }
  source() {
    const e = this.editor?.nativeElement,
      t = this.workspace.text();
    if (e && e.selectionStart !== e.selectionEnd)
      return {
        text: t.slice(e.selectionStart, e.selectionEnd),
        start: e.selectionStart,
        end: e.selectionEnd,
        selected: true,
      };
    return { text: t, start: 0, end: t.length, selected: false };
  }
  applyTransform(id: string, value: string): string | null {
    const ops: Record<string, (x: string) => string> = {
      upper: TextEngine.upper,
      lower: TextEngine.lower,
      title: TextEngine.title,
      sentence: TextEngine.sentence,
      camel: TextEngine.camel.bind(TextEngine),
      pascal: TextEngine.pascal.bind(TextEngine),
      snake: TextEngine.snake.bind(TextEngine),
      kebab: TextEngine.kebab.bind(TextEngine),
      constant: TextEngine.constant.bind(TextEngine),
      dot: TextEngine.dot.bind(TextEngine),
      path: TextEngine.path.bind(TextEngine),
      slug: TextEngine.slug.bind(TextEngine),
      trim: TextEngine.trim,
      spaces: TextEngine.cleanSpaces,
      empty: TextEngine.removeEmptyLines,
      duplicates: TextEngine.removeDuplicateLines,
      uniqueWords: TextEngine.uniqueWords.bind(TextEngine),
      diacritics: TextEngine.removeDiacritics,
      unicode: TextEngine.normalizeUnicode,
      removeHtml: TextEngine.removeHtml,
      sortAsc: TextEngine.sortAsc,
      sortDesc: TextEngine.sortDesc.bind(TextEngine),
      reverseLines: TextEngine.reverseLines,
      reverseText: TextEngine.reverseText,
      shuffleLines: TextEngine.shuffleLines,
      number: TextEngine.numberLines,
      removeNumbers: TextEngine.removeLineNumbers,
      bullets: TextEngine.bullets,
      joinLines: TextEngine.joinLines,
      tabsSpaces: TextEngine.tabsToSpaces,
      spacesTabs: TextEngine.spacesToTabs,
      urlEncode: TextEngine.urlEncode,
      urlDecode: TextEngine.urlDecode,
      base64Encode: TextEngine.base64Encode,
      base64Decode: TextEngine.base64Decode,
      htmlEncode: TextEngine.htmlEncode,
      htmlDecode: TextEngine.htmlDecode,
      rot13: TextEngine.rot13,
      textBinary: TextEngine.textToBinary,
      binaryText: TextEngine.binaryToText,
      textHex: TextEngine.textToHex,
      hexText: TextEngine.hexToText,
      jsonPretty: TextEngine.jsonPretty,
      jsonMinify: TextEngine.jsonMinify,
      csvJson: TextEngine.csvToJson.bind(TextEngine),
      jsonCsv: TextEngine.jsonToCsv.bind(TextEngine),
      escapeJs: TextEngine.escapeJs,
      unescapeJs: TextEngine.unescapeJs,
    };
    const fn = ops[id];
    return fn ? fn(value) : null;
  }

  async run(id: string) {
    const tool = this.tools.find((t) => t.id === id);
    if (!tool) return;

    const src = this.source();

    if (tool.behavior === 'transform' && !src.selected) {
      this.activeTypingTool.update((current) => (current === id ? null : id));
      setTimeout(() => this.editor?.nativeElement.focus());
      return;
    }

    let output = src.text;

    if (id === 'sha256') {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src.text));
      output = [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
    } else if (tool.behavior === 'result') {
      const resultOps: Record<string, (x: string) => string> = {
        jsonValidate: TextEngine.jsonValidate,
        emails: TextEngine.extractEmails,
        urls: TextEngine.extractUrls,
        numbersOnly: TextEngine.extractNumbers,
        hashtags: TextEngine.extractHashtags,
        frequency: TextEngine.wordFrequency.bind(TextEngine),
        lineLength: TextEngine.lineLength,
        password: () => TextEngine.password(),
        passphrase: () => TextEngine.passphrase(),
        uuid: () => TextEngine.uuid(),
        random: () => TextEngine.randomString(),
        lorem: () => TextEngine.lorem(),
        timestamp: () => TextEngine.timestamp(),
      };
      const fn = resultOps[id];
      if (!fn) return;
      output = fn(src.text);
    } else {
      const transformed = this.applyTransform(id, src.text);
      if (transformed === null) return;
      output = transformed;
    }

    if (tool.behavior === 'result') {
      this.resultTitle.set(tool.name);
      this.result.set(output);
      this.resultOpen.set(true);
      return;
    }

    const current = this.workspace.text();

    if (src.selected) {
      this.workspace.set(current.slice(0, src.start) + output + current.slice(src.end));
      this.activeTypingTool.set(null);

      setTimeout(() => {
        const editor = this.editor?.nativeElement;
        editor?.focus();
        editor?.setSelectionRange(src.start, src.start + output.length);
      });
    }
  }

  replace() {
    if (this.findText)
      this.workspace.set(this.workspace.text().split(this.findText).join(this.replaceText));
  }
  insertResult() {
    const e = this.editor?.nativeElement;
    const current = this.workspace.text();
    if (!e) {
      this.workspace.set(current + this.result());
      return;
    }
    const start = e.selectionStart,
      end = e.selectionEnd;
    const spacer = current && start === current.length && !current.endsWith('\n') ? '\n' : '';
    const value = current.slice(0, start) + spacer + this.result() + current.slice(end);
    this.workspace.set(value);
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
    const b = new Blob([this.workspace.text()], { type: 'text/plain;charset=utf-8' }),
      u = URL.createObjectURL(b),
      a = document.createElement('a');
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
