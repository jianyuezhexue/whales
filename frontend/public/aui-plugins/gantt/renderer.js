class AuiGantt extends HTMLElement {
  constructor() {
    super();
    this._data = [];
    this.attachShadow({ mode: "open" });
  }

  set data(val) {
    this._data = Array.isArray(val) ? val : [];
    this.render();
  }

  get data() {
    return this._data;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const tasks = this._data;
    if (!tasks.length) {
      this.shadowRoot.innerHTML = `<style>@import "/aui-plugins/gantt/renderer.css";</style><div class="gantt-empty">暂无数据</div>`;
      return;
    }

    const dates = tasks.flatMap((t) =>
      [t.startDate, t.endDate].map((d) => new Date(d))
    );
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const totalDays = Math.max((maxDate - minDate) / (1000 * 60 * 60 * 24), 1);
    const months = this.buildMonths(minDate, maxDate);

    const today = new Date();
    const todayOffset = Math.max(0, (today - minDate) / (1000 * 60 * 60 * 24));
    const showTodayLine = today >= minDate && today <= maxDate;

    const rows = tasks
      .map((t, i) => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        const startOffset = (start - minDate) / (1000 * 60 * 60 * 24);
        const duration = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
        const leftPct = (startOffset / totalDays) * 100;
        const widthPct = (duration / totalDays) * 100;
        const progress = Math.min(Math.max(t.progress ?? 0, 0), 100);
        const color = t.color || this.defaultColor(i);
        return { ...t, leftPct, widthPct, progress, color, index: i };
      })
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

    const sidebarWidth = 160;
    const barAreaLeft = sidebarWidth + 1;

    this.shadowRoot.innerHTML = `
      <style>@import "/aui-plugins/gantt/renderer.css";</style>
      <div class="gantt-root">
        <div class="gantt-header">
          <div class="gantt-header-sidebar">任务</div>
          <div class="gantt-header-timeline">
            ${months
              .map(
                (m) =>
                  `<div class="gantt-month" style="flex:${m.days}">${m.label}</div>`
              )
              .join("")}
          </div>
        </div>
        <div class="gantt-body">
          <div class="gantt-rows">
            ${rows
              .map(
                (t) => `
              <div class="gantt-row">
                <div class="gantt-row-label" style="width:${sidebarWidth}px" title="${
                  t.title
                }">
                  <span class="gantt-dot" style="background:${t.color}"></span>
                  ${t.title}
                </div>
                <div class="gantt-row-bars" style="left:${barAreaLeft}px">
                  ${
                    showTodayLine
                      ? `<div class="gantt-today-line" style="left:${
                          (todayOffset / totalDays) * 100
                        }%"></div>`
                      : ""
                  }
                  <div class="gantt-bar" style="left:${t.leftPct}%;width:${
                  t.widthPct
                }%;background:${t.color}">
                    <div class="gantt-bar-fill" style="width:${
                      t.progress
                    }%;background:${this.darken(t.color, 0.2)}"></div>
                  </div>
                </div>
              </div>`
              )
              .join("")}
          </div>
        </div>
        <div class="gantt-legend">
          ${rows
            .map(
              (t) =>
                `<div class="gantt-legend-item"><span class="gantt-dot" style="background:${t.color}"></span>${t.title} (${t.progress}%)</div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  buildMonths(min, max) {
    const months = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    while (cursor <= max) {
      const label = `${cursor.getFullYear()}-${String(
        cursor.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const rangeStart = cursor > min ? cursor : min;
      const rangeEnd = monthEnd < max ? monthEnd : max;
      const days = Math.max(
        (rangeEnd - rangeStart) / (1000 * 60 * 60 * 24) + 1,
        1
      );
      months.push({ label, days });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  defaultColor(i) {
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#0ea5e9",
      "#14b8a6",
      "#f59e0b",
      "#ef4444",
      "#ec4899",
    ];
    return colors[i % colors.length];
  }

  darken(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
}

if (!customElements.get("aui-gantt")) {
  customElements.define("aui-gantt", AuiGantt);
}
