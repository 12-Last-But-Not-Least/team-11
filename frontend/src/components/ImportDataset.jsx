import { useState } from "react";

export function ImportDataset({ api, onImported, busy, setBusy }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!file || busy) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const dataset = await api.importCsv(file);
      onImported(dataset);
      setMessage(`Imported ${dataset.name}: ${dataset.row_count} rows.`);
    } catch (e) {
      setError(e.detail ?? e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="dataset-import" onSubmit={submit} aria-label="Import dataset">
      <div className="dataset-import__controls">
        <label htmlFor="import-csv">CSV file</label>
        <input id="import-csv" type="file" accept=".csv,text/csv" disabled={busy} aria-describedby="import-help"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); setMessage(null); }} />
        <button type="submit" className="btn btn--ghost btn--small" disabled={!file || busy}>
          {busy ? "Importing…" : "Import CSV"}
        </button>
      </div>
      <p id="import-help">UTF-8 CSV. Include a header and two numeric columns with at least three complete paired rows. Uploads are temporary and available only to this browser session. A server restart clears them; keep your original CSV.</p>
      {error && <p role="alert" className="status--error">{error}</p>}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
