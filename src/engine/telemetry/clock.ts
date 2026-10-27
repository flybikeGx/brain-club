/** Injected monotonic time makes pause/resume and timing testable without wall-clock changes. */
export class ActiveClock {
  private accumulated = 0;
  private started: number | null = null;
  constructor(
    private now: () => number = () => performance.now(),
    elapsed = 0,
  ) {
    this.accumulated = elapsed;
  }
  start() {
    if (this.started === null) this.started = this.now();
  }
  pause() {
    if (this.started !== null) {
      this.accumulated += Math.max(0, this.now() - this.started);
      this.started = null;
    }
  }
  elapsed() {
    return this.accumulated + (this.started === null ? 0 : Math.max(0, this.now() - this.started));
  }
  get running() {
    return this.started !== null;
  }
}
