# Mortgage Rate Explorer

An interactive tool for exploring **55 years of U.S. mortgage rates**, built for
high-school students and anyone else who is new to reading data visuals.

Every number on the page comes from Freddie Mac's Primary Mortgage Market Survey
(PMMS) — 2,896 weekly readings from April 1971 to September 2026.

## What it does

| Feature | What it teaches |
|---|---|
| **Interactive line chart** | How to read time on the x-axis and value on the y-axis, with a hover crosshair that names the exact number for any week |
| **Time-range filter** | That the same data tells different stories depending on the window you choose |
| **Loan-type toggles** | How to compare two series, and why a 15-year loan is cheaper than a 30-year one |
| **Smoothing (moving averages)** | The difference between noise and trend |
| **Auto-written insights** | What the selected range actually shows, in plain English — recalculated on every change |
| **History markers** | Fifteen real moments (the 1981 peak, the 2008 crisis, the 2021 record low) pinned to the dates they happened |
| **Payment calculator** | Why a couple of percentage points is worth hundreds of dollars a month |
| **Table view + CSV export** | That a chart and a table are two views of one dataset |
| **Guided tour + tooltips** | How to use the tool itself |
| **Light / dark / auto themes** | — |

## Design notes

- **Colors were validated, not guessed.** The three series colors were run
  through a colorblind-safety checker (OKLab ΔE across deuteranopia,
  protanopia and tritanopia) in both light and dark mode. Each line also
  carries a distinct dash pattern, so color is never the only cue.
- **No chart library.** The SVG is drawn by hand in `app.js` so a learner can
  read exactly how a chart is built — scales, axes, paths and all.
- **No build step, no dependencies.** Three files and a JSON blob.

## Running it locally

Because the page loads `data.json` with `fetch`, browsers block it when you
open `index.html` straight off your hard drive. Serve it instead:

```bash
npx serve .
```

Then open the address it prints (usually http://localhost:3000).

## Files

```
index.html    page structure
styles.css    theming and layout
app.js        all interactive logic (chart, filters, insights, tour)
data.json     2,896 weekly rows extracted from the source spreadsheet
historicalweeklydata.xlsx    the original Freddie Mac download
```

## Source and disclaimer

Data: [Freddie Mac PMMS](https://www.freddiemac.com/pmms). Used with
attribution. Freddie Mac does not guarantee that the information is accurate,
current or suitable for any particular purpose.

This is a learning tool. Nothing in it is financial advice.
