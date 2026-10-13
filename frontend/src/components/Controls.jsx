import { useMemo } from "react";
import { optionLabels } from "../columns.js";
import { SIZES } from "../sizes.js";
import { IconSwap } from "./icons.jsx";

function Picker({ id, label, hint, cols, labels, value, taken, onChange, meta }) {
  const col = cols.find((c) => c.name === value);
  const metaLine = meta ? `${col?.source} · ${meta.n} ${meta.keyLabel}s · ${meta.min}–${meta.max}` : col?.source;
  return (
    <div className="picker">
      <label className="picker__label" htmlFor={id}>
        {label} <span className="picker__hint">{hint}</span>
      </label>
      <select id={id} className="chip" value={value} onChange={(e) => onChange(e.target.value)}>
        {cols.map((c) => (
          <option key={c.name} value={c.name} disabled={c.name === taken}>
            {labels.get(c.name)}
          </option>
        ))}
      </select>
      <p className="picker__meta">{metaLine}</p>
    </div>
  );
}

/** Step 1 controls: x / y pickers, swap, chart size. `value` is { x, y, size }. */
/** `meta` (optional): { n, min, max, keyLabel } of the landed run, shown under each picker. */
export function Controls({ cols, value, onChange, meta = null }) {
  const labels = useMemo(() => optionLabels(cols), [cols]);
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="pickers">
      <Picker id="pick-x" label="X axis" hint="(across)" cols={cols} labels={labels} value={value.x} taken={value.y} onChange={(x) => set({ x })} meta={meta} />
      <button type="button" className="btn btn--ghost" onClick={() => set({ x: value.y, y: value.x })}>
        <IconSwap /> Swap
      </button>
      <Picker id="pick-y" label="Y axis" hint="(up)" cols={cols} labels={labels} value={value.y} taken={value.x} onChange={(y) => set({ y })} meta={meta} />
      <div className="picker picker--size">
        <label className="picker__label picker__label--muted" htmlFor="pick-size">Chart size</label>
        <select id="pick-size" className="chip chip--mono" value={value.size} onChange={(e) => set({ size: e.target.value })}>
          {SIZES.map(([v, text]) => (
            <option key={v} value={v}>{text}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
