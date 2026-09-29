/* ==========================================================================
   Mortgage Rate Explorer - all the interactive logic
   --------------------------------------------------------------------------
   HOW THIS FILE IS ORGANISED

     1.  Settings: the series, the history notes, the tour script
     2.  State: the handful of variables describing "what is on screen now"
     3.  Little helper functions (dates, formatting, maths)
     4.  Startup: load the data, wire up every control
     5.  render(): the one function that redraws the whole page
     6.  drawChart(): builds the SVG line chart by hand
     7.  The hover crosshair and tooltip
     8.  Stat tiles, insights, table, calculator
     9.  Theme switching, CSV download, guided tour

   A note on style: this file deliberately avoids clever shortcuts. Everything
   is a plainly named function doing one job, so you can read it top to bottom.
   ========================================================================== */

/* == 1. SETTINGS ========================================================== */

/* The three data series. "key" is how we refer to it in code, "col" is which
   position it sits in inside each row of data.json, and "color" is the CSS
   token name so the line automatically recolors when the theme changes. */
var SERIES = [
  { key: "r30", col: 1, name: "30-year fixed", color: "--series-1", dash: "",       box: "sr30" },
  { key: "r15", col: 2, name: "15-year fixed", color: "--series-2", dash: "7 4",    box: "sr15" },
  { key: "arm", col: 3, name: "5/1 ARM",       color: "--series-3", dash: "2 4",    box: "sarm" }
];

/* Curated history notes. Every number quoted here was read straight out of the
   spreadsheet, so the markers and the chart can never disagree. */
var EVENTS = [
  {
    date: "1971-04-02",
    title: "The survey begins",
    text: "Freddie Mac records its very first weekly average: 7.33% on a 30-year fixed loan. Everything on this chart starts here."
  },
  {
    date: "1980-04-11",
    title: "The fastest climb ever recorded",
    text: "In just 52 weeks the 30-year rate leapt from 10.48% to 16.35% - a rise of 5.87 points, still the steepest one-year jump in the survey's history."
  },
  {
    date: "1981-10-09",
    title: "The all-time peak: 18.63%",
    text: "To crush double-digit inflation, the Federal Reserve pushed borrowing costs to punishing levels. This single week remains the most expensive in 55 years of record-keeping."
  },
  {
    date: "1983-02-11",
    title: "The fastest fall ever recorded",
    text: "The mirror image of 1980: rates dropped 4.59 points in a year, from 17.65% down to 13.06%, as inflation finally broke."
  },
  {
    date: "1986-04-04",
    title: "Back under 10%",
    text: "For the first time since 1978, a 30-year loan cost single-digit interest - 9.99%. Rates would not return to double digits again for good."
  },
  {
    date: "1991-08-30",
    title: "The 15-year loan joins the survey",
    text: "The orange line starts here. Before this week there simply is no 15-year data to plot - a blank stretch on a chart usually means 'not measured', not 'zero'."
  },
  {
    date: "2003-06-13",
    title: "A then-record low of 5.21%",
    text: "What felt astonishingly cheap in 2003 would look expensive again within twenty years. Context is everything when reading a chart."
  },
  {
    date: "2005-01-06",
    title: "The 5/1 ARM joins the survey",
    text: "The green line starts here. Adjustable-rate loans were popular in the run-up to the housing bubble because they opened with a lower rate."
  },
  {
    date: "2008-09-12",
    title: "The global financial crisis",
    text: "The housing crash reshaped lending. Notice that mortgage rates fell rather than spiked - lenders followed a collapsing economy down."
  },
  {
    date: "2009-01-15",
    title: "Under 5% for the first time",
    text: "Emergency policy after the crash pushed a 30-year loan to 4.96%, a level no borrower had ever seen in this dataset before."
  },
  {
    date: "2012-11-21",
    title: "A post-crisis floor of 3.31%",
    text: "Years of low rates made this the cheapest borrowing in history to that point - and it still had further to fall."
  },
  {
    date: "2020-03-05",
    title: "The pandemic arrives",
    text: "COVID-19 sent investors rushing to safety, which dragged mortgage rates down. By July 2020 a 30-year loan cost under 3% for the first time ever."
  },
  {
    date: "2021-01-07",
    title: "The all-time low: 2.65%",
    text: "The cheapest week in 55 years - roughly one seventh the cost of the 1981 peak on the very same loan."
  },
  {
    date: "2022-11-10",
    title: "The ARM series ends",
    text: "Freddie Mac stopped publishing 5/1 ARM rates. The green line stops here for that reason alone - the loans still exist, they are just no longer surveyed."
  },
  {
    date: "2023-10-26",
    title: "7.79% - a 23-year high",
    text: "Rates more than doubled in two years as the Fed fought inflation again. Nobody who bought a house in 2021 would recognise this market."
  }
];

