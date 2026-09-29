import { AfterViewChecked, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { createIcons, icons } from 'lucide';
import { TextWorkspaceService } from './core/services/text-workspace.service';
import { TextEngine } from './core/engine/text-engine';
import { TEXT_TOOLS } from './shared/constants/tools';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewChecked {
  tools = TEXT_TOOLS;
  query = signal('');
  category = signal('all');
  dark = signal(localStorage.getItem('lexyra.theme') !== 'light');
  copied = signal(false);
  findText = '';
  replaceText = '';
  sidebarOpen = signal(true);
  filteredTools = computed(() => {
    const q = this.query().toLowerCase().trim();
    const cat = this.category();
    return this.tools.filter(
      (t) =>
        (cat === 'all' || t.category === cat) &&
        (!q || `${t.name} ${t.description}`.toLowerCase().includes(q)),
    );
  });
  constructor(public workspace: TextWorkspaceService) {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }

  ngAfterViewChecked() {
    createIcons({ icons });
  }
  update(value: string) {
    this.workspace.set(value, false);
  }
  apply(id: string) {
    const text = this.workspace.text();
    const operations: Record<string, (v: string) => string> = {
      upper: TextEngine.upper,
      lower: TextEngine.lower,
      title: TextEngine.title,
      sentence: TextEngine.sentence,
      camel: TextEngine.camel.bind(TextEngine),
      pascal: TextEngine.pascal.bind(TextEngine),
      snake: TextEngine.snake.bind(TextEngine),
      kebab: TextEngine.kebab.bind(TextEngine),
      constant: TextEngine.constant.bind(TextEngine),
      trim: TextEngine.trim,
      spaces: TextEngine.cleanSpaces,
      empty: TextEngine.removeEmptyLines,
      duplicates: TextEngine.removeDuplicateLines,
      sortAsc: TextEngine.sortAsc,
      sortDesc: TextEngine.sortDesc.bind(TextEngine),
      reverseLines: TextEngine.reverseLines,
      reverseText: TextEngine.reverseText,
      number: TextEngine.numberLines,
      urlEncode: TextEngine.urlEncode,
      urlDecode: TextEngine.urlDecode,
      base64Encode: TextEngine.base64Encode,
      base64Decode: TextEngine.base64Decode,
      htmlEncode: TextEngine.htmlEncode,
      htmlDecode: TextEngine.htmlDecode,
      jsonPretty: TextEngine.jsonPretty,
      jsonMinify: TextEngine.jsonMinify,
    };
    const fn = operations[id];
    if (fn) this.workspace.set(fn(text));
  }
  replace() {
    if (!this.findText) return;
    this.workspace.set(this.workspace.text().split(this.findText).join(this.replaceText));
  }
  async copy() {
    await navigator.clipboard.writeText(this.workspace.text());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1200);
  }
  download() {
    const blob = new Blob([this.workspace.text()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lexyra-text.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
  toggleTheme() {
    this.dark.update((v) => !v);
    const theme = this.dark() ? 'dark' : 'light';
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('lexyra.theme', theme);
  }
}
