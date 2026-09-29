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
  menu = signal<string | null>(null);
  toolsOpen = signal(false);
  aiOpen = signal(false);
  query = signal('');
  category = signal('all');
  dark = signal(localStorage.getItem('lexyra.theme') !== 'light');
  copied = signal(false);
  saved = signal(true);
  findText = '';
  replaceText = '';
  selectedStart = 0;
  selectedEnd = 0;
  filteredTools = computed(() => {
    const q = this.query().trim().toLowerCase();
    const c = this.category();
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.openTools();
    }
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
    if (e.key === 'Escape') {
      this.closePanels();
    }
  }
  update(value: string) {
    this.saved.set(false);
    this.workspace.set(value, false);
    setTimeout(() => this.saved.set(true), 300);
  }
  captureSelection() {
    const e = this.editor?.nativeElement;
    if (e) {
      this.selectedStart = e.selectionStart;
      this.selectedEnd = e.selectionEnd;
    }
  }
  async execute(id: string) {
    const full = this.workspace.text();
    const e = this.editor?.nativeElement;
    const hasSelection = !!e && e.selectionStart !== e.selectionEnd;
    const source = hasSelection ? full.slice(e!.selectionStart, e!.selectionEnd) : full;
    let result = source;
    const op: Record<string, (x: string) => string> = {
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
      jsonValidate: TextEngine.jsonValidate,
      csvJson: TextEngine.csvToJson.bind(TextEngine),
      jsonCsv: TextEngine.jsonToCsv.bind(TextEngine),
      escapeJs: TextEngine.escapeJs,
      unescapeJs: TextEngine.unescapeJs,
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
    if (id === 'sha256') {
      const bytes = new TextEncoder().encode(source);
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      result = [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
    } else {
      const fn = op[id];
      if (!fn) return;
      result = fn(source);
    }
    if (hasSelection) {
      const start = e!.selectionStart,
        end = e!.selectionEnd;
      this.workspace.set(full.slice(0, start) + result + full.slice(end));
      setTimeout(() => {
        e!.focus();
        e!.setSelectionRange(start, start + result.length);
      }, 0);
    } else this.workspace.set(result);
  }
  quick(id: string) {
    this.execute(id);
    this.menu.set(null);
  }
  replace() {
    if (this.findText)
      this.workspace.set(this.workspace.text().split(this.findText).join(this.replaceText));
  }
  openTools(category = 'all') {
    this.category.set(category);
    this.query.set('');
    this.toolsOpen.set(true);
    this.aiOpen.set(false);
    this.menu.set(null);
  }
  closePanels() {
    this.toolsOpen.set(false);
    this.aiOpen.set(false);
    this.menu.set(null);
  }
  toggleMenu(name: string) {
    this.menu.set(this.menu() === name ? null : name);
  }
  async copy() {
    await navigator.clipboard.writeText(this.workspace.text());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1200);
  }
  importFile(input: HTMLInputElement) {
    input.click();
  }
  loadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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
