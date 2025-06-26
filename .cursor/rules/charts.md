# Chart Guidelines

These are the local Cursor rules for working with charts in the **airank-app** code-base.

## Tech stack

* All charts are built with **Recharts** wrapped by the shadcn/ui helpers located in `src/components/ui/chart.jsx` (`ChartContainer`, `ChartTooltipContent`, `ChartLegend`, etc.).  
* Always import from those wrappers instead of Recharts directly unless you need a primitive the wrapper does not expose.

## Must-do checklist

1. **ResponsiveContainer** – wrap every chart in `<ResponsiveContainer>` with explicit `height` to ensure it renders.
2. **Numeric data** – convert any numeric strings coming from GraphQL to `Number(value)` **before** passing them to Recharts.  Recharts ignores non-numeric values.
3. **Tooltip config** – whenever you use `<ChartTooltipContent>` pass `config={chartConfig}` (or `dynamicChartConfig`) so the tooltip resolves colours/icons correctly.
4. **Colour source of truth** – keep all colours in a single `chartConfig` object; do **not** hard-code hex strings inside JSX (exception: grey axis/grid strokes).
5. **Stacked data** – for stacked series make sure **every** key exists on **every** row, filling missing keys with `0`.
6. **Empty arrays** render blank charts; check the console first (log the payload) before debugging the view layer.

## Adding a new chart quick-start

```jsx
<ChartContainer config={chartConfig}>
  <ResponsiveContainer width="100%" height={250}>
    <BarChart data={dataArray}>
      {/* axes, grid, series, etc. */}
      <Tooltip cursor={false} content={<ChartTooltipContent config={chartConfig} />} />
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>
```

Remember: **ChartContainer** injects the CSS custom properties (`--color-*`) via the shadcn wrapper so Recharts children can pick them up automatically. 