/* The guided tour. Each step points at an element and explains it. */
var TOUR = [
  { sel: "#ctlRange",   title: "Start with time",       text: "Every chart question begins with 'over what period?'. These buttons jump to common windows; the date boxes below let you pick any window you like. Everything else on the page obeys this setting." },
  { sel: "#ctlSeries",  title: "Choose what to compare", text: "Each tick box adds one kind of home loan to the chart. Two lines side by side answer questions a single line cannot - like which loan was cheaper, and by how much." },
  { sel: "#ctlSmooth",  title: "Cut through the noise",  text: "Raw weekly data jiggles. A moving average blends several weeks together so the real trend shows. Flip between the options and watch the spikes melt away." },
  { sel: "#tiles",      title: "The headline numbers",   text: "Five summary statistics for whatever range you picked. They recalculate the instant you change a control, so they always match the chart above them." },
  { sel: "#chartCard",  title: "Read the chart",         text: "Time runs left to right, rate runs bottom to top. Slide your mouse across it and a vertical line will follow, showing you every series' exact value for that week." },
  { sel: "#insightCard", title: "Insights in plain English", text: "Rather than leaving you to interpret the shapes, this card writes out what your selected range actually shows - and lists the historical moments inside it." },
  { sel: "#calcCard",   title: "Turn percent into dollars", text: "This is why rates matter. Type in a loan size and see what the same house would cost per month at the best and worst rates in your range." },
  { sel: ".segmented",  title: "Make it yours",          text: "Switch between light, dark and automatic colors. The chart's palette was tested for color-blind readability in both themes, so the lines stay tellable apart either way." }
];

/* == 2. STATE ============================================================= */

/* ROWS holds the whole dataset once loaded: [dateString, r30, r15, arm]. */
var ROWS = [];
var DATES = [];       /* the same dates converted to time numbers, for the x axis */
var SMOOTHED = {};    /* cache of moving-average versions of each series */

/* "state" is the single description of what the user has chosen. */
var state = {
  from: null,        /* Date object */
  to: null,          /* Date object */
  preset: "10",      /* which chip is lit, or "custom" */
  visible: { r30: true, r15: true, arm: false },
  window: 1,         /* smoothing window in weeks: 1, 13 or 52 */
  showEvents: true,
  showTable: false
};

var view = [];       /* the rows currently inside the selected range */
var hoverIndex = -1; /* which week the crosshair is on, -1 for none */
var chartGeom = null;/* remembered chart measurements, used by the crosshair */

/* == 3. HELPERS =========================================================== */

function $(id) { return document.getElementById(id); }

/* Turn "2021-01-07" into a real Date. We add T00:00 so the browser reads it
   in local time rather than shifting it by a timezone. */
function toDate(s) { return new Date(s + "T00:00:00"); }

