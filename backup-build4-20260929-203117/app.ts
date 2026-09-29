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
        const inserted = v.slice(prefix, v.length - suffix),
          transformed = TextEngine.transform(active, inserted);
        if (transformed !== null) {
          v = v.slice(0, prefix) + transformed + v.slice(v.length - suffix);
          const caret = prefix + transformed.length;
          setTimeout(() => {
            const e = this.editor?.nativeElement;
            e?.focus();
            e?.setSelectionRange(caret, caret);
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
  async digest(algorithm: string, text: string) {
    const hash = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
    return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
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
    let output: string | null = null;
    if (id === 'sha256') output = await this.digest('SHA-256', src.text);
    else if (id === 'sha1') output = await this.digest('SHA-1', src.text);
    else if (id === 'sha384') output = await this.digest('SHA-384', src.text);
    else if (id === 'sha512') output = await this.digest('SHA-512', src.text);
    else if (tool.behavior === 'result') output = TextEngine.result(id, src.text);
    else output = TextEngine.transform(id, src.text);
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
      this.activeTypingTool.set(null);
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
      end = e.selectionEnd,
      spacer = current && start === current.length && !current.endsWith('\n') ? '\n' : '';
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
