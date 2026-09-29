/* ==========================================================================
   Mortgage Rate Explorer - all the interactive logic
   --------------------------------------------------------------------------
   FILE MAP
     1.  Settings: series, history notes, glossary (Word Bank), tour script
     2.  State: what is currently selected / which tab is open
     3.  Helper functions (dates, formatting, maths, term-highlighting)
     4.  Startup: load the data, wire up every control, build the tabs
     5.  render(): redraws every tab's content from the current filters
     6.  drawChart(): builds the SVG line chart by hand
     7.  The hover crosshair and tooltip
     8.  Tiles, insights, history, table
     9.  Calculator + amortization schedule
     10. Glossary / Word Bank
     11. Theme switching, full screen, CSV download, tooltips, tour
   ========================================================================== */

/* == 1. SETTINGS ========================================================== */

var SERIES = [
  { key: "r30", col: 1, name: "30-year fixed", color: "--series-1", dash: "",       box: "sr30" },
  { key: "r15", col: 2, name: "15-year fixed", color: "--series-2", dash: "7 4",    box: "sr15" },
  { key: "arm", col: 3, name: "5/1 ARM",       color: "--series-3", dash: "2 4",    box: "sarm" }
];

/* Curated history notes. Every number quoted here was read straight out of
   the spreadsheet, so the markers and the chart can never disagree. */
var EVENTS = [
  { date: "1971-04-02", title: "The survey begins", text: "Freddie Mac records its very first weekly average: 7.33% on a 30-year fixed loan. Everything on this chart starts here." },
  { date: "1980-04-11", title: "The fastest climb ever recorded", text: "In just 52 weeks the 30-year rate leapt from 10.48% to 16.35% - a rise of 5.87 points, still the steepest one-year jump in the survey's history." },
  { date: "1981-10-09", title: "The all-time peak: 18.63%", text: "To crush double-digit inflation, the Federal Reserve pushed borrowing costs to punishing levels. This single week remains the most expensive in 55 years of record-keeping." },
  { date: "1983-02-11", title: "The fastest fall ever recorded", text: "The mirror image of 1980: rates dropped 4.59 points in a year, from 17.65% down to 13.06%, as inflation finally broke." },
  { date: "1986-04-04", title: "Back under 10%", text: "For the first time since 1978, a 30-year loan cost single-digit interest - 9.99%. Rates would not return to double digits again for good." },
  { date: "1991-08-30", title: "The 15-year loan joins the survey", text: "The orange line starts here. Before this week there simply is no 15-year data to plot - a blank stretch on a chart usually means 'not measured', not 'zero'." },
  { date: "2003-06-13", title: "A then-record low of 5.21%", text: "What felt astonishingly cheap in 2003 would look expensive again within twenty years. Context is everything when reading a chart." },
  { date: "2005-01-06", title: "The 5/1 ARM joins the survey", text: "The green line starts here. Adjustable-rate loans were popular in the run-up to the housing bubble because they opened with a lower rate." },
  { date: "2008-09-12", title: "The global financial crisis", text: "The housing crash reshaped lending. Notice that mortgage rates fell rather than spiked - lenders followed a collapsing economy down." },
  { date: "2009-01-15", title: "Under 5% for the first time", text: "Emergency policy after the crash pushed a 30-year loan to 4.96%, a level no borrower had ever seen in this dataset before." },
  { date: "2012-11-21", title: "A post-crisis floor of 3.31%", text: "Years of low rates made this the cheapest borrowing in history to that point - and it still had further to fall." },
  { date: "2020-03-05", title: "The pandemic arrives", text: "COVID-19 sent investors rushing to safety, which dragged mortgage rates down. By July 2020 a 30-year loan cost under 3% for the first time ever." },
  { date: "2021-01-07", title: "The all-time low: 2.65%", text: "The cheapest week in 55 years - roughly one seventh the cost of the 1981 peak on the very same loan." },
  { date: "2022-11-10", title: "The ARM series ends", text: "Freddie Mac stopped publishing 5/1 ARM rates. The green line stops here for that reason alone - the loans still exist, they are just no longer surveyed." },
  { date: "2023-10-26", title: "7.79% - a 23-year high", text: "Rates more than doubled in two years as the Fed fought inflation again. Nobody who bought a house in 2021 would recognise this market." }
];

/* The Word Bank. Every entry has a short plain-English definition written
   for someone who has never heard the term before. "label" is what gets
   matched (and highlighted) inside other sentences on the page; the same
   object is the single source of truth for the Word Bank tab AND every
   hover-highlight anywhere else, so a definition can never drift out of
   sync with itself. */
var GLOSSARY = {
  mortgage:      { label: "Mortgage",       def: "A loan you use to buy a house. You borrow the money, then pay a little of it back every month for many years." },
  loan:          { label: "Loan",           def: "Money someone lends you that you promise to pay back, usually with extra money on top called interest." },
  interest:      { label: "Interest",       def: "Extra money you pay for borrowing money. It is the lender's fee for letting you use their cash." },
  principal:     { label: "Principal",      def: "The original amount of money you borrowed, not counting interest." },
  rate:          { label: "Mortgage rate",  def: "The yearly interest percentage a lender charges on a home loan. A lower rate means smaller payments." },
  fixedrate:     { label: "Fixed-rate loan", def: "A loan whose interest rate never changes, from the very first payment to the very last." },
  arm:           { label: "Adjustable-rate mortgage", def: "A loan whose rate can change after a set number of years, instead of staying the same forever. Often shortened to \"ARM\"." },
  thirty:        { label: "30-year fixed",  def: "A home loan paid off over 30 years at one interest rate that never changes." },
  fifteen:       { label: "15-year fixed",  def: "A home loan paid off in half the time of a 30-year loan - bigger monthly payments, but less interest paid overall." },
  fiveone:       { label: "5/1 ARM",        def: "An adjustable-rate loan. The rate is fixed for the first 5 years, then can change once every year after that." },
  downpayment:   { label: "Down payment",   def: "Cash you pay up front toward a house, before taking out a loan for the rest of the price." },
  amortization:  { label: "Amortization",   def: "Paying off a loan bit by bit with regular payments, until the balance reaches zero." },
  amorttable:    { label: "Amortization table", def: "A list showing exactly how much of each payment goes to interest and how much shrinks your loan balance, year by year." },
  basispoint:    { label: "Basis point",    def: "One hundredth of a percent (0.01%). Moving from 6.50% to 6.75% is 25 basis points." },
  movingaverage: { label: "Moving average", def: "The average of several weeks blended together, used to smooth out small bumps and show the bigger trend." },
  outlier:       { label: "Outlier",        def: "A single data point that sits far away from all the others, like an unusually high or low week." },
  inflation:     { label: "Inflation",      def: "When prices for everyday things rise over time, so each dollar buys a little less than it used to." },
  fed:           { label: "Federal Reserve", def: "The United States' central bank. It can raise or lower interest rates to try to control inflation." },
  freddiemac:    { label: "Freddie Mac",    def: "A government-backed company that buys home loans from banks and publishes the weekly mortgage rate survey used on this whole page." },
  pmms:          { label: "PMMS",           def: "Primary Mortgage Market Survey - Freddie Mac's weekly report of the average mortgage rate lenders are offering across the country." },
  pctpoint:      { label: "Percentage point", def: "A plain difference between two percentages. Going from 5% to 6% is a move of 1 percentage point." },
  crisis:        { label: "Financial crisis", def: "A time when banks, markets and the economy all run into serious trouble at once, like in 2008." }
};

