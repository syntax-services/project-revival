import { useState } from "react";
import { filterContent, ContentFilterResult } from "@/lib/contentFilter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

interface FilteredInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilteredChange?: (value: string, result: ContentFilterResult) => void;
  showWarning?: boolean;
}

interface FilteredTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onFilteredChange?: (value: string, result: ContentFilterResult) => void;
  showWarning?: boolean;
}

export function FilteredInput({
  onFilteredChange,
  onChange,
  showWarning = true,
  ...props
}: FilteredInputProps) {
  const [warning, setWarning] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const result = filterContent(value);

    if (!result.isClean && showWarning) {
      setWarning(result.violations[0]);
    } else {
      setWarning(null);
    }

    if (onFilteredChange) {
      onFilteredChange(value, result);
    }

    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="space-y-1">
      <Input {...props} onChange={handleChange} />
      {warning && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {warning} - Please keep communication within String
        </p>
      )}
    </div>
  );
}

export function FilteredTextarea({
  onFilteredChange,
  onChange,
  showWarning = true,
  ...props
}: FilteredTextareaProps) {
  const [warning, setWarning] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const result = filterContent(value);

    if (!result.isClean && showWarning) {
      setWarning(result.violations[0]);
    } else {
      setWarning(null);
    }

    if (onFilteredChange) {
      onFilteredChange(value, result);
    }

    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="space-y-1">
      <Textarea {...props} onChange={handleChange} />
      {warning && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {warning} - Please keep communication within String
        </p>
      )}
    </div>
  );
}
