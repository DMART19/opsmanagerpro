/** Generic undo/redo stack shared by both builders. */
export class HistoryStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  constructor(private limit = 50) {}

  /** Record the state *before* a mutation. */
  push(snapshot: T) {
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: T): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(current);
    return prev;
  }

  redo(current: T): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(current);
    return next;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  reset() { this.past = []; this.future = []; }
}