/* Order the Word Bank alphabetically by label, computed once. */
var GLOSSARY_ORDER = Object.keys(GLOSSARY).sort(function (a, b) {
  return GLOSSARY[a].label.localeCompare(GLOSSARY[b].label);
});

/* A short, 6th-grade-friendly tour. Every step just points at a piece of
   chrome that is ALWAYS visible (the filters bar, the tab buttons) so the
   tour never has to switch tabs for you - it hands you the map and lets
   you click around yourself afterward. */
var TOUR = [
  { sel: "#panel-start .lede", title: "Welcome!", text: "This page shows how much it costs to borrow money for a house, and how that has changed over 55 years. Let's look around fast." },
  { sel: "#filtersBar", title: "0. Controls", text: "These buttons control everything else on the page. Pick a time period and which loans to compare here first." },
  { sel: "#tab-graph", title: "2. Graph", text: "Click here to see the numbers as a picture. Move your mouse across it to read any week." },
  { sel: "#tab-stats", title: "3. Stats", text: "Click here for the same numbers explained in plain sentences, not just a picture." },
  { sel: "#tab-calculator", title: "5. Calculator", text: "Click here to turn a rate into a real monthly payment in dollars." },
  { sel: "#tab-glossary", title: "6. Word Bank", text: "Stuck on a word anywhere on this page? Click here, or hover any yellow highlighted word." }
];

/* == 2. STATE ============================================================= */

var ROWS = [];
var DATES = [];
var SMOOTHED = {};

var state = {
  from: null,
  to: null,
  preset: "10",
  visible: { r30: true, r15: true, arm: false },
  window: 1,
  showEvents: true,
  showTable: false,
  activeTab: "start"
};

var view = [];
var hoverIndex = -1;
var chartGeom = null;
var lastCalcCells = [];

/* == 3. HELPERS ============================================================ */

function $(id) { return document.getElementById(id); }

function toDate(s) { return new Date(s + "T00:00:00"); }

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function niceDate(s) {
  var d = toDate(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function niceMonth(s) {
  return toDate(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function pct(v) { return v == null ? "n/a" : v.toFixed(2) + "%"; }
function money(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
function bigMoney(v) {
  if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
  return money(v);
}

function monthlyPayment(principal, annualRate, years) {
  var monthlyRate = annualRate / 100 / 12;
  var months = years * 12;
  if (monthlyRate === 0) return principal / months;
  var growth = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * growth / (growth - 1);
}

function movingAverage(values, windowSize) {
  if (windowSize <= 1) return values.slice();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    if (values[i] == null) { out.push(null); continue; }
    var sum = 0, count = 0;
    for (var j = i; j > i - windowSize && j >= 0; j--) {
      if (values[j] != null) { sum += values[j]; count++; }
    }
    out.push(count >= Math.min(windowSize, 3) / 2 ? sum / count : null);
  }
  return out;
}

/* Find every Word Bank term that appears in a piece of plain text, and
   wrap the FIRST mention of each one in a highlighted, hover-defined span.
   Only ever run on text we wrote ourselves (event notes, intro copy) -
   never on raw spreadsheet values - so building HTML this way is safe. */
function wrapTerms(text) {
  var found = [];
  GLOSSARY_ORDER.forEach(function (key) {
    var label = GLOSSARY[key].label;
    var idx = text.toLowerCase().indexOf(label.toLowerCase());
    if (idx !== -1) found.push({ key: key, start: idx, end: idx + label.length });
  });
  /* Longer matches win ties, so "30-year fixed" beats a stray "fixed". */
  found.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });

  var picked = [], cursor = -1;
  found.forEach(function (m) {
    if (m.start >= cursor) { picked.push(m); cursor = m.end; }
  });
  if (!picked.length) return text;

  var out = "", pos = 0;
  picked.forEach(function (m) {
    out += text.slice(pos, m.start);
    var shown = text.slice(m.start, m.end);
    var def = GLOSSARY[m.key].def.replace(/"/g, "&quot;");
    out += '<span class="term" tabindex="0" data-tip="' + def + '">' + shown + "</span>";
    pos = m.end;
  });
  out += text.slice(pos);
  return out;
}

/* == 4. STARTUP ============================================================ */

fetch("data.json")
  .then(function (r) { return r.json(); })
  .then(function (payload) {
    ROWS = payload.rows;
    DATES = ROWS.map(function (r) { return toDate(r[0]).getTime(); });

    [1, 13, 52].forEach(function (w) {
      SMOOTHED[w] = {};
      SERIES.forEach(function (s) {
        var raw = ROWS.map(function (r) { return r[s.col]; });
        SMOOTHED[w][s.key] = movingAverage(raw, w);
      });
    });

    setupTabs();
    setupControls();
    setupTheme();
    setupFullscreen();
    setupTooltips();
    setupTour();

    var years = ((toDate(ROWS[ROWS.length - 1][0]) - toDate(ROWS[0][0])) / (365.25 * 24 * 3600 * 1000)).toFixed(0);
    $("qfWeeks").textContent = ROWS.length.toLocaleString("en-US");
    $("qfYears").textContent = years;
    $("introText").innerHTML = wrapTerms(
      "A mortgage rate is the yearly interest a bank charges to lend you money for a house. Every week since April 1971, " +
      "Freddie Mac has asked lenders what rate they are offering and written the answer down. That is " + ROWS.length.toLocaleString("en-US") +
      " weeks of history for you to explore. Pick a tab above to get started."
    );
    $("footRange").textContent = niceMonth(ROWS[0][0]) + " to " + niceDate(ROWS[ROWS.length - 1][0]);

    renderGlossary();
    applyPreset("10");
  })
  .catch(function (err) {
    document.querySelector(".page").insertAdjacentHTML("afterbegin",
      '<div class="card">Sorry - the data file could not be loaded. ' +
      'If you are opening this file directly from your hard drive, run it through ' +
      'a local web server instead (browsers block file reads otherwise).</div>');
    console.error(err);
  });

/* --- Tabs ---------------------------------------------------------------- */

var TAB_NAMES = ["start", "graph", "stats", "history", "calculator", "glossary"];

function setupTabs() {
  document.querySelectorAll(".tabbtn").forEach(function (btn) {
    btn.addEventListener("click", function () { showTab(btn.dataset.tab); });
  });
  var saved = null;
  try { saved = localStorage.getItem("mre-tab"); } catch (e) { /* ignore */ }
  showTab(TAB_NAMES.indexOf(saved) !== -1 ? saved : "start");
}

function showTab(name) {
  TAB_NAMES.forEach(function (t) {
    var panel = $("panel-" + t);
    var btn = $("tab-" + t);
    var active = t === name;
    if (panel) panel.hidden = !active;
    if (btn) btn.setAttribute("aria-selected", String(active));
  });
  state.activeTab = name;
  try { localStorage.setItem("mre-tab", name); } catch (e) { /* ignore */ }
  /* The chart measures its own pixel width, so it must be redrawn once its
     tab is actually visible - drawing into a hidden, zero-width box would
     produce an empty chart. */
  if (name === "graph" && ROWS.length) drawChart();
}

/* --- Controls -------------------------------------------------------------- */

function setupControls() {
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () { applyPreset(chip.dataset.years); });
  });

  var first = ROWS[0][0], last = ROWS[ROWS.length - 1][0];
  ["dateFrom", "dateTo"].forEach(function (id) {
    var el = $(id);
    el.min = first;
    el.max = last;
    el.addEventListener("change", function () {
      var f = $("dateFrom").value || first;
      var t = $("dateTo").value || last;
      if (toDate(f) > toDate(t)) return;
      state.from = toDate(f);
      state.to = toDate(t);
      state.preset = "custom";
      markChips();
      render();
    });
  });

  SERIES.forEach(function (s) {
    $(s.box).addEventListener("change", function () {
      state.visible[s.key] = this.checked;
      render();
    });
  });

  $("smoothSel").addEventListener("change", function () {
    state.window = parseInt(this.value, 10);
    render();
  });

  $("showEvents").addEventListener("change", function () { state.showEvents = this.checked; render(); });
  $("showTable").addEventListener("change", function () {
    state.showTable = this.checked;
    $("tableCard").hidden = !this.checked;
    render();
  });

  $("resetBtn").addEventListener("click", resetAll);
  $("csvBtn").addEventListener("click", downloadCSV);

  $("loanAmt").addEventListener("input", function () {
    var v = clampLoan(this.value);
    $("loanSlider").value = Math.min(1000000, Math.max(50000, v));
    renderCalculator();
  });
  $("loanSlider").addEventListener("input", function () {
    $("loanAmt").value = this.value;
    renderCalculator();
  });
  $("amortRateSelect").addEventListener("change", function () {
    renderAmortizationTable(lastCalcCells, parseInt(this.value, 10) || 0);
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (state.activeTab === "graph") drawChart(); }, 120);
  });
}