/* Read a CSS token (like --series-1) and get back the actual color. Doing it
   this way means the chart repaints correctly whenever the theme changes. */
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* "2021-01-07" -> "Jan 7, 2021" */
function niceDate(s) {
  var d = toDate(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
/* "2021-01-07" -> "Jan 2021" */
function niceMonth(s) {
  return toDate(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/* 6.5 -> "6.50%" */
function pct(v) { return v == null ? "n/a" : v.toFixed(2) + "%"; }

/* 1234.5 -> "$1,235" */
function money(v) {
  return "$" + Math.round(v).toLocaleString("en-US");
}

/* 1234567 -> "$1.23M", for large totals */
function bigMoney(v) {
  if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
  return money(v);
}

/* The standard monthly payment formula for a fixed-rate loan.
     principal = amount borrowed
     annualRate = e.g. 6.5 for 6.5%
     years = 30
   It answers: "what equal payment, made every month, exactly clears this
   loan plus interest by the end?" */
function monthlyPayment(principal, annualRate, years) {
  var monthlyRate = annualRate / 100 / 12;
  var months = years * 12;
  if (monthlyRate === 0) return principal / months;
  var growth = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * growth / (growth - 1);
}

/* A trailing moving average: each point becomes the average of itself and the
   previous (windowSize - 1) points. Gaps (nulls) are skipped, not treated as
   zero, which matters because a missing week is "unknown", not "0%". */
function movingAverage(values, windowSize) {
  if (windowSize <= 1) return values.slice();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    if (values[i] == null) { out.push(null); continue; }
    var sum = 0, count = 0;
    for (var j = i; j > i - windowSize && j >= 0; j--) {
      if (values[j] != null) { sum += values[j]; count++; }
    }
    /* Only report an average once we have at least half a window of real
       data, otherwise the first few points would be misleadingly jumpy. */
    out.push(count >= Math.min(windowSize, 3) / 2 ? sum / count : null);
  }
  return out;
}

/* == 4. STARTUP =========================================================== */

/* Fetch the data file, then build the page. */
fetch("data.json")
  .then(function (r) { return r.json(); })
  .then(function (payload) {
    ROWS = payload.rows;
    DATES = ROWS.map(function (r) { return toDate(r[0]).getTime(); });

    /* Pre-compute the smoothed versions once, for every window size, so
       flipping the Smoothing control feels instant. */
    [1, 13, 52].forEach(function (w) {
      SMOOTHED[w] = {};
      SERIES.forEach(function (s) {
        var raw = ROWS.map(function (r) { return r[s.col]; });
        SMOOTHED[w][s.key] = movingAverage(raw, w);
      });
    });

    setupControls();
    setupTheme();
    setupTooltips();
    setupTour();

    $("introCount").textContent = ROWS.length.toLocaleString("en-US");
    $("footRange").textContent = niceMonth(ROWS[0][0]) + " to " + niceDate(ROWS[ROWS.length - 1][0]);

    applyPreset("10");   /* open on the last 10 years - recent but with context */
  })
  .catch(function (err) {
    document.querySelector(".page").insertAdjacentHTML("afterbegin",
      '<div class="card">Sorry - the data file could not be loaded. ' +
      'If you are opening this file directly from your hard drive, run it through ' +
      'a local web server instead (browsers block file reads otherwise).</div>');
    console.error(err);
  });

/* Attach every control to the render() function. */
function setupControls() {
  /* Time-range chips */
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () { applyPreset(chip.dataset.years); });
  });

  /* Custom date boxes */
  var first = ROWS[0][0], last = ROWS[ROWS.length - 1][0];
  ["dateFrom", "dateTo"].forEach(function (id) {
    var el = $(id);
    el.min = first;
    el.max = last;
    el.addEventListener("change", function () {
      var f = $("dateFrom").value || first;
      var t = $("dateTo").value || last;
      if (toDate(f) > toDate(t)) return;    /* ignore a backwards range */
      state.from = toDate(f);
      state.to = toDate(t);
      state.preset = "custom";
      markChips();
      render();
    });
  });

  /* Series tick boxes */
  SERIES.forEach(function (s) {
    $(s.box).addEventListener("change", function () {
      state.visible[s.key] = this.checked;
      render();
    });
  });

  /* Smoothing */
  $("smoothSel").addEventListener("change", function () {
    state.window = parseInt(this.value, 10);
    render();
  });

  /* Display toggles */
  $("showEvents").addEventListener("change", function () { state.showEvents = this.checked; render(); });
  $("showTable").addEventListener("change", function () {
    state.showTable = this.checked;
    $("tableCard").hidden = !this.checked;
    render();
  });

  /* Buttons */
  $("resetBtn").addEventListener("click", resetAll);
  $("csvBtn").addEventListener("click", downloadCSV);

  /* Calculator: the number box and the slider stay in sync with each other. */
  $("loanAmt").addEventListener("input", function () {
    var v = clampLoan(this.value);
    $("loanSlider").value = Math.min(1000000, Math.max(50000, v));
    renderCalculator();
  });
  $("loanSlider").addEventListener("input", function () {
    $("loanAmt").value = this.value;
    renderCalculator();
  });

  /* Redraw when the window is resized, because the chart is measured in pixels. */
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 120);
  });
}

function clampLoan(raw) {
  var v = parseFloat(raw);
  if (isNaN(v) || v < 10000) v = 10000;
  if (v > 2000000) v = 2000000;
  return v;
}

