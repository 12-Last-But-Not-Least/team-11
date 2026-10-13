import { useId, useState } from "react";
import { define } from "../glossary.js";

/** An underlined glossary term with its one-line definition on hover/focus. */
export function Term({ children }) {
  const term = String(children);
  const definition = define(term);
  const id = useId();
  const [open, setOpen] = useState(false);

  if (!definition) return <span>{term}</span>;

  return (
    <span className="term-wrap">
      <span
        className="term"
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        {term}
      </span>
      {open && (
        <span role="tooltip" id={id} className="term__tip">
          <span className="term__tip-name">{term}</span>
          {definition}
        </span>
      )}
    </span>
  );
}
