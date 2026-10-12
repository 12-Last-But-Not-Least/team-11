import { useId } from "react";

/** A step 4 card from checks.js: kind "warn" (red) or "try" (blue). */
export function CheckCard({ card, onAction }) {
  const id = useId();
  return (
    <article className={`check check--${card.kind}`} aria-labelledby={id}>
      <div className="check__head">
        <span className="check__badge" aria-hidden="true">{card.kind === "warn" ? "!" : "→"}</span>
        <h3 id={id} className="check__title">{card.title}</h3>
      </div>
      <p className="check__body">{card.body}</p>
      {card.action && (
        <button type="button" className="btn btn--primary" onClick={() => onAction?.(card)}>
          {card.action}
        </button>
      )}
    </article>
  );
}