/* Jump to a preset window like "last 5 years". */
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

/* Date object -> "YYYY-MM-DD" */
function isoOf(d) {
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

/* Light up whichever preset chip matches the current range. */
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

/* == 5. RENDER ============================================================ */

/* The single place that redraws everything. Any control change ends here. */
function render() {
  /* Step 1: cut the full dataset down to the selected date range, and swap in
     the smoothed values if the user asked for smoothing. */
  var smooth = SMOOTHED[state.window];
  var fromT = state.from.getTime();
  var toT = state.to.getTime();

  view = [];
  for (var i = 0; i < ROWS.length; i++) {
    if (DATES[i] < fromT || DATES[i] > toT) continue;
    view.push({
      date: ROWS[i][0],
      t: DATES[i],
      r30: smooth.r30[i],
      r15: smooth.r15[i],
      arm: smooth.arm[i],
      /* keep the unsmoothed numbers too, for the table and the tooltip */
      raw30: ROWS[i][1], raw15: ROWS[i][2], rawArm: ROWS[i][3]
    });
  }

  hoverIndex = -1;
  drawChart();
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

/* == 6. THE CHART ========================================================= */

var SVG_NS = "http://www.w3.org/2000/svg";

/* A tiny helper so we are not repeating createElementNS everywhere. */
function svgEl(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function drawChart() {
  var svg = $("chart");
  svg.textContent = "";               /* clear last frame */

  var series = activeSeries();
  var hasData = view.length > 0 && series.length > 0;
  $("chartEmpty").hidden = hasData;
  if (!hasData) { chartGeom = null; return; }

  /* --- measurements ---------------------------------------------------- */
  var width = $("chartWrap").clientWidth || 800;
  var height = width < 560 ? 300 : 400;
  /* Margins leave room for axis labels on the left and end-labels on the right. */
  var m = { top: 18, right: width < 560 ? 14 : 96, bottom: 30, left: 46 };
  var plotW = Math.max(10, width - m.left - m.right);
  var plotH = Math.max(10, height - m.top - m.bottom);

  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  svg.setAttribute("height", height);

  /* --- work out the vertical scale ------------------------------------- */
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

  /* Add a little breathing room above and below the data. */
  var pad = Math.max(0.25, (hi - lo) * 0.12);
  var yMin = Math.max(0, lo - pad);
  var yMax = hi + pad;

  var ticks = niceTicks(yMin, yMax, 5);
  yMin = Math.min(yMin, ticks[0]);
  yMax = Math.max(yMax, ticks[ticks.length - 1]);

  /* Scale functions: turn a data value into a pixel position. */
  function xOf(t) {
    var span = view[view.length - 1].t - view[0].t || 1;
    return m.left + (t - view[0].t) / span * plotW;
  }
  function yOf(v) {
    return m.top + (yMax - v) / (yMax - yMin) * plotH;
  }

  /* Remember these so the crosshair code can reuse them. */
  chartGeom = { m: m, width: width, height: height, plotW: plotW, plotH: plotH, xOf: xOf, yOf: yOf };

  var ink = { grid: token("--grid"), axis: token("--axis"), muted: token("--text-muted"), sec: token("--text-secondary"), surface: token("--surface-1") };

  /* --- horizontal gridlines and the % labels down the left ------------- */
  ticks.forEach(function (tv) {
    var y = yOf(tv);
    svg.appendChild(svgEl("line", {
      x1: m.left, x2: m.left + plotW, y1: y, y2: y,
      stroke: ink.grid, "stroke-width": 1
    }));
    var label = svgEl("text", {
      x: m.left - 9, y: y + 4, "text-anchor": "end",
      fill: ink.muted, "font-size": 11, "font-family": "system-ui, sans-serif"
    });
    label.textContent = tv.toFixed(tv % 1 === 0 ? 0 : 1) + "%";
    svg.appendChild(label);
  });

  /* --- the year labels along the bottom -------------------------------- */
  /* A range that starts mid-year can put its first two labels almost on top
     of each other, so drop any tick sitting too close to the one before it. */
  var lastLabelX = -Infinity;
  var xTicks = pickYearTicks(view, width).filter(function (tick) {
    var x = xOf(tick.t);
    if (x - lastLabelX < 52) return false;
    lastLabelX = x;
    return true;
  });
  xTicks.forEach(function (tick) {
    var x = xOf(tick.t);
    svg.appendChild(svgEl("line", {
      x1: x, x2: x, y1: m.top + plotH, y2: m.top + plotH + 4,
      stroke: ink.axis, "stroke-width": 1
    }));
    var label = svgEl("text", {
      x: x, y: m.top + plotH + 19, "text-anchor": "middle",
      fill: ink.muted, "font-size": 11, "font-family": "system-ui, sans-serif"
    });
    label.textContent = tick.label;
    svg.appendChild(label);
  });

  /* the solid baseline under the plot */
  svg.appendChild(svgEl("line", {
    x1: m.left, x2: m.left + plotW, y1: m.top + plotH, y2: m.top + plotH,
    stroke: ink.axis, "stroke-width": 1
  }));

  /* --- history markers (drawn behind the data lines) ------------------- */
  if (state.showEvents) drawEventMarkers(svg, xOf, m, plotH, ink);

  /* --- the data lines themselves --------------------------------------- */
  series.forEach(function (s) {
    var d = "";
    var pen = false;   /* false means "lift the pen": we hit a gap in the data */
    view.forEach(function (row) {
      var v = row[s.key];
      if (v == null) { pen = false; return; }
      var cmd = pen ? "L" : "M";
      d += cmd + xOf(row.t).toFixed(1) + " " + yOf(v).toFixed(1) + " ";
      pen = true;
    });
    if (!d) return;

    svg.appendChild(svgEl("path", {
      d: d, fill: "none",
      stroke: token(s.color),
      "stroke-width": 2,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
      "stroke-dasharray": s.dash    /* dashes are a second cue besides color */
    }));
  });

  /* --- direct labels at the right end of each line --------------------- */
  if (m.right > 40) drawEndLabels(svg, series, xOf, yOf, m, plotW);

  /* --- the invisible layer that catches mouse movement ----------------- */
  var hit = svgEl("rect", {
    x: m.left, y: m.top, width: plotW, height: plotH,
    fill: "transparent", style: "cursor:crosshair"
  });
  svg.appendChild(hit);

  /* Groups the crosshair will fill in later. Created now so they always sit
     on top of the lines. */
  svg.appendChild(svgEl("g", { id: "crosshairLayer" }));

  attachHover(svg, hit);
}

/* Choose round-number gridline values, like 4, 5, 6, 7 rather than 4.17, 5.33. */
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

/* Pick which years to label along the bottom, so labels never overlap. */
function pickYearTicks(rows, width) {
  var firstYear = toDate(rows[0].date).getFullYear();
  var lastYear = toDate(rows[rows.length - 1].date).getFullYear();
  var years = lastYear - firstYear;
  var maxLabels = Math.max(3, Math.floor(width / 95));

  /* If the window is short, label months instead of years. */
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
  /* round the step up to a friendly 1 / 2 / 5 / 10 / 20 */
  [1, 2, 5, 10, 20, 25, 50].some(function (n) { if (n >= step) { step = n; return true; } return false; });

  var ticks = [];
  for (var y = Math.ceil(firstYear / step) * step; y <= lastYear; y += step) {
    /* find the first row in that year */
    for (var j = 0; j < rows.length; j++) {
      if (toDate(rows[j].date).getFullYear() === y) { ticks.push({ t: rows[j].t, label: String(y) }); break; }
    }
  }
  return ticks.length ? ticks : [{ t: rows[0].t, label: String(firstYear) }];
}

/* Write each series' name at the right-hand end of its own line, so the
   reader never has to bounce between a legend and the chart. */
function drawEndLabels(svg, series, xOf, yOf, m, plotW) {
  var labels = [];
  series.forEach(function (s) {
    /* walk backwards to find the last week this series actually has a value */
    for (var i = view.length - 1; i >= 0; i--) {
      if (view[i][s.key] != null) {
        labels.push({ y: yOf(view[i][s.key]), x: xOf(view[i].t), name: s.name, color: token(s.color), val: view[i][s.key] });
        break;
      }
    }
  });

  /* If two labels would sit on top of each other, nudge them apart. */
  labels.sort(function (a, b) { return a.y - b.y; });
  for (var i = 1; i < labels.length; i++) {
    if (labels[i].y - labels[i - 1].y < 26) labels[i].y = labels[i - 1].y + 26;
  }

  labels.forEach(function (L) {
    /* a short connector so a nudged label still points at its line */
    svg.appendChild(svgEl("line", {
      x1: L.x + 2, x2: m.left + plotW + 7, y1: yOf(L.val), y2: L.y - 3,
      stroke: L.color, "stroke-width": 1, opacity: 0.45
    }));
    var name = svgEl("text", {
      x: m.left + plotW + 10, y: L.y - 3,
      fill: token("--text-secondary"), "font-size": 11, "font-family": "system-ui, sans-serif"
    });
    name.textContent = L.name;
    svg.appendChild(name);

    var val = svgEl("text", {
      x: m.left + plotW + 10, y: L.y + 10,
      fill: L.color, "font-size": 12, "font-weight": 650, "font-family": "system-ui, sans-serif"
    });
    val.textContent = L.val.toFixed(2) + "%";
    svg.appendChild(val);
  });
}

/* Thin dashed verticals marking the curated history moments. */
function drawEventMarkers(svg, xOf, m, plotH, ink) {
  var placed = [];
  eventsInView().forEach(function (ev) {
    var t = toDate(ev.date).getTime();
    var x = xOf(t);
    /* skip a marker that would be printed on top of a previous one */
    if (placed.some(function (px) { return Math.abs(px - x) < 26; })) return;
    placed.push(x);

    svg.appendChild(svgEl("line", {
      x1: x, x2: x, y1: m.top + 6, y2: m.top + plotH,
      stroke: ink.axis, "stroke-width": 1, "stroke-dasharray": "3 4"
    }));
    svg.appendChild(svgEl("circle", {
      cx: x, cy: m.top + 6, r: 3.5,
      fill: ink.surface, stroke: ink.sec, "stroke-width": 1.5
    }));
  });
}

/* Which history notes fall inside the visible date range? */
function eventsInView() {
  if (!view.length) return [];
  var a = view[0].t, b = view[view.length - 1].t;
  return EVENTS.filter(function (ev) {
    var t = toDate(ev.date).getTime();
    return t >= a && t <= b;
  });
}

/* == 7. HOVER CROSSHAIR =================================================== */

function attachHover(svg, hit) {
  /* Mouse and touch both report through pointer events. */
  hit.addEventListener("pointermove", function (e) {
    var box = svg.getBoundingClientRect();
    /* convert the screen position into the SVG's own coordinate system */
    var x = (e.clientX - box.left) * (chartGeom.width / box.width);
    setHover(nearestIndex(x));
  });
  hit.addEventListener("pointerleave", function () { setHover(-1); });

  /* Keyboard users tab to the chart and walk it with the arrow keys. */
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    var i = hoverIndex < 0 ? view.length - 1 : hoverIndex + (e.key === "ArrowRight" ? 1 : -1);
    setHover(Math.max(0, Math.min(view.length - 1, i)));
  });
  svg.addEventListener("blur", function () { setHover(-1); });
}

/* Which week is closest to this horizontal pixel position? */
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

  /* the vertical hairline */
  layer.appendChild(svgEl("line", {
    x1: x, x2: x, y1: m.top, y2: m.top + chartGeom.plotH,
    stroke: token("--text-muted"), "stroke-width": 1
  }));

  /* a dot on every visible line at that week */
  var rows = [];
  activeSeries().forEach(function (s) {
    var v = row[s.key];
    if (v == null) return;
    layer.appendChild(svgEl("circle", {
      cx: x, cy: chartGeom.yOf(v), r: 4.5,
      fill: token(s.color),
      stroke: token("--surface-1"), "stroke-width": 2   /* the 2px ring keeps overlapping dots readable */
    }));
    rows.push({ name: s.name, color: token(s.color), value: v });
  });

  showTooltip(row, rows, x);
}

