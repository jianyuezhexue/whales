class AuiCalendar extends HTMLElement {
  constructor() {
    super();
    this._data = [];
    this._year = new Date().getFullYear();
    this._month = new Date().getMonth();
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
    const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });
    const year = this._year;
    const month = this._month;

    // Build event map by date
    const eventMap = {};
    (data || []).forEach(item => {
      if (item.date) {
        if (!eventMap[item.date]) eventMap[item.date] = [];
        eventMap[item.date].push(item);
      }
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells += '<div class="cal-cell cal-empty"></div>';
    }
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = eventMap[dateStr] || [];
      const isToday = dateStr === todayStr;
      const dayClass = isToday ? 'cal-day cal-today' : 'cal-day';

      const dots = events.map(e =>
        `<div class="cal-dot" style="background:${e.color || '#6366f1'}"></div>`
      ).join('');
      const tooltip = events.map(e => e.title).join(', ');

      cells += `<div class="${dayClass}" title="${tooltip}">
        <span class="cal-num">${d}</span>
        <div class="cal-dots">${dots}</div>
      </div>`;
    }

    shadow.innerHTML = `<style>
      :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .cal-container { max-width: 400px; }
      .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .cal-title { font-size: 16px; font-weight: 600; color: #1f1f1f; }
      .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
      .cal-weekday { text-align: center; font-size: 11px; color: #9ca3af; padding: 4px 0; }
      .cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; cursor: default; position: relative; }
      .cal-empty { background: transparent; }
      .cal-day { background: #fff; }
      .cal-day:hover { background: #f3f4f6; }
      .cal-today { background: #eff6ff; }
      .cal-num { font-size: 13px; color: #1f1f1f; }
      .cal-today .cal-num { font-weight: 700; color: #2563eb; }
      .cal-dots { display: flex; gap: 2px; margin-top: 2px; min-height: 6px; }
      .cal-dot { width: 5px; height: 5px; border-radius: 50%; }
      .cal-nav { display: flex; gap: 4px; }
      .cal-nav-btn { width: 28px; height: 28px; border: 1px solid #e5e7eb; border-radius: 4px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px; }
      .cal-nav-btn:hover { background: #f3f4f6; }
    </style>
    <div class="cal-container">
      <div class="cal-header">
        <span class="cal-title">${year}年 ${monthNames[month]}</span>
        <div class="cal-nav">
          <button class="cal-nav-btn" data-action="prev">◀</button>
          <button class="cal-nav-btn" data-action="next">▶</button>
        </div>
      </div>
      <div class="cal-grid">
        ${weekDays.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;

    // Navigation buttons
    shadow.querySelectorAll('.cal-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'prev') {
          this._month--;
          if (this._month < 0) { this._month = 11; this._year--; }
        } else {
          this._month++;
          if (this._month > 11) { this._month = 0; this._year++; }
        }
        this.render();
      });
    });
  }
}

customElements.define('aui-calendar', AuiCalendar);