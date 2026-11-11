import { useEffect, useRef, useState } from 'react';

const format = (v: number | undefined) => (v === undefined ? '' : String(Number(v.toFixed(3))));

interface Props {
  id: string;
  label: string;
  value: number | undefined; // already in display units
  unit?: string;
  hint?: string;
  /** Called only with valid numbers (or undefined when `optional` and the field is empty). */
  onCommit: (n: number | undefined) => void;
  valid?: (n: number) => boolean;
  optional?: boolean;
}

/** Text input with a local draft, so partial input like "23," survives while typing. Accepts "," or ".". */
export default function NumberField({ id, label, value, unit, hint, onCommit, valid = (n) => n > 0, optional }: Props) {
  const [draft, setDraft] = useState(format(value));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(format(value));
  }, [value]);

  const change = (text: string) => {
    setDraft(text);
    const clean = text.trim().replace(',', '.');
    if (clean === '') {
      setInvalid(!optional);
      if (optional) onCommit(undefined);
      return;
    }
    const n = Number(clean);
    const ok = Number.isFinite(n) && valid(n);
    setInvalid(!ok);
    if (ok) onCommit(n);
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-invalid={invalid}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            setInvalid(false);
            setDraft(format(value));
          }}
          onChange={(e) => change(e.target.value)}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