/* Build the little floating box of numbers. Text is inserted with
   textContent rather than innerHTML, which keeps any stray characters in a
   label from being treated as page markup. */
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

    /* value first and bold - the reader already knows which series they want */
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

  /* If a history marker is within a few weeks, show its note too. */
  if (state.showEvents) {
    var near = eventsInView().find(function (ev) {
      var diff = Math.abs(toDate(ev.date).getTime() - row.t);
      return diff < 1000 * 60 * 60 * 24 * 21;    /* within 3 weeks */
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

  /* Place it beside the hairline, flipping to the other side near the edge. */
  var wrapW = $("chartWrap").clientWidth;
  var scale = wrapW / chartGeom.width;
  var px = x * scale;
  var tipW = tip.offsetWidth;
  tip.style.left = (px + tipW + 20 > wrapW ? px - tipW - 14 : px + 14) + "px";
  tip.style.top = "16px";
}

/* == 8. LEGEND, TILES, INSIGHTS, TABLE, CALCULATOR ======================== */

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

/* Pull out just the 30-year values that exist in the current range. */
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

/* Write the plain-English observations. Every sentence is computed, never
   hard-coded, so it is always true of whatever is on screen. */
function renderInsights() {
  var list = $("insights");
  list.textContent = "";
  var pts = thirtyYearInView();
  if (pts.length < 2) {
    addInsight(list, "Pick a wider time range to see calculated observations here.");
    return;
  }

  var first = pts[0], last = pts[pts.length - 1];
  var change = last.r30 - first.r30;
  var high = pts.reduce(function (a, b) { return b.r30 > a.r30 ? b : a; });
  var low = pts.reduce(function (a, b) { return b.r30 < a.r30 ? b : a; });
  var avg = pts.reduce(function (s, r) { return s + r.r30; }, 0) / pts.length;
  var years = (last.t - first.t) / (365.25 * 24 * 3600 * 1000);

  /* 1. The direction of travel. */
  var dir = change > 0.05 ? "rose" : change < -0.05 ? "fell" : "barely moved";
  addInsight(list,
    "Across these <strong>" + years.toFixed(1) + " years</strong>, the 30-year rate " + dir +
    " from <strong>" + pct(first.r30) + "</strong> to <strong>" + pct(last.r30) + "</strong>" +
    (Math.abs(change) > 0.05 ? ", a move of <strong>" + Math.abs(change).toFixed(2) + " percentage points</strong>." : "."));

  /* 2. The spread between best and worst week. */
  addInsight(list,
    "The gap between the cheapest week (<strong>" + pct(low.r30) + "</strong>, " + niceMonth(low.date) +
    ") and the dearest (<strong>" + pct(high.r30) + "</strong>, " + niceMonth(high.date) +
    ") is <strong>" + (high.r30 - low.r30).toFixed(2) + " points</strong>. On a $300,000 loan that is about <strong>" +
    money(monthlyPayment(300000, high.r30, 30) - monthlyPayment(300000, low.r30, 30)) +
    " a month</strong> in difference for the same house.");

  /* 3. Where today sits against this range's own average. */
  var vsAvg = last.r30 - avg;
  addInsight(list,
    "The latest reading is <strong>" + Math.abs(vsAvg).toFixed(2) + " points " +
    (vsAvg >= 0 ? "above" : "below") + "</strong> the average for this window (" + pct(avg) +
    "). Whether a rate feels 'high' depends entirely on which window you compare it to.");

  /* 4. Where today sits against the entire 55-year record. */
  var all = ROWS.filter(function (r) { return r[1] != null; }).map(function (r) { return r[1]; });
  var below = all.filter(function (v) { return v < last.r30; }).length;
  var rank = Math.round(below / all.length * 100);
  addInsight(list,
    "Measured against all " + all.length.toLocaleString("en-US") + " weeks ever recorded, " + pct(last.r30) +
    " is higher than <strong>" + rank + "%</strong> of them. The full-history average is <strong>7.68%</strong>" +
    (last.r30 < 7.68 ? ", so by the long view today is still on the cheap side." : "."));

  /* 5. Volatility: the single biggest one-week move in the range. */
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

  /* 6. The 30-vs-15 gap, when both lines are showing. */
  if (state.visible.r30 && state.visible.r15) {
    var both = view.filter(function (r) { return r.r30 != null && r.r15 != null; });
    if (both.length) {
      var gap = both.reduce(function (s, r) { return s + (r.r30 - r.r15); }, 0) / both.length;
      addInsight(list,
        "On average the 15-year loan cost <strong>" + gap.toFixed(2) + " points less</strong> than the 30-year here. " +
        "Lenders discount the shorter loan because they get their money back sooner — but the monthly payment is far higher.");
    }
  }

  /* 7. A note about the missing ARM data, when relevant. */
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
  span.innerHTML = html;       /* only our own strings above reach this */
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
    p.textContent = "No marked events fall inside this window. Try widening the time range.";
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
    text.textContent = ev.text;
    card.appendChild(text);

    box.appendChild(card);
  });
}