function clampLoan(raw) {
  var v = parseFloat(raw);
  if (isNaN(v) || v < 10000) v = 10000;
  if (v > 2000000) v = 2000000;
  return v;
}

function applyPreset(years) {
  var lastDate = toDate(ROWS[ROWS.length - 1][0]);
  state.to = lastDate;
  if (years === "all") {
    state.from = toDate(ROWS[0][0]);
  } else {
    var d = new Date(lastDate.getTime());
    d.setFullYear(d.getFullYear() - parseInt(years, 10));
    state.from = d;
  }
  state.preset = years;
  syncDateInputs();
  markChips();
  render();
}

function syncDateInputs() {
  $("dateFrom").value = isoOf(state.from);
  $("dateTo").value = isoOf(state.to);
}

function isoOf(d) {
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function markChips() {
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.setAttribute("aria-pressed", String(chip.dataset.years === state.preset));
  });
}

function resetAll() {
  state.visible = { r30: true, r15: true, arm: false };
  state.window = 1;
  state.showEvents = true;
  state.showTable = false;
  $("sr30").checked = true;
  $("sr15").checked = true;
  $("sarm").checked = false;
  $("smoothSel").value = "1";
  $("showEvents").checked = true;
  $("showTable").checked = false;
  $("tableCard").hidden = true;
  $("loanAmt").value = 300000;
  $("loanSlider").value = 300000;
  applyPreset("10");
}

/* == 5. RENDER ============================================================= */

function render() {
  var smooth = SMOOTHED[state.window];
  var fromT = state.from.getTime();
  var toT = state.to.getTime();

  view = [];
  for (var i = 0; i < ROWS.length; i++) {
    if (DATES[i] < fromT || DATES[i] > toT) continue;
    view.push({
      date: ROWS[i][0], t: DATES[i],
      r30: smooth.r30[i], r15: smooth.r15[i], arm: smooth.arm[i],
      raw30: ROWS[i][1], raw15: ROWS[i][2], rawArm: ROWS[i][3]
    });
  }

  hoverIndex = -1;
  if (state.activeTab === "graph") drawChart();
  renderLegend();
  renderTiles();
  renderInsights();
  renderEvents();
  renderTable();
  renderCalculator();
  updateChartSubtitle();
}

function activeSeries() {
  return SERIES.filter(function (s) { return state.visible[s.key]; });
}

function updateChartSubtitle() {
  var words = { 1: "weekly values", 13: "3-month moving average", 52: "1-year moving average" };
  $("chartSub").textContent =
    "Percent per year · " + words[state.window] +
    " · " + niceMonth(view.length ? view[0].date : ROWS[0][0]) +
    " to " + niceMonth(view.length ? view[view.length - 1].date : ROWS[ROWS.length - 1][0]);
}

/* == 6. THE CHART ========================================================== */

var SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function drawChart() {
  var svg = $("chart");
  svg.textContent = "";

  var series = activeSeries();
  var hasData = view.length > 0 && series.length > 0;
  $("chartEmpty").hidden = hasData;
  if (!hasData) { chartGeom = null; return; }

  var width = $("chartWrap").clientWidth || 800;
  var height = width < 560 ? 300 : (document.body.classList.contains("is-fullscreen") ? 460 : 400);
  var m = { top: 18, right: width < 560 ? 14 : 96, bottom: 30, left: 46 };
  var plotW = Math.max(10, width - m.left - m.right);
  var plotH = Math.max(10, height - m.top - m.bottom);

  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("height", height);

  var lo = Infinity, hi = -Infinity;
  view.forEach(function (row) {
    series.forEach(function (s) {
      var v = row[s.key];
      if (v == null) return;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    });
  });
  if (lo === Infinity) { chartGeom = null; return; }

  var pad = Math.max(0.25, (hi - lo) * 0.12);
  var yMin = Math.max(0, lo - pad);
  var yMax = hi + pad;

  var ticks = niceTicks(yMin, yMax, 5);
  yMin = Math.min(yMin, ticks[0]);
  yMax = Math.max(yMax, ticks[ticks.length - 1]);

  function xOf(t) {
    var span = view[view.length - 1].t - view[0].t || 1;
    return m.left + (t - view[0].t) / span * plotW;
  }
  function yOf(v) {
    return m.top + (yMax - v) / (yMax - yMin) * plotH;
  }

  chartGeom = { m: m, width: width, height: height, plotW: plotW, plotH: plotH, xOf: xOf, yOf: yOf };

  var ink = { grid: token("--grid"), axis: token("--axis"), muted: token("--text-muted"), sec: token("--text-secondary"), surface: token("--surface-1") };

  ticks.forEach(function (tv) {
    var y = yOf(tv);
    svg.appendChild(svgEl("line", { x1: m.left, x2: m.left + plotW, y1: y, y2: y, stroke: ink.grid, "stroke-width": 1 }));
    var label = svgEl("text", { x: m.left - 9, y: y + 4, "text-anchor": "end", fill: ink.muted, "font-size": 11, "font-family": "system-ui, sans-serif", "font-weight": 600 });
    label.textContent = tv.toFixed(tv % 1 === 0 ? 0 : 1) + "%";
    svg.appendChild(label);
  });

  var lastLabelX = -Infinity;
  var xTicks = pickYearTicks(view, width).filter(function (tick) {
    var x = xOf(tick.t);
    if (x - lastLabelX < 52) return false;
    lastLabelX = x;
    return true;
  });
  xTicks.forEach(function (tick) {
    var x = xOf(tick.t);
    svg.appendChild(svgEl("line", { x1: x, x2: x, y1: m.top + plotH, y2: m.top + plotH + 4, stroke: ink.axis, "stroke-width": 1 }));
    var label = svgEl("text", { x: x, y: m.top + plotH + 19, "text-anchor": "middle", fill: ink.muted, "font-size": 11, "font-family": "system-ui, sans-serif", "font-weight": 600 });
    label.textContent = tick.label;
    svg.appendChild(label);
  });

  svg.appendChild(svgEl("line", { x1: m.left, x2: m.left + plotW, y1: m.top + plotH, y2: m.top + plotH, stroke: ink.axis, "stroke-width": 2 }));

  if (state.showEvents) drawEventMarkers(svg, xOf, m, plotH, ink);

  series.forEach(function (s) {
    var d = "", pen = false;
    view.forEach(function (row) {
      var v = row[s.key];
      if (v == null) { pen = false; return; }
      d += (pen ? "L" : "M") + xOf(row.t).toFixed(1) + " " + yOf(v).toFixed(1) + " ";
      pen = true;
    });
    if (!d) return;
    svg.appendChild(svgEl("path", {
      d: d, fill: "none", stroke: token(s.color), "stroke-width": 2.5,
      "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": s.dash
    }));
  });

  if (m.right > 40) drawEndLabels(svg, series, xOf, yOf, m, plotW);

  var hit = svgEl("rect", { x: m.left, y: m.top, width: plotW, height: plotH, fill: "transparent", style: "cursor:crosshair" });
  svg.appendChild(hit);
  svg.appendChild(svgEl("g", { id: "crosshairLayer" }));
  attachHover(svg, hit);
}

function niceTicks(min, max, target) {
  var span = max - min || 1;
  var rough = span / target;
  var mag = Math.pow(10, Math.floor(Math.log10(rough)));
  var step = mag;
  [1, 2, 2.5, 5, 10].some(function (mult) {
    if (mag * mult >= rough) { step = mag * mult; return true; }
    return false;
  });
  var start = Math.floor(min / step) * step;
  var out = [];
  for (var v = start; v <= max + step * 0.001; v += step) {
    if (v >= min - step * 0.001) out.push(Math.round(v * 1000) / 1000);
  }
  return out.length ? out : [min, max];
}

function pickYearTicks(rows, width) {
  var firstYear = toDate(rows[0].date).getFullYear();
  var lastYear = toDate(rows[rows.length - 1].date).getFullYear();
  var years = lastYear - firstYear;
  var maxLabels = Math.max(3, Math.floor(width / 95));

  if (years <= 2) {
    var out = [], seen = {};
    var stride = Math.max(1, Math.ceil(rows.length / maxLabels));
    for (var i = 0; i < rows.length; i += stride) {
      var key = rows[i].date.slice(0, 7);
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ t: rows[i].t, label: niceMonth(rows[i].date) });
    }
    return out;
  }

  var step = Math.max(1, Math.ceil(years / maxLabels));
  [1, 2, 5, 10, 20, 25, 50].some(function (n) { if (n >= step) { step = n; return true; } return false; });

  var ticks = [];
  for (var y = Math.ceil(firstYear / step) * step; y <= lastYear; y += step) {
    for (var j = 0; j < rows.length; j++) {
      if (toDate(rows[j].date).getFullYear() === y) { ticks.push({ t: rows[j].t, label: String(y) }); break; }
    }
  }
  return ticks.length ? ticks : [{ t: rows[0].t, label: String(firstYear) }];
}

function drawEndLabels(svg, series, xOf, yOf, m, plotW) {
  var labels = [];
  series.forEach(function (s) {
    for (var i = view.length - 1; i >= 0; i--) {
      if (view[i][s.key] != null) {
        labels.push({ y: yOf(view[i][s.key]), x: xOf(view[i].t), name: s.name, color: token(s.color), val: view[i][s.key] });
        break;
      }
    }
  });

  labels.sort(function (a, b) { return a.y - b.y; });
  for (var i = 1; i < labels.length; i++) {
    if (labels[i].y - labels[i - 1].y < 26) labels[i].y = labels[i - 1].y + 26;
  }

  labels.forEach(function (L) {
    svg.appendChild(svgEl("line", { x1: L.x + 2, x2: m.left + plotW + 7, y1: yOf(L.val), y2: L.y - 3, stroke: L.color, "stroke-width": 1, opacity: 0.45 }));
    var name = svgEl("text", { x: m.left + plotW + 10, y: L.y - 3, fill: token("--text-secondary"), "font-size": 11, "font-family": "system-ui, sans-serif", "font-weight": 700 });
    name.textContent = L.name;
    svg.appendChild(name);
    var val = svgEl("text", { x: m.left + plotW + 10, y: L.y + 10, fill: L.color, "font-size": 12, "font-weight": 800, "font-family": "system-ui, sans-serif" });
    val.textContent = L.val.toFixed(2) + "%";
    svg.appendChild(val);
  });
}

