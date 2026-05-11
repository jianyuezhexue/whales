class AuiGantt extends HTMLElement {
  constructor() {
    super();
    this._data = [];
  }

  set data(val) {
    this._data = val || [];
    this.render();
  }

  get data() {
    return this._data;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const data = this._data;
    if (!data || data.length === 0) {
      this.innerHTML = '<div style="padding:32px;text-align:center;color:#9ca3af;">暂无甘特图数据</div>';
      return;
    }

    const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });

    // Parse dates and find range
    let minDate = Infinity, maxDate = -Infinity;
    const items = data.map(item => {
      const start = new Date(item.startDate).getTime();
      const end = new Date(item.endDate).getTime();
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
      return { ...item, _start: start, _end: end };
    });
    const range = maxDate - minDate || 1;
    const dayMs = 86400000;

    // Build header dates
    const days = Math.ceil(range / dayMs) + 1;
    const headerDates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(minDate + i * dayMs);
      headerDates.push((d.getMonth() + 1) + '/' + d.getDate());
    }

    const rows = items.map(item => {
      const left = ((item._start - minDate) / range * 100).toFixed(1);
      const width = ((item._end - item._start) / range * 100).toFixed(1);
      const progress = item.progress || 0;
      const color = item.color || '#6366f1';
      const progressWidth = (progress / 100 * parseFloat(width)).toFixed(1);
      return `<div class="gantt-row">
        <div class="gantt-label">${item.title}</div>
        <div class="gantt-bar-track">
          <div class="gantt-bar" style="left:${left}%;width:${width}%;background:${color}22;border:1px solid ${color};">
            <div class="gantt-bar-progress" style="width:${progressWidth > 0 ? progress + '%' : '0'};background:${color};"></div>
          </div>
        </div>
      </div>`;
    }).join('');

    const headerCells = headerDates.slice(0, Math.min(days, 30)).map(d =>
      `<div class="gantt-date-cell">${d}</div>`
    ).join('');

    shadow.innerHTML = `<style>
      :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .gantt-container { padding: 8px 0; }
      .gantt-header { display: flex; margin-bottom: 4px; }
      .gantt-label-col { width: 120px; flex-shrink: 0; }
      .gantt-dates { display: flex; flex: 1; }
      .gantt-date-cell { flex: 1; text-align: center; font-size: 11px; color: #9ca3af; min-width: 30px; }
      .gantt-row { display: flex; align-items: center; margin-bottom: 6px; }
      .gantt-label { width: 120px; flex-shrink: 0; font-size: 13px; color: #1f1f1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gantt-bar-track { flex: 1; height: 28px; position: relative; background: #f9fafb; border-radius: 4px; }
      .gantt-bar { position: absolute; height: 100%; border-radius: 4px; min-width: 4px; }
      .gantt-bar-progress { position: absolute; top: 0; left: 0; height: 100%; border-radius: 4px 0 0 4px; min-width: 0; }
    </style>
    <div class="gantt-container">
      <div class="gantt-header">
        <div class="gantt-label-col"></div>
        <div class="gantt-dates">${headerCells}</div>
      </div>
      ${rows}
    </div>`;
  }
}

customElements.define('aui-gantt', AuiGantt);