/* The table view. It lists the raw weekly numbers, newest first, so the
   values in the chart are always reachable as plain text too. */
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

  /* Show the most recent 300 weeks - enough to browse, not enough to choke
     the browser on a 55-year selection. The CSV download has everything. */
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
    ? "Showing the most recent 300 of " + view.length.toLocaleString("en-US") +
      " weeks in this range. Use Download CSV for the complete set."
    : "Showing all " + view.length.toLocaleString("en-US") + " weeks in this range.";
}

/* The payment calculator: the same loan priced at four different rates. */
function renderCalculator() {
  var box = $("calcResults");
  box.textContent = "";
  var loan = clampLoan($("loanAmt").value);
  var pts = thirtyYearInView();
  if (!pts.length) { $("calcLesson").textContent = ""; return; }

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

  /* One sentence tying the numbers together. */
  var payNow = monthlyPayment(loan, last.r30, 30);
  var payLow = monthlyPayment(loan, low.r30, 30);
  var gap = payNow - payLow;
  var lesson = $("calcLesson");
  lesson.textContent = "";

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
}

/* == 9. THEME, CSV, TOUR ================================================== */

/* Theme switching. The chosen mode is written onto the <html> element and
   remembered in the browser so it survives a refresh. */
function setupTheme() {
  var saved = null;
  try { saved = localStorage.getItem("mre-theme"); } catch (e) { /* private mode */ }
  applyTheme(saved || "system");

  document.querySelectorAll("[data-theme-choice]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(btn.dataset.themeChoice);
      /* The chart's colors come from CSS tokens, so it must be redrawn. */
      if (ROWS.length) render();
    });
  });

  /* If the user is on "Auto", follow the device when it flips. */
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (document.documentElement.dataset.theme === undefined && ROWS.length) render();
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

