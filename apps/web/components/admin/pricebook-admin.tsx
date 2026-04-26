"use client";

import { useState } from "react";

export function PricebookAdmin(props: {
  rows: Array<{
    id: string;
    modelCode: string;
    sizeBucket: string;
    premiumFlag: boolean;
    hasInspirationFlag: boolean;
    credits: number;
    version: number;
  }>;
}) {
  const [form, setForm] = useState({
    modelCode: "flux-1.1-pro",
    sizeBucket: "standard",
    premiumFlag: false,
    hasInspirationFlag: false,
    credits: 5,
    version: 1,
  });

  async function submit() {
    await fetch("/api/admin/pricebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        effectiveFrom: new Date().toISOString(),
      }),
    });
    location.reload();
  }

  return (
    <div className="studio-page">
      <div className="studio-page-head">
        <div>
          <h1>Pricebook</h1>
          <p>Versioned credit pricing across model, size, premium mode, and inspiration usage.</p>
        </div>
      </div>

      <div className="studio-card studio-copy-card">
        <h2>Add version</h2>
        <div className="studio-form-grid">
          <label>
            <span>Model</span>
            <input
              className="studio-input"
              value={form.modelCode}
              onChange={(event) => setForm((current) => ({ ...current, modelCode: event.target.value }))}
            />
          </label>
          <label>
            <span>Size bucket</span>
            <select
              className="studio-input"
              value={form.sizeBucket}
              onChange={(event) => setForm((current) => ({ ...current, sizeBucket: event.target.value }))}
            >
              <option value="standard">standard</option>
              <option value="large">large</option>
            </select>
          </label>
          <label>
            <span>Credits</span>
            <input
              className="studio-input"
              type="number"
              value={form.credits}
              onChange={(event) =>
                setForm((current) => ({ ...current, credits: Number(event.target.value) }))
              }
            />
          </label>
          <label>
            <span>Version</span>
            <input
              className="studio-input"
              type="number"
              value={form.version}
              onChange={(event) =>
                setForm((current) => ({ ...current, version: Number(event.target.value) }))
              }
            />
          </label>
        </div>
        <button className="studio-button studio-button--primary" type="button" onClick={() => void submit()}>
          Add row
        </button>
      </div>

      <div className="studio-card">
        <div className="studio-table-wrap">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Bucket</th>
                <th>Credits</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.modelCode}</td>
                  <td>{row.sizeBucket}</td>
                  <td>{row.credits}</td>
                  <td>{row.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

