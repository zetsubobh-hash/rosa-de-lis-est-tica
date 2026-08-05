import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  value: string; // ISO yyyy-mm-dd or ""
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}

const isoToBr = (iso: string) => {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

const maskBr = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

const brToIso = (br: string) => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  if (year < 1900 || year > new Date().getFullYear()) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
};

/** Mobile-friendly birth date field: free typing of day/month/year (dd/mm/aaaa). */
const BirthDateInput = ({ value, onChange, className, id, placeholder = "dd/mm/aaaa" }: Props) => {
  const [text, setText] = useState(isoToBr(value));

  useEffect(() => {
    const iso = brToIso(text);
    if (value !== iso) setText(isoToBr(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw: string) => {
    const masked = maskBr(raw);
    setText(masked);
    onChange(brToIso(masked));
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      value={text}
      onChange={(e) => handle(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default BirthDateInput;
