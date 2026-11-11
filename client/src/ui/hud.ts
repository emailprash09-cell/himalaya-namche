// Minimal M1 HUD: centre dot (first person), a fading controls hint, F3 stats, data credits.

export class Hud {
  private readonly root: HTMLDivElement;
  private readonly dot: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly stats: HTMLDivElement;
  private readonly start: HTMLDivElement;
  private readonly loading: HTMLDivElement;
  statsVisible = false;
  private hintTimer = 0;

  constructor() {
    const el = (cls: string, text = '') => {
      const d = document.createElement('div');
      d.className = cls; d.textContent = text;
      return d;
    };
    this.root = el('hud');
    this.dot = el('dot');
    this.hint = el('hint', 'WASD move · Shift sprint · Space jump · V camera');
    this.stats = el('stats');
    this.stats.style.display = 'none';
    this.start = el('start', 'Click to look around');
    this.loading = el('loading', 'Loading Namche…');
    const credit = el('credit', '© OpenStreetMap contributors (ODbL) · Elevation: Copernicus DEM GLO-30, © DLR e.V. and Airbus DS, provided under COPERNICUS by the EU and ESA');
    this.root.append(this.dot, this.hint, this.start, this.stats, credit, this.loading);
    document.body.appendChild(this.root);
  }

  ready(): void {
    this.loading.classList.add('gone');
    setTimeout(() => this.loading.remove(), 700);
  }

  update(dt: number, mode: 'fpp' | 'tpp', locked: boolean): void {
    this.dot.style.display = mode === 'fpp' ? 'block' : 'none';
    this.start.style.display = locked ? 'none' : 'block';
    this.hintTimer += dt;
    if (this.hintTimer > 9) this.hint.classList.add('gone');
  }

  toggleStats(): void {
    this.statsVisible = !this.statsVisible;
    this.stats.style.display = this.statsVisible ? 'block' : 'none';
  }

  setStats(text: string): void {
    if (this.statsVisible) this.stats.textContent = text;
  }

  /** For screenshots: hide the start prompt and the hint at once. */
  quiet(): void {
    this.hint.classList.add('gone');
    this.hint.style.transition = 'none';
    this.start.style.visibility = 'hidden';
  }
}
