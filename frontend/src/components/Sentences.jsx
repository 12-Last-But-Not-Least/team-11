import { Term } from "./Term.jsx";

/** Renders one sentence with its glossary terms wrapped in <Term>. */
export function SentenceText({ sentence }) {
  const parts = [];
  let cursor = 0;
  for (const t of sentence.terms) {
    if (t.start > cursor) parts.push(sentence.text.slice(cursor, t.start));
    parts.push(<Term key={t.start}>{t.term}</Term>);
    cursor = t.end;
  }
  if (cursor < sentence.text.length) parts.push(sentence.text.slice(cursor));
  return <>{parts}</>;
}

export function Sentences({ sentences }) {
  return (
    <div className="sentences">
      <ul className="sentences__list" aria-label="What the statistics mean">
        {sentences.map((s) => (
          <li key={s.text} className="sentence">
            <SentenceText sentence={s} />
          </li>
        ))}
      </ul>
      <p className="sentences__hint">Underlined terms show a one-line definition on hover.</p>
    </div>
  );
}
