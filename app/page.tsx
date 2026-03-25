"use client";

import { useCallback, useMemo, useState, type ChangeEvent, type DragEvent } from "react";

type DialogueLine = {
  text: string;
  voiceId: string;
};

type VoiceProfile = {
  name: string;
  accentColor: string;
  bubbleClass: string;
  align: "start" | "end";
};

const VOICE_PROFILES: Record<string, VoiceProfile> = {
  "9BWtsMINqrJLrRacOk9x": {
    name: "Locutora A",
    accentColor: "text-indigo-300",
    bubbleClass: "bg-indigo-500/10 border-indigo-500/40",
    align: "start",
  },
  "IKne3meq5aSn9XLyUdCD": {
    name: "Locutor B",
    accentColor: "text-emerald-300",
    bubbleClass: "bg-emerald-500/10 border-emerald-500/30",
    align: "end",
  },
};

const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  name: "Voz",
  accentColor: "text-slate-300",
  bubbleClass: "bg-slate-800/80 border-slate-700",
  align: "start",
};

function GeneratedDialogue({ dialogue }: { dialogue: DialogueLine[] }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Diálogo generado</h2>
        <p className="text-sm text-slate-400">
          Cada intervención incluye la voz sugerida para reproducirla en el generador de audio.
        </p>
      </header>

      <div className="space-y-4">
        {dialogue.map((line, index) => {
          const profile = VOICE_PROFILES[line.voiceId] ?? DEFAULT_VOICE_PROFILE;
          const alignmentClass = profile.align === "end" ? "justify-end text-right" : "justify-start text-left";

          return (
            <div key={`${line.voiceId}-${index}`} className={`flex ${alignmentClass}`}>
              <article className={`max-w-[85%] rounded-2xl border px-5 py-4 shadow-sm ${profile.bubbleClass}`}>
                <header className="flex items-baseline gap-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${profile.accentColor}`}>{profile.name}</p>
                  <span className="text-[10px] font-mono text-slate-500">{line.voiceId}</span>
                </header>
                <p className="mt-2 text-sm leading-relaxed text-slate-100 whitespace-pre-line">{line.text}</p>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const formatFileSize = (size: number) => {
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

function UploadArea({ onFilesAdded }: { onFilesAdded: (files: FileList | null) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        onFilesAdded(droppedFiles);
      }
    },
    [onFilesAdded],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onFilesAdded(event.target.files);
    },
    [onFilesAdded],
  );

  return (
    <label
      className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      htmlFor="file-upload"
    >
      <input id="file-upload" type="file" multiple className="hidden" onChange={handleInputChange} />
      <span className="text-lg font-semibold text-slate-700">Arrastra y suelta tus archivos aquí</span>
      <span className="mt-2 text-sm text-slate-500">o haz clic para seleccionar archivos desde tu dispositivo</span>
    </label>
  );
}

export default function Home() {
  const [storedFiles, setStoredFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogue, setDialogue] = useState<DialogueLine[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioGenerating, setIsAudioGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = useCallback((files: FileList | null) => {
    if (!files) return;

    setStoredFiles((previous) => {
      const existingKeys = new Set(previous.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const nextFiles = [...previous];

      Array.from(files).forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          nextFiles.push(file);
        }
      });

      return nextFiles;
    });
  }, []);

  const hasFiles = storedFiles.length > 0;

  const totalSize = useMemo(() => storedFiles.reduce((sum, file) => sum + file.size, 0), [storedFiles]);

  const handleGeneratePodcast = useCallback(async () => {
    if (!hasFiles || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setDialogue(null);
    setAudioUrl(null);

    try {
      const formData = new FormData();
      storedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/generate-podcast", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: "No se pudo generar el podcast." }));
        throw new Error(typeof error === "string" ? error : "No se pudo generar el podcast.");
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("La respuesta del servidor no contiene un diálogo válido.");
      }

      const parsedDialogue = data.filter((item): item is DialogueLine => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).text === "string" &&
          typeof (item as Record<string, unknown>).voiceId === "string"
        );
      });

      if (parsedDialogue.length === 0) {
        throw new Error("El diálogo generado está vacío o tiene un formato incorrecto.");
      }

      setDialogue(parsedDialogue);

      // Solo enviamos las primeras cuatro frases para la generación de audio.
      const dialogueForAudio = parsedDialogue.slice(0, 4);

      setIsAudioGenerating(true);
      try {
        const audioResponse = await fetch("/api/generate-audio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dialogueForAudio),
        });

        if (!audioResponse.ok) {
          const { error } = await audioResponse
            .json()
            .catch(() => ({ error: "No se pudo generar el audio del podcast." }));
          throw new Error(typeof error === "string" ? error : "No se pudo generar el audio del podcast.");
        }

        const audioData: unknown = await audioResponse.json();

        if (
          typeof audioData !== "object" ||
          audioData === null ||
          typeof (audioData as Record<string, unknown>).url !== "string"
        ) {
          throw new Error("La respuesta del servidor no contiene una URL de audio válida.");
        }

        setAudioUrl((audioData as { url: string }).url);
      } catch (audioError) {
        console.error(audioError);
        setErrorMessage(
          audioError instanceof Error
            ? audioError.message
            : "Ocurrió un error al generar el audio del podcast.",
        );
      } finally {
        setIsAudioGenerating(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Ocurrió un error al generar el podcast.");
    } finally {
      setIsGenerating(false);
    }
  }, [hasFiles, isGenerating, storedFiles]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Generador de Podcasts</h1>
          <p className="text-slate-300">
            Sube tus guiones, artículos o notas y prepara tu próximo episodio en cuestión de segundos.
          </p>
        </header>

        <UploadArea onFilesAdded={handleFilesAdded} />

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Archivos seleccionados</h2>
            <span className="text-sm text-slate-400">{hasFiles ? `${storedFiles.length} archivos · ${formatFileSize(totalSize)}` : "Ningún archivo todavía"}</span>
          </div>
          {hasFiles ? (
            <ul className="space-y-3">
              {storedFiles.map((file) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center justify-between rounded-lg bg-slate-800/70 px-4 py-3"
                >
                  <span className="font-medium text-slate-100 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-sm text-slate-400 whitespace-nowrap">{formatFileSize(file.size)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 text-center">Arrastra archivos para comenzar tu proyecto.</p>
          )}
        </section>

        <div className="space-y-6">
          {errorMessage ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}
          {dialogue && dialogue.length > 0 ? <GeneratedDialogue dialogue={dialogue} /> : null}
          {isAudioGenerating ? (
            <p className="text-sm text-slate-400">Generando audio del diálogo...</p>
          ) : null}
          {audioUrl ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Audio generado</h3>
              <audio controls className="w-full" src={audioUrl} />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            onClick={handleGeneratePodcast}
            disabled={!hasFiles || isGenerating}
            aria-busy={isGenerating}
          >
            {isGenerating ? "Generando..." : "Generar Podcast"}
          </button>
        </div>
      </div>
    </main>
  );
}
