import { useEffect, useState } from "react";
import { fileName, statsToText } from "../exportText.js";
import { IconDownload } from "./icons.jsx";

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download / copy actions for the landed run.
 * scatterSpec: render spec (SVG export reuses window.SvgChart from svg_export.js)
 * canvasRef:   the scatter canvas (PNG export)
 * names/labels: { x, y } column names / display labels of the landed run
 */
export function Actions({ scatterSpec, canvasRef, names, labels, stats }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied && !copyFailed) return;
    const t = setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2000);
    return () => clearTimeout(t);
  }, [copied, copyFailed]);

  const svg = () => window.SvgChart.download(scatterSpec, fileName("scatter", names, "svg"));
  const png = () => canvasRef.current?.toBlob((blob) => blob && saveBlob(blob, fileName("scatter", names, "png")), "image/png");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(statsToText(stats, labels));
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <div className="actions">
      <button type="button" className="btn btn--ghost" onClick={svg}>
        <IconDownload /> Download scatter (SVG)
      </button>
      <button type="button" className="btn btn--ghost" onClick={png}>
        <IconDownload /> Download scatter (PNG)
      </button>
      <button type="button" className="btn btn--ghost" onClick={copy}>
        Copy the statistics
      </button>
      <span className="actions__note" role="status" aria-live="polite">
        {copied ? "Copied to the clipboard." : copyFailed ? "Couldn't copy. Allow clipboard access and try again." : ""}
      </span>
    </div>
  );
}
