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
      const h = [...this.history(), this.text()];
      this.history.set(h.slice(-50));
      this.future.set([]);
    }
    this.text.set(value);
    localStorage.setItem('lexyra.text', value);
  }
  undo() {
    const h = this.history();
    if (!h.length) return;
    const previous = h[h.length - 1];
    this.future.set([this.text(), ...this.future()]);
    this.history.set(h.slice(0, -1));
    this.text.set(previous);
    localStorage.setItem('lexyra.text', previous);
  }
  redo() {
    const f = this.future();
    if (!f.length) return;
    this.history.set([...this.history(), this.text()]);
    const next = f[0];
    this.future.set(f.slice(1));
    this.text.set(next);
    localStorage.setItem('lexyra.text', next);
  }
  clear() {
    this.set('');
  }
}