function drawEventMarkers(svg, xOf, m, plotH, ink) {
  var placed = [];
  eventsInView().forEach(function (ev) {
    var t = toDate(ev.date).getTime();
    var x = xOf(t);
    if (placed.some(function (px) { return Math.abs(px - x) < 26; })) return;
    placed.push(x);
    svg.appendChild(svgEl("line", { x1: x, x2: x, y1: m.top + 6, y2: m.top + plotH, stroke: ink.axis, "stroke-width": 1, "stroke-dasharray": "3 4" }));
    svg.appendChild(svgEl("circle", { cx: x, cy: m.top + 6, r: 3.5, fill: ink.surface, stroke: ink.sec, "stroke-width": 1.5 }));
  });
}

function eventsInView() {
  if (!view.length) return [];
  var a = view[0].t, b = view[view.length - 1].t;
  return EVENTS.filter(function (ev) {
    var t = toDate(ev.date).getTime();
    return t >= a && t <= b;
  });
}

/* == 7. HOVER CROSSHAIR ==================================================== */

function attachHover(svg, hit) {
  hit.addEventListener("pointermove", function (e) {
    var box = svg.getBoundingClientRect();
    var x = (e.clientX - box.left) * (chartGeom.width / box.width);
    setHover(nearestIndex(x));
  });
  hit.addEventListener("pointerleave", function () { setHover(-1); });

  svg.setAttribute("tabindex", "0");
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    var i = hoverIndex < 0 ? view.length - 1 : hoverIndex + (e.key === "ArrowRight" ? 1 : -1);
    setHover(Math.max(0, Math.min(view.length - 1, i)));
  });
  svg.addEventListener("blur", function () { setHover(-1); });
}

