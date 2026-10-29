(() => {
  'use strict';
  const MONTHS = [
    { name: 'January', short: 'JAN', color: '#42e6df' },
    { name: 'February', short: 'FEB', color: '#72ff73' },
    { name: 'March', short: 'MAR', color: '#ff5873' },
    { name: 'April', short: 'APR', color: '#ff9a62' },
    { name: 'May', short: 'MAY', color: '#f0e85b' },
    { name: 'June', short: 'JUN', color: '#8f63ff' },
    { name: 'July', short: 'JUL', color: '#d65bff' },
    { name: 'August', short: 'AUG', color: '#c84cff' },
    { name: 'September', short: 'SEP', color: '#f2bf79' },
    { name: 'October', short: 'OCT', color: '#87aaff' },
    { name: 'November', short: 'NOV', color: '#68e3bf' },
    { name: 'December', short: 'DEC', color: '#ff8348' }
  ];
  const DATES = window.BIRTHDAYS || [];
  const BY_CODE = new Map(DATES.map(date => [date.code, date]));
  const BY_POSITION = [...DATES].sort((a, b) => a.position - b.position);
  const BY_CALENDAR = [...DATES].sort((a, b) => a.month - b.month || a.day - b.day);
  const FIRST = BY_POSITION[0];
  const LAST = BY_POSITION[BY_POSITION.length - 1];
  const MAX_POSITION = Math.max(...DATES.map(d => d.position));
  const format = n => Number(n).toLocaleString('en-US');
  const pad = n => String(n).padStart(2, '0');
  const dateCode = (month, day) => `${pad(month)}${pad(day)}`;
  const longDate = date => `${MONTHS[date.month - 1].name} ${date.day}`;
  const dateFromInput = value => {
    const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    return BY_CODE.get(`${match[1]}${match[2]}`) || null;
  };

  let currentView = 'overview';
  let selectedCode = '0213';
  let activeMonth = null;
  let chartOrder = 'calendar';
  let rankingQuery = '';
  let rankingSort = 'position';
  let chartAnimation = 0;
  let visualMode = 'digits';
  let visualChartOrder = 'calendar';
  let visualChartAnimation = 0;
  let visualSweepRank = 366;
  let visualSweepTimer = null;
  const root = document.getElementById('view-content');
  const tooltip = document.getElementById('chart-tooltip');
  const selectedDate = () => BY_CODE.get(selectedCode) || BY_CODE.get('0213') || DATES[0];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function monthFilters() {
    return `<div class="month-filters" role="group" aria-label="Filter dates by month">
      <button class="month-chip ${activeMonth === null ? 'active' : ''}" type="button" data-month-filter="all" style="--month-color:#c9f66f"><span class="color-dot"></span>All</button>
      ${MONTHS.map((month, index) => `<button class="month-chip ${activeMonth === index + 1 ? 'active' : ''}" type="button" data-month-filter="${index + 1}" style="--month-color:${month.color}" aria-pressed="${activeMonth === index + 1}"><span class="color-dot"></span>${month.short}</button>`).join('')}
    </div>`;
  }
  function heading(eyebrow, title, copy, side = '') {
    return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${copy}</p></div>${side}</div>`;
  }
  function statsMarkup() {
    return `<div class="stats-row">
      <article class="stat-card" style="--stat-color:#c9f66f"><div class="stat-label">Dates in the index</div><div class="stat-number">${DATES.length}</div><div class="stat-note">Including leap day</div></article>
      <article class="stat-card" style="--stat-color:${FIRST.color}"><div class="stat-label">Earliest match</div><div class="stat-number">${format(FIRST.position)}</div><div class="stat-note">Digit position · ${FIRST.label}</div></article>
      <article class="stat-card" style="--stat-color:#8f8cff"><div class="stat-label">Latest first match</div><div class="stat-number">${format(LAST.position)}</div><div class="stat-note">Digit position · ${LAST.label}</div></article>
      <article class="stat-card" style="--stat-color:#42e6df"><div class="stat-label">Pattern length</div><div class="stat-number">4 digits</div><div class="stat-note">Month followed by day</div></article>
    </div>`;
  }
  function selectedCardMarkup(compact = false) {
    const date = selectedDate();
    const percentile = Math.round(((DATES.length - date.rank) / (DATES.length - 1)) * 100);
    return `<div class="selected-card" style="--selected-color:${date.color}">
      <div class="selected-top"><div><div class="selected-label">Selected birthday</div><h2 class="selected-date">${date.label}</h2><div class="selected-longdate">${longDate(date)}</div></div><div class="selected-rank">RANK #${date.rank}</div></div>
      <div class="selected-position"><div class="selected-label">First appears at digit</div><div class="selected-position-value">${format(date.position)}</div><div class="selected-position-caption">The first occurrence of <strong>${date.code}</strong> after the decimal point of π.</div></div>
      <div class="rank-meter" aria-label="Earlier than ${percentile}% of indexed dates"><div class="rank-meter-fill" style="width:${Math.max(1, percentile)}%"></div></div>
      <div class="meter-labels"><span>EARLIER</span><span>${percentile}% ranked later</span><span>LATER</span></div>
      ${compact ? '' : `<div class="date-jump"><label class="form-label" for="quick-date">Jump to a date</label><form class="date-form" data-date-form><input id="quick-date" aria-label="Choose birthday" type="date" value="2000-${pad(date.month)}-${pad(date.day)}" /><button class="primary-button" type="submit">Find</button></form><p class="date-form-note">Choose any year. The index uses month and day only.</p></div>`}
    </div>`;
  }
  function topListMarkup(limit = 5) {
    return `<div class="top-list">${BY_POSITION.slice(0, limit).map(date => `<button class="top-list-row" type="button" data-code="${date.code}" style="--month-color:${date.color}"><span class="row-rank">${String(date.rank).padStart(2, '0')}</span><span class="row-date-block"><span class="row-date">${date.label}</span><span class="row-code">CODE ${date.code}</span></span><span class="row-position">${format(date.position)}<small>digit position</small></span></button>`).join('')}</div>`;
  }
  function overviewView() {
    const side = `<div class="heading-side-note"><strong>π → MMDD</strong><span>Four-digit date patterns</span></div>`;
    return `${heading('DATE PATTERNS · DATA EXPLORER', 'Every date leaves a trace.', 'Explore where calendar dates first appear in π. Filter by month, compare positions, or jump straight to your birthday.', side)}
      ${statsMarkup()}
      <div class="overview-grid">
        <div class="left-stack">
          <section class="panel chart-panel">
            <div class="panel-header"><div><h2 class="panel-title">First appearances</h2><p class="panel-subtitle">Each bar represents one month/day pattern.</p></div><div class="segmented" role="group" aria-label="Chart order"><button type="button" data-chart-order="calendar" class="${chartOrder === 'calendar' ? 'active' : ''}">Calendar order</button><button type="button" data-chart-order="position" class="${chartOrder === 'position' ? 'active' : ''}">Earliest first</button></div></div>
            <div class="panel-body">${monthFilters()}<div class="chart-wrap"><canvas id="position-chart" aria-label="Bar chart of first occurrence positions for birthday date patterns" role="img"></canvas></div><div class="chart-legend"><span class="legend-key"><i></i>Digit position</span><span class="legend-key"><i style="background:#fff"></i>Selected date</span><span class="legend-right">LOWER POSITION = EARLIER MATCH</span></div></div>
          </section>
          <div class="lower-grid">
            <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Earliest birthdays</h2><p class="panel-subtitle">The first matches found in π.</p></div><button type="button" class="text-action" data-view="rankings">View rankings ↗</button></div>${topListMarkup(5)}</section>
            <section class="panel"><div class="panel-header"><div><h2 class="panel-title">How to read this</h2><p class="panel-subtitle">A quick guide to the index.</p></div></div><div class="insight-body"><div class="insight-block"><div class="insight-metric">MMDD</div><p class="insight-copy">Dates are written month first, then day. February 13 becomes <strong>0213</strong>.</p></div><div class="insight-block"><div class="insight-metric">#${selectedDate().rank}</div><p class="insight-copy">The rank compares the selected date with all 366 dates by first appearance.</p></div></div></section>
          </div>
        </div>
        <aside class="right-stack"><section class="panel">${selectedCardMarkup()}</section><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Explore by month</h2><p class="panel-subtitle">Choose a month to focus the chart.</p></div></div><div class="panel-body">${monthFilters()}<p class="panel-subtitle">Tap a month to isolate its dates. Tap it again to return to all months.</p></div></section></aside>
      </div>`;
  }
  function calendarView() {
    const months = MONTHS.map((month, index) => {
      const monthNumber = index + 1;
      const dates = BY_CALENDAR.filter(date => date.month === monthNumber);
      const offset = new Date(2024, index, 1).getDay();
      const dimmed = activeMonth && activeMonth !== monthNumber ? 'dimmed' : '';
      return `<section class="month-card ${dimmed}" style="--month-color:${month.color}" data-month-card="${monthNumber}"><div class="month-card-header"><span class="month-title">${month.name}</span><span class="month-count">${dates.length} DATES</span></div><div class="days-grid">${Array.from({length: offset}, () => '<span class="day-cell empty"></span>').join('')}${dates.map(date => `<button type="button" class="day-cell ${date.code === selectedCode ? 'selected' : ''} ${date.code === '0229' ? 'leap-day' : ''}" data-code="${date.code}" title="${date.label} · digit ${format(date.position)} · rank #${date.rank}" aria-label="${longDate(date)}, first found at digit ${date.position}">${date.day}</button>`).join('')}</div></section>`;
    }).join('');
    return `${heading('366 DATES · CALENDAR VIEW', 'Find a date by its place.', 'A full-year view of the indexed birthdays. Select any day to see its first position and overall rank.')}
      <section class="panel"><div class="calendar-toolbar"><div>${monthFilters()}</div><div class="calendar-summary">Selected: <strong style="color:${selectedDate().color}">${selectedDate().label}</strong> · digit ${format(selectedDate().position)}</div></div><div class="calendar-grid">${months}</div><div class="calendar-legend"><span><i style="--legend-color:#c9f66f"></i>Selected date</span><span><i style="--legend-color:#8b929b"></i>Outlined day = leap day</span><span>Color groups represent months</span></div></section>`;
  }
  function rankingsRows() {
    let list = rankingSort === 'calendar' ? [...BY_CALENDAR] : rankingSort === 'date' ? [...DATES].sort((a, b) => a.month - b.month || a.day - b.day) : [...BY_POSITION];
    if (activeMonth) list = list.filter(date => date.month === activeMonth);
    const query = rankingQuery.trim().toLowerCase();
    if (query) list = list.filter(date => date.label.toLowerCase().includes(query) || date.code.includes(query) || longDate(date).toLowerCase().includes(query) || String(date.rank) === query || String(date.position).includes(query));
    return list;
  }
  function rowsMarkup() {
    const list = rankingsRows();
    if (!list.length) return '<tr><td colspan="5" class="empty-state">No dates matched that search. Try a month name, date code, rank, or digit position.</td></tr>';
    return list.map(date => `<tr data-code="${date.code}" class="${date.code === selectedCode ? 'selected-row' : ''}" style="--month-color:${date.color}" tabindex="0"><td class="rank-cell">#${date.rank}</td><td><span class="table-date">${date.label}</span></td><td class="table-month">${MONTHS[date.month - 1].name}</td><td class="table-code">${date.code}</td><td class="table-position">${format(date.position)}</td></tr>`).join('');
  }
  function rankingsView() {
    const list = rankingsRows();
    return `${heading('POSITION INDEX · ALL DATES', 'Ranked by first appearance.', 'Browse all indexed dates by their position in π. Search a date, month, code, rank, or digit position.')}
      <div class="rankings-toolbar"><div class="rankings-tools-left"><div class="search-wrap"><span class="search-icon">⌕</span><input class="search-input" id="ranking-search" type="search" placeholder="Search dates or positions…" value="${escapeHtml(rankingQuery)}" aria-label="Search rankings" /></div>${monthFilters()}</div><div class="rankings-tools-right"><label for="ranking-sort" class="form-label" style="margin:0">Sort by</label><select class="select-input" id="ranking-sort"><option value="position" ${rankingSort === 'position' ? 'selected' : ''}>First appearance</option><option value="calendar" ${rankingSort === 'calendar' ? 'selected' : ''}>Calendar order</option><option value="date" ${rankingSort === 'date' ? 'selected' : ''}>Date</option></select></div></div>
      <section class="panel table-panel"><div class="panel-header"><div><h2 class="panel-title">Birthday index</h2><p class="panel-subtitle">Select a row to pin that date across the explorer.</p></div><p class="table-result-count" id="ranking-count">${list.length} DATES</p></div><div class="table-scroll"><table class="ranking-table"><thead><tr><th>RANK</th><th>BIRTHDAY</th><th class="table-month">MONTH</th><th>MMDD</th><th>DIGIT POSITION</th></tr></thead><tbody id="ranking-rows">${rowsMarkup()}</tbody></table></div></section>`;
  }
  function finderView() {
    const date = selectedDate();
    const percentile = Math.round(((DATES.length - date.rank) / (DATES.length - 1)) * 100);
    return `${heading('PERSONAL DATE LOOKUP', 'Where is your birthday?', 'Choose a month and day to find the first matching four-digit sequence in π. The year does not affect the result.')}
      <div class="finder-layout"><section class="panel finder-form-panel"><p class="eyebrow">DATE LOOKUP</p><h2 class="finder-big-title">Search the digits<br>for your date.</h2><p class="finder-copy">Each date is converted to a four-digit code, then compared against the indexed first-appearance positions. Leap day is included.</p><form class="finder-date-form" data-date-form><input id="finder-date" aria-label="Select a birthday" type="date" value="2000-${pad(date.month)}-${pad(date.day)}" /><button class="primary-button" type="submit">Find my date</button></form><p class="finder-helper">Example: February 13 → <strong>0213</strong>. Choose any year from the calendar picker.</p><div class="finder-explainer">The position is counted from the first digit after the decimal point. Rank <strong>#1</strong> means the date pattern appears earlier than every other indexed birthday.</div></section>
      <section class="panel finder-result" id="finder-result" style="--selected-color:${date.color}"><div class="selected-label">Your selected date</div><h2 class="selected-date">${date.label}</h2><div class="selected-longdate">${longDate(date)} · code ${date.code}</div><div class="selected-position"><div class="selected-label">First occurrence in π</div><div class="selected-position-value">${format(date.position)}</div><div class="selected-position-caption">Digit position after the decimal point</div></div><div class="finder-result-stats"><div class="finder-mini-stat"><span>OVERALL RANK</span><strong>#${date.rank} / ${DATES.length}</strong></div><div class="finder-mini-stat"><span>DATES RANKED LATER</span><strong>${percentile}%</strong></div></div><div class="rank-meter"><div class="rank-meter-fill" style="width:${Math.max(1, percentile)}%"></div></div><div class="meter-labels"><span>EARLIER</span><span>LATER</span></div></section></div>`;
  }
  const VISUAL_MODES = [
    { id: 'digits', label: 'Digit match' },
    { id: 'months', label: 'Month columns' },
    { id: 'positions', label: '366 positions' },
    { id: 'sweep', label: 'Ranking sweep' },
    { id: 'top10', label: 'Top 10' }
  ];
  function visualModeTabs() {
    return `<div class="visual-mode-tabs" role="tablist" aria-label="Visualization views">${VISUAL_MODES.map(item => `<button type="button" role="tab" aria-selected="${visualMode === item.id}" class="visual-mode-tab ${visualMode === item.id ? 'active' : ''}" data-visual-mode="${item.id}">${item.label}</button>`).join('')}</div>`;
  }
  function visualizerView() {
    return `${heading('VISUAL EXPLORER · LIVE DATA', 'The whole index, in motion.', 'Move between the original visualization states. Each view is interactive, and the position chart smoothly rearranges the same 366 dates.')}<section class="panel visualizer-panel"><div class="visualizer-toolbar">${visualModeTabs()}<div class="visualizer-meta"><span class="status-dot"></span> ${DATES.length} DATE PATTERNS</div></div><div id="visual-stage" class="visual-stage">${visualModeMarkup()}</div></section>`;
  }
  function visualModeMarkup() {
    if (visualMode === 'digits') {
      const date = selectedDate();
      const digits = window.PI_DIGITS || '';
      const startPos = Math.max(1, date.position - 8);
      const endPos = Math.min(digits.length, startPos + 160 - 1);
      const range = digits.slice(startPos - 1, endPos);
      const rows = [];
      for (let i = 0; i < range.length; i += 16) {
        const rowStart = startPos + i;
        const rowDigits = [...range.slice(i, i + 16)];
        rows.push(`<div class="pi-digit-row"><span class="pi-row-index">${format(rowStart)}</span><div class="pi-digit-cells">${rowDigits.map((digit, j) => { const pos = rowStart + j; const match = pos >= date.position && pos < date.position + 4; return `<span class="pi-digit ${match ? 'matched' : ''}" style="--digit-delay:${Math.min(j,15)*16}ms" title="Digit position ${format(pos)}">${digit}</span>`; }).join('')}</div></div>`);
      }
      return `<div class="visual-section-head"><div><p class="eyebrow">FIRST OCCURRENCE · DIGIT WINDOW</p><h2 class="visual-section-title">${date.label} <span>→</span> <strong>${date.code}</strong></h2><p class="panel-subtitle">The actual digits around this date's first match. The four highlighted digits begin at position ${format(date.position)}.</p></div><div class="visual-date-chip" style="--month-color:${date.color}"><span>${date.label}</span><small>RANK #${date.rank}</small></div></div><div class="pi-digit-window">${rows.join('')}</div><div class="visual-bottomline"><span><i class="legend-dot match-dot"></i> Matching sequence <strong>${date.code}</strong></span><span>Digit positions counted after the decimal point</span></div><div class="visual-controls-row"><label class="form-label" for="visual-date-input">Inspect a different birthday</label><form class="date-form" data-visual-date-form><input id="visual-date-input" type="date" value="2000-${pad(date.month)}-${pad(date.day)}" aria-label="Select date for digit match"/><button type="submit" class="primary-button">Find match</button></form></div>`;
    }
    if (visualMode === 'months') {
      const cols = MONTHS.map((month, i) => {
        const dates = BY_CALENDAR.filter(d => d.month === i + 1);
        return `<section class="month-column" style="--month-color:${month.color};--column-delay:${i*45}ms"><header class="month-column-head"><span class="month-column-short">${month.short}</span><span class="month-column-count">${dates.length}</span></header><div class="month-column-list">${dates.map((date, index) => `<button class="month-position-row ${date.code === selectedCode ? 'selected' : ''}" style="--row-delay:${Math.min(index,20)*9}ms" type="button" data-code="${date.code}" title="${longDate(date)} · first found at digit ${format(date.position)}"><span class="month-position-day">${pad(date.day)}</span><span class="month-position-value">${format(date.position)}</span></button>`).join('')}</div></section>`;
      }).join('');
      return `<div class="visual-section-head"><div><p class="eyebrow">CALENDAR ORDER · ALL 366</p><h2 class="visual-section-title">One column for every month.</h2><p class="panel-subtitle">Each date is paired with the digit position where its MMDD pattern first appears. Select any row to pin it across the explorer.</p></div><div class="visual-date-chip" style="--month-color:${selectedDate().color}"><span>${selectedDate().label}</span><small>POSITION ${format(selectedDate().position)}</small></div></div><div class="month-columns-grid">${cols}</div><div class="visual-bottomline"><span><i class="legend-dot match-dot"></i> Selected date is highlighted</span><span>Scroll within a column to inspect every day</span></div>`;
    }
    if (visualMode === 'positions') {
      return `<div class="visual-section-head"><div><p class="eyebrow">ALL DATES · POSITION DISTRIBUTION</p><h2 class="visual-section-title">Every birthday in one view.</h2><p class="panel-subtitle">Switch between calendar order and first-occurrence order. The bars transition between positions instead of snapping to a new chart.</p></div><div class="visual-date-chip" style="--month-color:${selectedDate().color}"><span>${selectedDate().label}</span><small>#${selectedDate().rank} · ${format(selectedDate().position)}</small></div></div><div class="visual-chart-toolbar"><div class="segmented" role="group" aria-label="Arrange dates"><button type="button" data-visual-order="calendar" class="${visualChartOrder === 'calendar' ? 'active' : ''}">Calendar order</button><button type="button" data-visual-order="position" class="${visualChartOrder === 'position' ? 'active' : ''}">Earliest first</button></div><span class="chart-hint">Select a bar to inspect its date</span></div><div class="visual-chart-wrap"><canvas id="visual-chart" role="img" aria-label="Animated chart of all 366 birthday positions"></canvas></div><div class="chart-legend"><span class="legend-key"><i style="background:#c9f66f"></i> First appearance position</span><span class="legend-key"><i style="background:#fff"></i> Selected birthday</span><span class="legend-right">LOWER BAR = EARLIER MATCH</span></div>`;
    }
    if (visualMode === 'sweep') {
      const rank = Math.max(1, Math.min(366, visualSweepRank));
      const date = DATES.find(d => d.rank === rank) || BY_POSITION[BY_POSITION.length - 1];
      return `<div class="visual-section-head"><div><p class="eyebrow">RANKING REVEAL · 366 → 1</p><h2 class="visual-section-title">Follow the index from later to earlier.</h2><p class="panel-subtitle">The selected rank travels across the sorted distribution, revealing how a date moves from a late first appearance toward the earliest matches.</p></div><div class="visual-sweep-actions"><button class="primary-button" type="button" data-sweep-toggle>${visualSweepTimer ? 'Pause reveal' : 'Play reveal'}</button><button class="secondary-button" type="button" data-sweep-reset>Reset</button></div></div><div class="sweep-layout"><div class="sweep-chart-wrap"><canvas id="visual-sweep-chart" role="img" aria-label="Sorted dates with animated ranking cursor"></canvas></div><div class="sweep-current-card" style="--month-color:${date.color}"><div class="sweep-rank-label">CURRENT RANK</div><div id="sweep-rank-value" class="sweep-rank-value">#${date.rank}</div><div id="sweep-date-value" class="sweep-date-value">${date.label}</div><div id="sweep-position-value" class="sweep-position-value">${format(date.position)}</div><div class="sweep-position-caption">FIRST DIGIT POSITION</div><button type="button" class="text-action" data-code="${date.code}">Inspect this birthday ↗</button></div></div><div class="sweep-track"><span>RANK #366</span><input id="sweep-rank-slider" type="range" min="1" max="366" value="${rank}" aria-label="Choose ranking"/><span>RANK #1</span></div><div class="visual-bottomline"><span><i class="legend-dot" style="background:${date.color}"></i> ${date.label} · code ${date.code}</span><span>Use the slider to scrub or play the reveal</span></div>`;
    }
    const topTen = BY_POSITION.slice(0, 10);
    return `<div class="visual-section-head"><div><p class="eyebrow">EARLIEST FIRST OCCURRENCES</p><h2 class="visual-section-title">The first 10 birthdays in π.</h2><p class="panel-subtitle">A ranked card layout, using the same positions as the full index. Select a card to inspect that date elsewhere in the app.</p></div><div class="visual-date-chip" style="--month-color:${topTen[0].color}"><span>TOP 10</span><small>OF ${DATES.length} DATES</small></div></div><div class="top-ten-grid">${topTen.map((date, i) => `<button type="button" class="top-ten-card ${date.code === selectedCode ? 'selected' : ''}" data-code="${date.code}" style="--month-color:${date.color};--card-delay:${i*70}ms"><span class="top-ten-rank">#${String(date.rank).padStart(3,'0')}</span><span class="top-ten-date">${date.label}</span><span class="top-ten-code">MMDD · ${date.code}</span><span class="top-ten-rule"></span><span class="top-ten-position">${format(date.position)}</span><span class="top-ten-position-label">FIRST DIGIT POSITION</span><span class="top-ten-open">View date ↗</span></button>`).join('')}</div><div class="visual-bottomline"><span>Cards rise into place with a staggered reveal</span><span>Rank #1 is the earliest match in π</span></div>`;
  }
  function initVisualMode() {
    const stage = root.querySelector('#visual-stage');
    if (!stage || currentView !== 'visuals') return;
    if (visualMode === 'positions') drawVisualChart('#visual-chart', visualChartOrder, false);
    if (visualMode === 'sweep') {
      drawVisualChart('#visual-sweep-chart', 'position', true);
      updateSweepReadout();
    }
  }
  function renderVisualStage() {
    const stage = root.querySelector('#visual-stage');
    if (!stage) return;
    stage.innerHTML = visualModeMarkup();
    root.querySelectorAll('[data-visual-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.visualMode === visualMode);
      button.setAttribute('aria-selected', String(button.dataset.visualMode === visualMode));
    });
    initVisualMode();
  }
  function drawVisualChart(selector, order, cursorMode, animate = true) {
    const canvas = root.querySelector(selector);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, rect.width || canvas.clientWidth || 800);
    const h = Math.max(260, rect.height || canvas.clientHeight || 340);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    const padBox = {left:52,right:17,top:20,bottom:31};
    const plotW = w-padBox.left-padBox.right, plotH=h-padBox.top-padBox.bottom;
    const maxValue = Math.ceil(MAX_POSITION/10000)*10000;
    const list = order === 'calendar' ? BY_CALENDAR : [...BY_POSITION].reverse();
    const slot = plotW/Math.max(1,list.length);
    const targets = list.map((date,i)=>{
      const bh=Math.max(1.1,(date.position/maxValue)*plotH);
      return {code:date.code,date,x:padBox.left+i*slot+slot*.18,y:padBox.top+plotH-bh,w:Math.max(.65,slot*.66),h:bh,opacity:.78};
    });
    const old = canvas.__currentVisualBars || [];
    const oldMap=new Map(old.map(b=>[b.code,b]));
    const transitions=targets.map(t=>{const f=oldMap.get(t.code);return {from:f||{...t,y:padBox.top+plotH,h:0,opacity:0},to:t};});
    const selected = cursorMode ? (DATES.find(d=>d.rank===visualSweepRank)||selectedDate()) : selectedDate();
    const drawFrame = bars => {
      ctx.clearRect(0,0,w,h);
      ctx.font='9px "DM Mono", monospace'; ctx.textAlign='right';
      for(let i=0;i<=5;i++){
        const val=maxValue*i/5, y=padBox.top+plotH-plotH*i/5;
        ctx.strokeStyle=i===0?'rgba(255,255,255,.16)':'rgba(255,255,255,.055)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padBox.left,Math.round(y)+.5);ctx.lineTo(w-padBox.right,y+.5);ctx.stroke();
        ctx.fillStyle='#707783';ctx.fillText(val===0?'0':`${Math.round(val/1000)}k`,padBox.left-9,y+3);
      }
      ctx.textAlign='center';ctx.font='8px "DM Mono", monospace';
      if(order==='calendar'){
        for(let m=1;m<=12;m++){
          const ds=BY_CALENDAR.filter(d=>d.month===m); const mid=ds[Math.floor(ds.length/2)]; const b=bars.find(x=>x.code===mid.code);
          if(b){ctx.fillStyle=MONTHS[m-1].color;ctx.fillText(MONTHS[m-1].short,b.x+b.w/2,h-7);}
        }
      } else {
        ctx.fillStyle='#707783';[['#366',0],['#275',.25],['#184',.5],['#93',.75],['#1',1]].forEach(([label,ratio])=>ctx.fillText(label,padBox.left+plotW*ratio,h-7));
      }
      bars.forEach(bar=>{
        if(bar.opacity<=.015||bar.h<=.05)return;
        const hot=bar.code===selected.code;
        ctx.save();ctx.globalAlpha=Math.min(1,bar.opacity+(hot?.18:0));ctx.fillStyle=bar.date.color;
        if(hot){ctx.shadowColor=bar.date.color;ctx.shadowBlur=14;}
        ctx.fillRect(bar.x,bar.y,Math.max(.6,bar.w),bar.h);ctx.restore();
        if(hot){ctx.save();ctx.strokeStyle=bar.date.color;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(bar.x+bar.w/2,padBox.top);ctx.lineTo(bar.x+bar.w/2,padBox.top+plotH);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bar.x+bar.w/2,Math.max(padBox.top+2,bar.y),2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
      });
    };
    cancelAnimationFrame(visualChartAnimation);
    if(!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches){canvas.__currentVisualBars=targets;canvas.__visualTargets=targets;drawFrame(targets);return;}
    const start=performance.now();const duration=850;
    const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const tick=now=>{
      const p=Math.min(1,(now-start)/duration),e=ease(p);
      const bars=transitions.map(({from,to})=>({code:to.code,date:to.date,x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e,w:from.w+(to.w-from.w)*e,h:from.h+(to.h-from.h)*e,opacity:from.opacity+(to.opacity-from.opacity)*e}));
      canvas.__currentVisualBars=bars;drawFrame(bars);
      if(p<1)visualChartAnimation=requestAnimationFrame(tick);else{canvas.__currentVisualBars=targets;canvas.__visualTargets=targets;drawFrame(targets);}
    };
    visualChartAnimation=requestAnimationFrame(tick);
  }
  function updateSweepReadout() {
    const date = DATES.find(d => d.rank === visualSweepRank) || BY_POSITION[BY_POSITION.length-1];
    const rank = root.querySelector('#sweep-rank-value'), label = root.querySelector('#sweep-date-value'), pos = root.querySelector('#sweep-position-value'), slider=root.querySelector('#sweep-rank-slider');
    if(rank)rank.textContent=`#${date.rank}`; if(label)label.textContent=date.label; if(pos)pos.textContent=format(date.position); if(slider)slider.value=String(date.rank);
    const card=root.querySelector('.sweep-current-card'); if(card)card.style.setProperty('--month-color',date.color);
    const inspect=root.querySelector('.sweep-current-card [data-code]'); if(inspect)inspect.dataset.code=date.code;
    const canvas=root.querySelector('#visual-sweep-chart'); if(canvas){
      const ctx=canvas.getContext('2d');
      // Repaint the moving rank marker without resetting the sorted bars.
      drawVisualChart('#visual-sweep-chart','position',true,false);
    }
  }
  function stopSweep() {
    if(visualSweepTimer){clearInterval(visualSweepTimer);visualSweepTimer=null;}
    const button=root.querySelector('[data-sweep-toggle]');if(button)button.textContent='Play reveal';
  }
  function startSweep() {
    if(visualSweepTimer){stopSweep();return;}
    if(visualSweepRank<=11)visualSweepRank=366;
    const button=root.querySelector('[data-sweep-toggle]');if(button)button.textContent='Pause reveal';
    visualSweepTimer=setInterval(()=>{
      visualSweepRank=Math.max(1,visualSweepRank-12);
      if(visualSweepRank<=1){visualSweepRank=1;stopSweep();}
      updateSweepReadout();
    },380);
  }
  function digitsPositionAt(event, selector) {
    const canvas=root.querySelector(selector);if(!canvas)return null;
    const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left;
    const bars=canvas.__visualTargets||[];let hit=null,closest=Infinity;
    bars.forEach(b=>{const d=Math.abs((b.x+b.w/2)-x);if(d<closest){closest=d;hit=b;}});
    return closest<Math.max(10,rect.width/Math.max(1,bars.length)*3)?hit?.date:null;
  }

  function renderView() {
    tooltip.classList.remove('visible');
    if (currentView === 'overview') root.innerHTML = overviewView();
    else if (currentView === 'calendar') root.innerHTML = calendarView();
    else if (currentView === 'rankings') root.innerHTML = rankingsView();
    else if (currentView === 'visuals') root.innerHTML = visualizerView();
    else root.innerHTML = finderView();
    root.style.animation = 'none';
    void root.offsetWidth;
    root.style.animation = '';
    if (currentView === 'overview') drawMainChart();
    if (currentView === 'visuals') initVisualMode();
    updateNav();
  }
  function updateNav() {
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === currentView));
    document.querySelectorAll('[data-view-link]').forEach(link => link.classList.toggle('active', link.dataset.viewLink === currentView));
  }
  function goView(view) {
    if (!['overview', 'calendar', 'rankings', 'finder', 'visuals'].includes(view)) return;
    stopSweep();
    if (currentView === view) return;
    currentView = view;
    renderView();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function chooseDate(code) {
    if (!BY_CODE.has(code)) return;
    selectedCode = code;
    if (currentView === 'overview') {
      const panel = root.querySelector('.right-stack .panel');
      if (panel) panel.innerHTML = selectedCardMarkup();
      const insight = root.querySelector('.insight-metric:last-child');
      if (insight) insight.textContent = `#${selectedDate().rank}`;
      if (root.querySelector('#position-chart')) drawMainChart();
    } else if (currentView === 'calendar') {
      const date = selectedDate();
      root.querySelectorAll('.day-cell[data-code]').forEach(button => button.classList.toggle('selected', button.dataset.code === code));
      const summary = root.querySelector('.calendar-summary');
      if (summary) summary.innerHTML = `Selected: <strong style="color:${date.color}">${date.label}</strong> · digit ${format(date.position)}`;
    } else if (currentView === 'rankings') {
      root.querySelectorAll('#ranking-rows tr[data-code]').forEach(row => row.classList.toggle('selected-row', row.dataset.code === code));
      // Keep the currently selected row visible without replacing the scrollable table.
    } else if (currentView === 'visuals') {
      renderVisualStage();
    } else {
      root.innerHTML = finderView();
      root.style.animation = 'none'; void root.offsetWidth; root.style.animation = '';
    }
  }
  function selectMonth(monthValue) {
    activeMonth = monthValue === 'all' ? null : Number(monthValue);
    // Update active buttons in place to preserve the chart canvas and interpolate the bars.
    root.querySelectorAll('[data-month-filter]').forEach(button => {
      const isActive = activeMonth === null ? button.dataset.monthFilter === 'all' : Number(button.dataset.monthFilter) === activeMonth;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    if (currentView === 'overview') drawMainChart();
    if (currentView === 'calendar') {
      root.querySelectorAll('[data-month-card]').forEach(card => card.classList.toggle('dimmed', Boolean(activeMonth && Number(card.dataset.monthCard) !== activeMonth)));
    }
    if (currentView === 'rankings') refreshRankingRows();
  }
  function refreshRankingRows() {
    const body = root.querySelector('#ranking-rows');
    if (!body) return;
    body.innerHTML = rowsMarkup();
    const count = root.querySelector('#ranking-count');
    if (count) count.textContent = `${rankingsRows().length} DATES`;
  }
  function mainChartOrder() {
    let list = chartOrder === 'calendar' ? BY_CALENDAR : BY_POSITION;
    if (activeMonth) list = list.filter(date => date.month === activeMonth);
    return list;
  }
  function drawMainChart() {
    const canvas = root.querySelector('#position-chart');
    if (!canvas) return;
    const dates = mainChartOrder();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 20 || h < 20) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(w * dpr), pixelHeight = Math.round(h * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth; canvas.height = pixelHeight;
      // Resizing invalidates the previous coordinate space, so start this layout cleanly.
      canvas.__currentBars = null;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const padBox = { left: 48, right: 12, top: 13, bottom: 28 };
    const plotW = Math.max(1, w - padBox.left - padBox.right);
    const plotH = Math.max(1, h - padBox.top - padBox.bottom);
    const maxValue = Math.ceil(Math.max(10000, ...dates.map(d => d.position)) / 10000) * 10000;
    const slot = plotW / Math.max(1, dates.length);
    const targets = dates.map((date, i) => {
      const barH = Math.max(1.7, (date.position / maxValue) * plotH);
      return { code: date.code, date, x: padBox.left + i * slot + slot * .18, y: padBox.top + plotH - barH, w: Math.max(.8, slot * .64), h: barH, opacity: .79 };
    });
    const current = canvas.__currentBars || [];
    const currentByCode = new Map(current.map(bar => [bar.code, bar]));
    const targetByCode = new Map(targets.map(bar => [bar.code, bar]));
    const transitionBars = [];
    for (const [code, oldBar] of currentByCode) {
      if (!targetByCode.has(code)) transitionBars.push({ from: oldBar, to: { ...oldBar, opacity: 0 } });
    }
    for (const target of targets) {
      const old = currentByCode.get(target.code);
      transitionBars.push({ from: old || { ...target, y: padBox.top + plotH, h: 0, opacity: 0 }, to: target });
    }
    const selected = selectedDate();
    const drawFrame = bars => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '9px "DM Mono", monospace';
      ctx.textAlign = 'right';
      for (let tick = 0; tick <= 5; tick++) {
        const value = maxValue * tick / 5;
        const y = padBox.top + plotH - plotH * tick / 5;
        ctx.strokeStyle = tick === 0 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.055)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padBox.left, Math.round(y) + .5); ctx.lineTo(w - padBox.right, Math.round(y) + .5); ctx.stroke();
        ctx.fillStyle = '#6e7580';
        ctx.fillText(value === 0 ? '0' : `${Math.round(value / 1000)}k`, padBox.left - 9, y + 3);
      }
      ctx.textAlign = 'center'; ctx.font = '8px "DM Mono", monospace';
      if (chartOrder === 'calendar' && !activeMonth) {
        for (let m = 1; m <= 12; m++) {
          const monthDates = dates.filter(d => d.month === m);
          if (!monthDates.length) continue;
          const midDate = monthDates[Math.floor(monthDates.length / 2)];
          const bar = bars.find(item => item.code === midDate.code);
          if (bar) { ctx.fillStyle = MONTHS[m - 1].color; ctx.fillText(MONTHS[m - 1].short, bar.x + bar.w / 2, h - 7); }
        }
      } else {
        ctx.fillStyle = '#6e7580';
        const points = [0, .25, .5, .75, 1];
        points.forEach((point, i) => {
          const x = padBox.left + plotW * point;
          ctx.fillText(chartOrder === 'position' ? `#${Math.max(1, Math.round(dates.length * point))}` : `${Math.round(point * 100)}%`, x, h - 7);
        });
      }
      bars.forEach(bar => {
        if (bar.opacity <= .015 || bar.h <= .05) return;
        const isSelected = bar.code === selected.code;
        ctx.save(); ctx.globalAlpha = Math.min(1, bar.opacity + (isSelected ? .16 : 0)); ctx.fillStyle = bar.date.color;
        if (isSelected) { ctx.shadowColor = bar.date.color; ctx.shadowBlur = 13; }
        ctx.fillRect(bar.x, bar.y, Math.max(.5, bar.w), bar.h); ctx.restore();
        if (isSelected) {
          ctx.save(); ctx.strokeStyle = bar.date.color; ctx.globalAlpha = .72; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(bar.x + bar.w / 2, padBox.top); ctx.lineTo(bar.x + bar.w / 2, padBox.top + plotH); ctx.stroke();
          ctx.fillStyle = '#f6f8ef'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(bar.x + bar.w / 2, Math.max(padBox.top + 2, bar.y), 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      });
    };
    const drawImmediate = () => {
      canvas.__currentBars = targets;
      drawFrame(targets);
      canvas.__chartHitTargets = targets;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { drawImmediate(); return; }
    cancelAnimationFrame(chartAnimation);
    const startTime = performance.now();
    const duration = 520;
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tick = now => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = ease(progress);
      const bars = transitionBars.map(({ from, to }) => ({
        code: to.code, date: to.date || from.date,
        x: from.x + ((to.x ?? from.x) - from.x) * eased,
        y: from.y + ((to.y ?? from.y) - from.y) * eased,
        w: from.w + ((to.w ?? from.w) - from.w) * eased,
        h: from.h + ((to.h ?? from.h) - from.h) * eased,
        opacity: from.opacity + ((to.opacity ?? from.opacity) - from.opacity) * eased
      }));
      canvas.__currentBars = bars;
      drawFrame(bars);
      if (progress < 1) chartAnimation = requestAnimationFrame(tick);
      else {
        canvas.__currentBars = targets;
        canvas.__chartHitTargets = targets;
        drawFrame(targets);
      }
    };
    chartAnimation = requestAnimationFrame(tick);
  }
  function chartDateAt(event) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const bars = canvas.__chartHitTargets || [];
    let hit = null, closest = Infinity;
    bars.forEach(bar => {
      const center = bar.x + bar.w / 2;
      const d = Math.abs(center - x);
      if (d < closest) { closest = d; hit = bar; }
    });
    return closest < Math.max(12, rect.width / Math.max(1, bars.length) * 2.5) ? hit?.date : null;
  }
  function showChartTooltip(event, date) {
    if (!date) { tooltip.classList.remove('visible'); return; }
    tooltip.style.left = `${Math.min(window.innerWidth - 175, event.clientX + 13)}px`;
    tooltip.style.top = `${Math.max(12, event.clientY - 60)}px`;
    tooltip.style.setProperty('--tip-color', date.color);
    tooltip.innerHTML = `<strong>${date.label}</strong><span>Rank #${date.rank} · code ${date.code}</span><span>First found at digit ${format(date.position)}</span>`;
    tooltip.classList.add('visible');
  }
  function handleDateForm(form) {
    const dateInput = form.querySelector('input[type="date"]');
    const date = dateFromInput(dateInput?.value);
    if (!date) {
      dateInput?.setCustomValidity('Choose a valid calendar date.');
      dateInput?.reportValidity();
      dateInput?.setCustomValidity('');
      return;
    }
    selectedCode = date.code;
    if (currentView === 'overview') {
      const panel = root.querySelector('.right-stack .panel');
      if (panel) panel.innerHTML = selectedCardMarkup();
      drawMainChart();
    } else if (currentView === 'finder') {
      renderView();
    } else if (currentView === 'calendar') {
      const summary = root.querySelector('.calendar-summary');
      root.querySelectorAll('.day-cell[data-code]').forEach(button => button.classList.toggle('selected', button.dataset.code === date.code));
      if (summary) summary.innerHTML = `Selected: <strong style="color:${date.color}">${date.label}</strong> · digit ${format(date.position)}`;
    } else {
      refreshRankingRows();
    }
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-view]');
    if (nav) { goView(nav.dataset.view); return; }
    const brand = event.target.closest('[data-view-link]');
    if (brand) { event.preventDefault(); goView(brand.dataset.viewLink); return; }
    const monthButton = event.target.closest('[data-month-filter]');
    if (monthButton) { selectMonth(monthButton.dataset.monthFilter); return; }
    const orderButton = event.target.closest('[data-chart-order]');
    if (orderButton) {
      chartOrder = orderButton.dataset.chartOrder;
      root.querySelectorAll('[data-chart-order]').forEach(button => button.classList.toggle('active', button.dataset.chartOrder === chartOrder));
      drawMainChart(); return;
    }
    const visualTab = event.target.closest('[data-visual-mode]');
    if (visualTab) { stopSweep(); visualMode = visualTab.dataset.visualMode; renderVisualStage(); return; }
    const visualOrder = event.target.closest('[data-visual-order]');
    if (visualOrder) { visualChartOrder = visualOrder.dataset.visualOrder; root.querySelectorAll('[data-visual-order]').forEach(b => b.classList.toggle('active', b.dataset.visualOrder === visualChartOrder)); drawVisualChart('#visual-chart', visualChartOrder, false); return; }
    if (event.target.closest('[data-sweep-toggle]')) { startSweep(); return; }
    if (event.target.closest('[data-sweep-reset]')) { stopSweep(); visualSweepRank = 366; updateSweepReadout(); return; }
    const dateButton = event.target.closest('[data-code]');
    if (dateButton) { chooseDate(dateButton.dataset.code); return; }
  });
  document.addEventListener('submit', event => {
    const visualForm = event.target.closest('[data-visual-date-form]');
    if (visualForm) { event.preventDefault(); const input=visualForm.querySelector('input[type="date"]'); const date=dateFromInput(input?.value); if(date){selectedCode=date.code;renderVisualStage();}else{input?.setCustomValidity('Choose a valid calendar date.');input?.reportValidity();input?.setCustomValidity('');} return; }
    const form = event.target.closest('[data-date-form]');
    if (form) { event.preventDefault(); handleDateForm(form); }
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'ranking-sort') { rankingSort = event.target.value; refreshRankingRows(); }
    if (event.target.id === 'sweep-rank-slider') { stopSweep(); visualSweepRank=Number(event.target.value); updateSweepReadout(); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'sweep-rank-slider') { stopSweep(); visualSweepRank=Number(event.target.value); updateSweepReadout(); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'ranking-search') { rankingQuery = event.target.value; refreshRankingRows(); }
  });
  document.addEventListener('click', event => {
    const row = event.target.closest('#ranking-rows tr[data-code]');
    if (row && currentView === 'rankings') {
      selectedCode = row.dataset.code;
      root.querySelectorAll('#ranking-rows tr[data-code]').forEach(item => item.classList.toggle('selected-row', item.dataset.code === selectedCode));
    }
  });
  document.addEventListener('keydown', event => {
    const row = event.target.closest && event.target.closest('#ranking-rows tr[data-code]');
    if (row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectedCode = row.dataset.code; root.querySelectorAll('#ranking-rows tr[data-code]').forEach(item => item.classList.toggle('selected-row', item.dataset.code === selectedCode)); }
  });
  document.addEventListener('mousemove', event => {
    const canvas = event.target.closest && event.target.closest('#position-chart');
    if (!canvas) { if (!event.target.closest('.chart-tooltip')) tooltip.classList.remove('visible'); return; }
    const date = chartDateAt(event);
    showChartTooltip(event, date);
    canvas.style.cursor = date ? 'crosshair' : 'default';
  });
  document.addEventListener('click', event => {
    const canvas = event.target.closest && event.target.closest('#position-chart');
    if (canvas) {
      const date = chartDateAt(event);
      if (date) {
        selectedCode = date.code;
        const panel = root.querySelector('.right-stack .panel');
        if (panel) panel.innerHTML = selectedCardMarkup();
        drawMainChart();
      }
    }
  });
  document.addEventListener('click', event => {
    const chart = event.target.closest('#visual-chart, #visual-sweep-chart');
    if (!chart || currentView !== 'visuals') return;
    const isSweep = chart.id === 'visual-sweep-chart';
    const date = digitsPositionAt(event, isSweep ? '#visual-sweep-chart' : '#visual-chart');
    if (date) {
      selectedCode = date.code;
      if (isSweep) { visualSweepRank = date.rank; updateSweepReadout(); }
      else { const chip=root.querySelector('.visual-date-chip'); if(chip){chip.innerHTML=`<span>${date.label}</span><small>#${date.rank} · ${format(date.position)}</small>`;chip.style.setProperty('--month-color',date.color);} drawVisualChart('#visual-chart',visualChartOrder,false); }
    }
  });
  window.addEventListener('resize', () => {
    if (currentView === 'overview') drawMainChart();
    if (currentView === 'visuals') initVisualMode();
  });

  renderView();
})();
