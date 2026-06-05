import type { ChangeEvent } from 'react';

import type { Language } from '../domain/types';

export interface ToolbarLabels {
  new: string;
  save: string;
  load: string;
  importJson: string;
  exportJson: string;
  printPdf: string;
}

interface ToolbarProps {
  language: Language;
  title: string;
  labels: ToolbarLabels;
  onLanguageChange: (language: Language) => void;
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onPrint: () => void;
}

function Toolbar({
  language,
  title,
  labels,
  onLanguageChange,
  onNew,
  onSave,
  onLoad,
  onImport,
  onExport,
  onPrint,
}: ToolbarProps) {
  function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    onLanguageChange(event.currentTarget.value as Language);
  }

  function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (file) {
      onImport(file);
    }

    event.currentTarget.value = '';
  }

  return (
    <header className="toolbar">
      <h1>{title}</h1>
      <select aria-label="Language" value={language} onChange={handleLanguageChange}>
        <option value="en">EN</option>
        <option value="th">TH</option>
      </select>
      <button type="button" onClick={onNew}>
        {labels.new}
      </button>
      <button type="button" onClick={onSave}>
        {labels.save}
      </button>
      <button type="button" onClick={onLoad}>
        {labels.load}
      </button>
      <label className="file-button">
        {labels.importJson}
        <input type="file" accept="application/json" onChange={handleImportChange} />
      </label>
      <button type="button" onClick={onExport}>
        {labels.exportJson}
      </button>
      <button type="button" onClick={onPrint}>
        {labels.printPdf}
      </button>
    </header>
  );
}

export default Toolbar;