function nearestIndex(px) {
  var best = 0, bestDist = Infinity;
  for (var i = 0; i < view.length; i++) {
    var d = Math.abs(chartGeom.xOf(view[i].t) - px);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function setHover(i) {
  hoverIndex = i;
  var layer = $("crosshairLayer");
  var tip = $("chartTip");
  if (!layer) return;
  layer.textContent = "";

  if (i < 0 || !view[i] || !chartGeom) { tip.hidden = true; return; }

  var row = view[i];
  var x = chartGeom.xOf(row.t);
  var m = chartGeom.m;

  layer.appendChild(svgEl("line", { x1: x, x2: x, y1: m.top, y2: m.top + chartGeom.plotH, stroke: token("--text-muted"), "stroke-width": 1 }));

  var rows = [];
  activeSeries().forEach(function (s) {
    var v = row[s.key];
    if (v == null) return;
    layer.appendChild(svgEl("circle", { cx: x, cy: chartGeom.yOf(v), r: 5, fill: token(s.color), stroke: token("--surface-1"), "stroke-width": 2.5 }));
    rows.push({ name: s.name, color: token(s.color), value: v });
  });

  showTooltip(row, rows, x);
}

function showTooltip(row, rows, x) {
  var tip = $("chartTip");
  tip.textContent = "";

  var head = document.createElement("div");
  head.className = "tt-date";
  head.textContent = "Week of " + niceDate(row.date) +
    (state.window > 1 ? " · " + (state.window === 13 ? "3-month" : "1-year") + " average" : "");
  tip.appendChild(head);

  if (!rows.length) {
    var none = document.createElement("div");
    none.className = "tt-none";
    none.textContent = "No data this week";
    tip.appendChild(none);
  }

  rows.forEach(function (r) {
    var line = document.createElement("div");
    line.className = "tt-row";
    var key = document.createElement("span");
    key.className = "tt-key";
    key.style.background = r.color;
    line.appendChild(key);
    var val = document.createElement("span");
    val.className = "tt-val";
    val.textContent = r.value.toFixed(2) + "%";
    line.appendChild(val);
    var name = document.createElement("span");
    name.className = "tt-name";
    name.textContent = r.name;
    line.appendChild(name);
    tip.appendChild(line);
  });

  if (state.showEvents) {
    var near = eventsInView().find(function (ev) {
      var diff = Math.abs(toDate(ev.date).getTime() - row.t);
      return diff < 1000 * 60 * 60 * 24 * 21;
    });
    if (near) {
      var box = document.createElement("div");
      box.className = "tt-event";
      var strong = document.createElement("strong");
      strong.textContent = near.title;
      box.appendChild(strong);
      tip.appendChild(box);
    }
  }

  tip.hidden = false;

  var wrapW = $("chartWrap").clientWidth;
  var scale = wrapW / chartGeom.width;
  var px = x * scale;
  var tipW = tip.offsetWidth;
  tip.style.left = (px + tipW + 20 > wrapW ? px - tipW - 14 : px + 14) + "px";
  tip.style.top = "16px";
}

/* == 8. LEGEND, TILES, INSIGHTS, HISTORY, TABLE ============================ */

function renderLegend() {
  var box = $("legend");
  box.textContent = "";
  activeSeries().forEach(function (s) {
    var item = document.createElement("span");
    item.className = "legend-item";
    var line = document.createElement("span");
    line.className = "legend-line";
    line.style.background = token(s.color);
    item.appendChild(line);
    var label = document.createElement("span");
    label.textContent = s.name;
    item.appendChild(label);
    box.appendChild(item);
  });
}

function thirtyYearInView() {
  return view.filter(function (r) { return r.r30 != null; });
}

function renderTiles() {
  var pts = thirtyYearInView();
  if (!pts.length) {
    ["tLatest", "tChange", "tHigh", "tLow", "tAvg"].forEach(function (id) { $(id).textContent = "–"; });
    ["tLatestNote", "tChangeNote", "tHighNote", "tLowNote", "tAvgNote"].forEach(function (id) { $(id).textContent = ""; });
    return;
  }

  var first = pts[0], last = pts[pts.length - 1];
  var high = pts.reduce(function (a, b) { return b.r30 > a.r30 ? b : a; });
  var low = pts.reduce(function (a, b) { return b.r30 < a.r30 ? b : a; });
  var avg = pts.reduce(function (sum, r) { return sum + r.r30; }, 0) / pts.length;

  $("tLatest").textContent = pct(last.r30);
  $("tLatestNote").textContent = "week of " + niceDate(last.date);

  var change = last.r30 - first.r30;
  var chEl = $("tChange");
  chEl.textContent = (change >= 0 ? "+" : "−") + Math.abs(change).toFixed(2) + " pts";
  chEl.className = "tile-value " + (change > 0.005 ? "up" : change < -0.005 ? "down" : "");
  $("tChangeNote").textContent = change > 0.005 ? "borrowing got more expensive"
    : change < -0.005 ? "borrowing got cheaper"
    : "essentially unchanged";

  $("tHigh").textContent = pct(high.r30);
  $("tHighNote").textContent = niceDate(high.date);
  $("tLow").textContent = pct(low.r30);
  $("tLowNote").textContent = niceDate(low.date);
  $("tAvg").textContent = pct(avg);
  $("tAvgNote").textContent = pts.length.toLocaleString("en-US") + " weeks measured";
}

function renderInsights() {
  var list = $("insights");
  list.textContent = "";
  var pts = thirtyYearInView();
  if (pts.length < 2) {
    addInsight(list, "Pick a wider time range in <strong>0 &middot; Controls</strong> to see calculated observations here.");
    return;
  }

  var first = pts[0], last = pts[pts.length - 1];
  var change = last.r30 - first.r30;
  var high = pts.reduce(function (a, b) { return b.r30 > a.r30 ? b : a; });
  var low = pts.reduce(function (a, b) { return b.r30 < a.r30 ? b : a; });
  var avg = pts.reduce(function (s, r) { return s + r.r30; }, 0) / pts.length;
  var years = (last.t - first.t) / (365.25 * 24 * 3600 * 1000);

  var dir = change > 0.05 ? "rose" : change < -0.05 ? "fell" : "barely moved";
  addInsight(list,
    "Across these <strong>" + years.toFixed(1) + " years</strong>, the 30-year rate " + dir +
    " from <strong>" + pct(first.r30) + "</strong> to <strong>" + pct(last.r30) + "</strong>" +
    (Math.abs(change) > 0.05 ? ", a move of <strong>" + Math.abs(change).toFixed(2) + " percentage points</strong>." : "."));

  addInsight(list,
    "The gap between the cheapest week (<strong>" + pct(low.r30) + "</strong>, " + niceMonth(low.date) +
    ") and the dearest (<strong>" + pct(high.r30) + "</strong>, " + niceMonth(high.date) +
    ") is <strong>" + (high.r30 - low.r30).toFixed(2) + " points</strong>. On a $300,000 loan that is about <strong>" +
    money(monthlyPayment(300000, high.r30, 30) - monthlyPayment(300000, low.r30, 30)) +
    " a month</strong> in difference for the same house.");

  var vsAvg = last.r30 - avg;
  addInsight(list,
    "The latest reading is <strong>" + Math.abs(vsAvg).toFixed(2) + " points " +
    (vsAvg >= 0 ? "above" : "below") + "</strong> the average for this window (" + pct(avg) +
    "). Whether a rate feels 'high' depends entirely on which window you compare it to.");

  var all = ROWS.filter(function (r) { return r[1] != null; }).map(function (r) { return r[1]; });
  var below = all.filter(function (v) { return v < last.r30; }).length;
  var rank = Math.round(below / all.length * 100);
  addInsight(list,
    "Measured against all " + all.length.toLocaleString("en-US") + " weeks ever recorded, " + pct(last.r30) +
    " is higher than <strong>" + rank + "%</strong> of them. The full-history average is <strong>7.68%</strong>" +
    (last.r30 < 7.68 ? ", so by the long view today is still on the cheap side." : "."));

  var jump = null;
  for (var i = 1; i < pts.length; i++) {
    var d = pts[i].r30 - pts[i - 1].r30;
    if (jump === null || Math.abs(d) > Math.abs(jump.d)) jump = { d: d, date: pts[i].date };
  }
  if (jump && Math.abs(jump.d) >= 0.05) {
    addInsight(list,
      "The sharpest single week was <strong>" + (jump.d > 0 ? "+" : "−") + Math.abs(jump.d).toFixed(2) +
      " points</strong> in " + niceMonth(jump.date) +
      ". Sudden steps like this are why analysts smooth their data before reading a trend.");
  }

  if (state.visible.r30 && state.visible.r15) {
    var both = view.filter(function (r) { return r.r30 != null && r.r15 != null; });
    if (both.length) {
      var gap = both.reduce(function (s, r) { return s + (r.r30 - r.r15); }, 0) / both.length;
      addInsight(list,
        "On average the 15-year loan cost <strong>" + gap.toFixed(2) + " points less</strong> than the 30-year here. " +
        "Lenders discount the shorter loan because they get their money back sooner — but the monthly payment is far higher.");
    }
  }

  if (state.visible.arm) {
    var armPts = view.filter(function (r) { return r.arm != null; });
    if (!armPts.length) {
      addInsight(list, "The 5/1 ARM line is empty in this window. That series only ran from <strong>January 2005 to November 2022</strong> — a blank stretch means 'not measured', not 'zero'.");
    } else if (armPts[armPts.length - 1].date < view[view.length - 1].date) {
      addInsight(list, "The 5/1 ARM line stops in <strong>November 2022</strong>, when Freddie Mac ended that series. Always check whether a line ends because the data ran out or because the story did.");
    }
  }
}

function addInsight(list, html) {
  var li = document.createElement("li");
  var span = document.createElement("span");
  span.innerHTML = html;
  li.appendChild(span);
  list.appendChild(li);
}

function renderEvents() {
  var box = $("eventList");
  box.textContent = "";
  var evs = eventsInView();

  if (!evs.length) {
    var p = document.createElement("p");
    p.className = "events-empty";
    p.textContent = "No marked events fall inside this window. Try widening the time range in 0 · Controls.";
    box.appendChild(p);
    return;
  }

  evs.forEach(function (ev) {
    var card = document.createElement("div");
    card.className = "event";
    var when = document.createElement("div");
    when.className = "event-when";
    when.textContent = niceDate(ev.date);
    card.appendChild(when);
    var title = document.createElement("div");
    title.className = "event-title";
    title.textContent = ev.title;
    card.appendChild(title);
    var text = document.createElement("p");
    text.className = "event-text";
    text.innerHTML = wrapTerms(ev.text);   /* our own authored copy - safe to inject */
    card.appendChild(text);
    box.appendChild(card);
  });
}

function renderTable() {
  if (!state.showTable) return;
  var head = $("tableHead"), body = $("tableBody");
  head.textContent = "";
  body.textContent = "";

  var cols = ["Week"].concat(activeSeries().map(function (s) { return s.name; }));
  var tr = document.createElement("tr");
  cols.forEach(function (c) {
    var th = document.createElement("th");
    th.textContent = c;
    tr.appendChild(th);
  });
  head.appendChild(tr);

  var rows = view.slice().reverse().slice(0, 300);
  rows.forEach(function (r) {
    var row = document.createElement("tr");
    var td = document.createElement("td");
    td.textContent = niceDate(r.date);
    row.appendChild(td);
    activeSeries().forEach(function (s) {
      var cell = document.createElement("td");
      var v = r[s.key];
      cell.textContent = v == null ? "—" : v.toFixed(2) + "%";
      row.appendChild(cell);
    });
    body.appendChild(row);
  });

  $("tableSub").textContent = state.window > 1
    ? "Smoothed values (" + (state.window === 13 ? "3-month" : "1-year") + " moving average), newest first."
    : "Raw weekly survey values, newest first.";
  $("tableFoot").textContent = view.length > 300
    ? "Showing the most recent 300 of " + view.length.toLocaleString("en-US") + " weeks in this range. Use Download CSV for the complete set."
    : "Showing all " + view.length.toLocaleString("en-US") + " weeks in this range.";
}

/* == 9. CALCULATOR + AMORTIZATION ========================================== */

function renderCalculator() {
  var box = $("calcResults");
  box.textContent = "";
  var loan = clampLoan($("loanAmt").value);
  $("calcNote").innerHTML = wrapTerms(
    "Every payment below is for a 30-year loan and covers only principal and interest — not property taxes or insurance."
  );

  var pts = thirtyYearInView();
  if (!pts.length) { $("calcLesson").textContent = ""; lastCalcCells = []; $("amortRateSelect").innerHTML = ""; return; }

  var last = pts[pts.length - 1];
  var high = pts.reduce(function (a, b) { return b.r30 > a.r30 ? b : a; });
  var low = pts.reduce(function (a, b) { return b.r30 < a.r30 ? b : a; });

  var cells = [
    { label: "Latest in range", rate: last.r30, when: niceMonth(last.date) },
    { label: "Cheapest in range", rate: low.r30, when: niceMonth(low.date) },
    { label: "Dearest in range", rate: high.r30, when: niceMonth(high.date) },
    { label: "All-time low", rate: 2.65, when: "Jan 2021" },
    { label: "All-time high", rate: 18.63, when: "Oct 1981" }
  ];
  lastCalcCells = cells;

  cells.forEach(function (c) {
    var pay = monthlyPayment(loan, c.rate, 30);
    var totalInterest = pay * 360 - loan;

    var cell = document.createElement("div");
    cell.className = "calc-cell";
    var lab = document.createElement("div");
    lab.className = "calc-cell-label";
    lab.textContent = c.label;
    cell.appendChild(lab);
    var rate = document.createElement("div");
    rate.className = "calc-cell-rate";
    rate.textContent = c.rate.toFixed(2) + "% · " + c.when;
    cell.appendChild(rate);
    var val = document.createElement("div");
    val.className = "calc-cell-value";
    val.textContent = money(pay) + "/mo";
    cell.appendChild(val);
    var sub = document.createElement("div");
    sub.className = "calc-cell-sub";
    sub.textContent = bigMoney(totalInterest) + " interest over 30 years";
    cell.appendChild(sub);
    box.appendChild(cell);
  });

  var payNow = monthlyPayment(loan, last.r30, 30);
  var payLow = monthlyPayment(loan, low.r30, 30);
  var gap = payNow - payLow;
  var lesson = $("calcLesson");

  if (Math.abs(gap) < 1) {
    lesson.innerHTML = "At " + pct(last.r30) + ", borrowing " + money(loan) +
      " costs about <strong>" + money(payNow) + " a month</strong> — and that is the cheapest this range ever got.";
  } else {
    lesson.innerHTML = "Borrowing " + money(loan) + " at today's " + pct(last.r30) + " costs <strong>" +
      money(payNow) + " a month</strong>. At this range's best rate of " + pct(low.r30) + " the very same loan would be <strong>" +
      money(payLow) + "</strong> — a difference of <strong>" + money(Math.abs(gap)) +
      " every month</strong>, or <strong>" + bigMoney(Math.abs(gap) * 360) +
      "</strong> across the full 30 years. That is what a couple of percentage points is really worth.";
  }

  /* Rebuild the amortization scenario dropdown, keeping the same selection
     if it is still valid, then redraw the schedule for whatever is chosen. */
  var sel = $("amortRateSelect");
  var prevIndex = sel.selectedIndex;
  sel.innerHTML = "";
  cells.forEach(function (c, i) {
    var opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = c.label + " (" + c.rate.toFixed(2) + "%)";
    sel.appendChild(opt);
  });
  sel.selectedIndex = (prevIndex >= 0 && prevIndex < cells.length) ? prevIndex : 0;

  $("amortTitle").innerHTML = wrapTerms("The amortization table");
  $("amortSub").innerHTML = wrapTerms("Every one of your 360 monthly payments, added up year by year, for the loan amount above.");

  renderAmortizationTable(cells, sel.selectedIndex);
}

/* Build a year-by-year payoff schedule: for every month, work out how much
   of that month's fixed payment covers interest versus how much actually
   shrinks the balance, then add the 12 months of each year together. */
function amortizationSchedule(principal, annualRate, years) {
  var pay = monthlyPayment(principal, annualRate, years);
  var monthlyRate = annualRate / 100 / 12;
  var balance = principal;
  var rows = [];
  var yearPrincipal = 0, yearInterest = 0, startBalance = balance;

  for (var mo = 1; mo <= years * 12; mo++) {
    var interest = balance * monthlyRate;
    var principalPaid = pay - interest;
    balance = Math.max(0, balance - principalPaid);
    yearPrincipal += principalPaid;
    yearInterest += interest;
    if (mo % 12 === 0 || mo === years * 12) {
      rows.push({ year: Math.ceil(mo / 12), start: startBalance, principal: yearPrincipal, interest: yearInterest, end: balance });
      startBalance = balance; yearPrincipal = 0; yearInterest = 0;
    }
  }
  return { payment: pay, rows: rows };
}

function renderAmortizationTable(cells, index) {
  var body = $("amortBody");
  body.textContent = "";
  if (!cells || !cells.length) { $("amortLesson").textContent = ""; return; }

  var scenario = cells[index] || cells[0];
  var loan = clampLoan($("loanAmt").value);
  var sched = amortizationSchedule(loan, scenario.rate, 30);

  sched.rows.forEach(function (r) {
    var tr = document.createElement("tr");
    [String(r.year), money(r.start), money(r.interest), money(r.principal), money(r.end)].forEach(function (val, i) {
      var td = document.createElement("td");
      td.textContent = val;
      if (i === 0) td.style.textAlign = "left";
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  var first = sched.rows[0], last = sched.rows[sched.rows.length - 1];
  $("amortLesson").innerHTML = wrapTerms(
    "This is what amortization means: in Year 1, " + money(first.interest) + " of your payments is interest and only " +
    money(first.principal) + " actually shrinks the loan. By Year " + last.year + ", that flips — " +
    money(last.principal) + " goes to principal and just " + money(last.interest) + " is interest. Early payments are " +
    "mostly the cost of borrowing; late payments are mostly paying the loan off."
  );
}

/* == 10. GLOSSARY / WORD BANK =============================================== */

function renderGlossary() {
  var list = $("glossaryList");
  var jump = $("glossaryJump");
  list.textContent = "";
  jump.textContent = "";

  var seenLetters = {};
  GLOSSARY_ORDER.forEach(function (key) {
    var entry = GLOSSARY[key];
    var letter = entry.label.charAt(0).toUpperCase();

    var row = document.createElement("div");
    row.className = "gloss-entry";
    row.id = "term-" + key;
    var term = document.createElement("div");
    term.className = "gloss-term";
    term.innerHTML = '<span class="gloss-letter">' + letter + "</span>" + entry.label.slice(1);
    row.appendChild(term);
    var def = document.createElement("div");
    def.className = "gloss-def";
    def.textContent = entry.def;
    row.appendChild(def);
    list.appendChild(row);

    if (!seenLetters[letter]) {
      seenLetters[letter] = true;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jump-btn";
      btn.textContent = letter;
      btn.addEventListener("click", function () { row.scrollIntoView({ behavior: "smooth", block: "start" }); });
      jump.appendChild(btn);
    }
  });
}

/* == 11. THEME, FULL SCREEN, CSV, TOOLTIPS, TOUR ============================ */

function setupTheme() {
  var saved = null;
  try { saved = localStorage.getItem("mre-theme"); } catch (e) { /* private mode */ }
  applyTheme(saved || "system");

  document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(btn.dataset.themeChoice);
      if (ROWS.length && state.activeTab === "graph") drawChart();
    });
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (document.documentElement.dataset.theme === undefined && ROWS.length && state.activeTab === "graph") drawChart();
    });
  }
}

function applyTheme(mode) {
  if (mode === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }
  try { localStorage.setItem("mre-theme", mode); } catch (e) { /* ignore */ }

  document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
    btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === mode));
  });
}

