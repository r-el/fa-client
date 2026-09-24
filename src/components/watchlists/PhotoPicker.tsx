import { useEffect, useId, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_TYPES, validatePhotos } from "./utils";
import { WatchlistError } from "./WatchlistFeedback";

function LocalPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <img src={url} alt={file.name} className="h-24 w-full rounded-lg object-cover" />;
}

export function PhotoPicker({ files, onChange, disabled = false }: {
  files: File[]; onChange: (files: File[]) => void; disabled?: boolean;
}) {
  const inputId = useId();
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const addFiles = (added: File[]) => {
    if (disabled) return;
    const combined = [...files, ...added];
    const issue = validatePhotos(combined);
    setError(issue);
    if (!issue) onChange(combined);
  };
  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}
        className={`rounded-xl border border-dashed p-6 text-center ${dragging ? "border-primary bg-primary/10" : "border-white/20 bg-white/5"}`}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <label htmlFor={inputId} className="mb-3 block text-sm">Drop reference photos here or choose files</label>
        <input id={inputId} type="file" multiple accept={PHOTO_TYPES.join(",")} disabled={disabled}
          aria-describedby={`${inputId}-help`} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
          onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        <p id={`${inputId}-help`} className="mt-3 text-xs text-muted-foreground">JPEG, PNG or WebP · 10 MiB each · up to 20 per upload · unique file names</p>
      </div>
      {error && <WatchlistError error={new Error(error)} />}
      {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length}/20 photos selected. File names are sent exactly as shown.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((file) => <div key={file.name} className="min-w-0 rounded-xl border border-white/10 p-2">
          <LocalPreview file={file} />
          <p title={file.name} className="mt-2 truncate text-xs">{file.name}</p>
          <Button type="button" variant="ghost" size="sm" className="mt-1 w-full" disabled={disabled}
            aria-label={`Remove selected photo ${file.name}`}
            onClick={() => { onChange(files.filter((entry) => entry !== file)); setError(undefined); }}><X />Remove</Button>
        </div>)}
      </div>
    </div>
  );
}