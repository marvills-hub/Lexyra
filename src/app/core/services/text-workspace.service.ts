import { Injectable, computed, signal } from '@angular/core';
import { TextEngine } from '../engine/text-engine';

@Injectable({ providedIn: 'root' })
export class TextWorkspaceService {
  text = signal(localStorage.getItem('lexyra.text') ?? '');
  history = signal<string[]>([]);
  future = signal<string[]>([]);
  stats = computed(() => TextEngine.stats(this.text()));
  set(value: string, remember = true) {
    if (value === this.text()) return;
    if (remember) {
      this.history.set([...this.history(), this.text()].slice(-80));
      this.future.set([]);
    }
    this.text.set(value);
    localStorage.setItem('lexyra.text', value);
  }
  undo() {
    const h = this.history();
    if (!h.length) return;
    const v = h[h.length - 1];
    this.future.set([this.text(), ...this.future()]);
    this.history.set(h.slice(0, -1));
    this.text.set(v);
    localStorage.setItem('lexyra.text', v);
  }
  redo() {
    const f = this.future();
    if (!f.length) return;
    this.history.set([...this.history(), this.text()]);
    this.text.set(f[0]);
    this.future.set(f.slice(1));
    localStorage.setItem('lexyra.text', f[0]);
  }
  clear() {
    this.set('');
  }
}