/* Full Screen: asks the browser to hide its own chrome so the tool fills
   the display. Some browsers block this unless it is triggered directly by
   a click, and some (like an embedded preview frame) forbid it outright -
   both cases are handled quietly rather than showing a scary error. */
function setupFullscreen() {
  var btn = $("fullscreenBtn");
  var supported = !!(document.documentElement.requestFullscreen || document.exitFullscreen);
  if (!supported) {
    btn.disabled = true;
    btn.dataset.tip = "Your browser does not support full screen mode here.";
    return;
  }

  btn.addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () { /* blocked - ignore quietly */ });
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", function () {
    var on = !!document.fullscreenElement;
    btn.setAttribute("aria-pressed", String(on));
    btn.querySelector(".seg-label").textContent = on ? "Exit Full Screen" : "Full Screen";
    document.body.classList.toggle("is-fullscreen", on);
    if (ROWS.length && state.activeTab === "graph") drawChart();
  });
}

function downloadCSV() {
  var series = activeSeries();
  var lines = ["Week," + series.map(function (s) { return '"' + s.name + '"'; }).join(",")];

  view.forEach(function (r) {
    var cells = [r.date];
    series.forEach(function (s) { cells.push(r[s.key] == null ? "" : r[s.key].toFixed(2)); });
    lines.push(cells.join(","));
  });

  var note = state.window > 1 ? "# values are a " + state.window + "-week moving average" : "# raw weekly values";
  var csv = "# Freddie Mac Primary Mortgage Market Survey\n" + note + "\n" + lines.join("\n");

  var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "mortgage-rates-" + isoOf(state.from) + "-to-" + isoOf(state.to) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* The shared "?" tooltip bubble - reused by every "?" button AND every
   highlighted Word Bank term, since both just carry a [data-tip]. */
function setupTooltips() {
  var bubble = $("tipbubble");

  function show(el) {
    var text = el.dataset.tip;
    if (!text) return;
    bubble.textContent = text;
    bubble.hidden = false;

    var r = el.getBoundingClientRect();
    var w = bubble.offsetWidth, h = bubble.offsetHeight;
    var left = Math.min(window.innerWidth - w - 10, Math.max(10, r.left + r.width / 2 - w / 2));
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 10) top = r.top - h - 8;
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
  }
  function hide() { bubble.hidden = true; }

  document.addEventListener("pointerover", function (e) {
    var el = e.target.closest("[data-tip]");
    if (el) show(el);
  });
  document.addEventListener("pointerout", function (e) {
    if (e.target.closest("[data-tip]")) hide();
  });
  document.addEventListener("focusin", function (e) {
    var el = e.target.closest("[data-tip]");
    if (el) show(el);
  });
  document.addEventListener("focusout", hide);
  document.addEventListener("scroll", hide, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
}

/* The guided tour: a dimming overlay with a hole cut around one element.
   Every step lives on chrome that is visible from any tab, so the tour
   never has to switch tabs on the learner's behalf - it just points, and
   lets them click. */
var tourAt = 0;

function setupTour() {
  $("tourBtn").addEventListener("click", startTour);
  $("tourBtn2").addEventListener("click", startTour);
  $("tourNext").addEventListener("click", function () { stepTour(1); });
  $("tourPrev").addEventListener("click", function () { stepTour(-1); });
  $("tourSkip").addEventListener("click", endTour);
  document.addEventListener("keydown", function (e) {
    if ($("tour").hidden) return;
    if (e.key === "Escape") endTour();
    if (e.key === "ArrowRight") stepTour(1);
    if (e.key === "ArrowLeft") stepTour(-1);
  });

  var seen = null;
  try { seen = localStorage.getItem("mre-tour"); } catch (e) { /* ignore */ }
  if (!seen) setTimeout(startTour, 700);
}

function startTour() {
  tourAt = 0;
  $("tour").hidden = false;
  showTourStep();
}

function stepTour(dir) {
  tourAt += dir;
  if (tourAt < 0) tourAt = 0;
  if (tourAt >= TOUR.length) { endTour(); return; }
  showTourStep();
}

function showTourStep() {
  var step = TOUR[tourAt];
  var target = document.querySelector(step.sel);
  if (!target) { stepTour(1); return; }

  target.scrollIntoView({ block: "center", behavior: "smooth" });

  setTimeout(function () {
    var r = target.getBoundingClientRect();
    var pad = 8;
    var spot = $("tourSpot");
    spot.style.left = (r.left - pad) + "px";
    spot.style.top = (r.top - pad) + "px";
    spot.style.width = (r.width + pad * 2) + "px";
    spot.style.height = (r.height + pad * 2) + "px";

    $("tourStep").textContent = "Step " + (tourAt + 1) + " of " + TOUR.length;
    $("tourTitle").textContent = step.title;
    $("tourText").textContent = step.text;
    $("tourPrev").disabled = tourAt === 0;
    $("tourNext").textContent = tourAt === TOUR.length - 1 ? "Finish" : "Next";

    var box = $("tourBox");
    var bh = box.offsetHeight, bw = box.offsetWidth;
    var top = r.bottom + 16;
    if (top + bh > window.innerHeight - 12) top = Math.max(12, r.top - bh - 16);
    var left = Math.min(window.innerWidth - bw - 16, Math.max(16, r.left));
    box.style.top = top + "px";
    box.style.left = left + "px";
  }, 320);
}

function endTour() {
  $("tour").hidden = true;
  try { localStorage.setItem("mre-tour", "done"); } catch (e) { /* ignore */ }
}