/* Save the current selection as a spreadsheet file. */
function downloadCSV() {
  var series = activeSeries();
  var lines = ["Week," + series.map(function (s) { return '"' + s.name + '"'; }).join(",")];

  view.forEach(function (r) {
    var cells = [r.date];
    series.forEach(function (s) {
      cells.push(r[s.key] == null ? "" : r[s.key].toFixed(2));
    });
    lines.push(cells.join(","));
  });

  var note = state.window > 1
    ? "# values are a " + state.window + "-week moving average"
    : "# raw weekly values";
  var csv = "# Freddie Mac Primary Mortgage Market Survey\n" + note + "\n" + lines.join("\n");

  /* Turn the text into a file the browser can download. */
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

/* The shared "?" tooltip bubble. One bubble is reused by every button, which
   is far lighter than giving each one its own hidden element. */
function setupTooltips() {
  var bubble = $("tipbubble");

  function show(el) {
    var text = el.dataset.tip;
    if (!text) return;
    bubble.textContent = text;
    bubble.hidden = false;

    var r = el.getBoundingClientRect();
    var w = bubble.offsetWidth, h = bubble.offsetHeight;
    /* prefer below-and-centred, but stay on screen */
    var left = Math.min(window.innerWidth - w - 10, Math.max(10, r.left + r.width / 2 - w / 2));
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 10) top = r.top - h - 8;
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
  }
  function hide() { bubble.hidden = true; }

  /* Delegation: one set of listeners on the document handles every [data-tip]
     element, including ones added later. */
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

/* The guided tour: a dimming overlay with a hole cut around one element. */
var tourAt = 0;

function setupTour() {
  $("tourBtn").addEventListener("click", function () { startTour(); });
  $("tourNext").addEventListener("click", function () { stepTour(1); });
  $("tourPrev").addEventListener("click", function () { stepTour(-1); });
  $("tourSkip").addEventListener("click", endTour);
  document.addEventListener("keydown", function (e) {
    if ($("tour").hidden) return;
    if (e.key === "Escape") endTour();
    if (e.key === "ArrowRight") stepTour(1);
    if (e.key === "ArrowLeft") stepTour(-1);
  });

  /* Offer the tour automatically the first time somebody visits. */
  var seen = null;
  try { seen = localStorage.getItem("mre-tour"); } catch (e) { /* ignore */ }
  if (!seen) setTimeout(function () { startTour(); }, 700);
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

  /* Wait for the scroll to settle before measuring, or the hole lands wrong. */
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

    /* Put the dialog under the highlight, or above it if there is no room. */
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
