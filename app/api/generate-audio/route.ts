import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const requestInputs = await request.json();
        const inputs = Array.isArray(requestInputs) ? requestInputs.slice(0, 4) : requestInputs;

        const elevenlabs = new ElevenLabsClient();
        const audio = await elevenlabs.textToDialogue.convert({
            inputs: inputs,
        });

        // Convertir el audio a un buffer si es necesario
        let audioBuffer;
        if (audio instanceof Uint8Array) {
            audioBuffer = Buffer.from(audio);
        } else if (audio instanceof ArrayBuffer) {
            audioBuffer = Buffer.from(new Uint8Array(audio));
        } else if (typeof audio === 'string') {
            audioBuffer = Buffer.from(audio, 'binary');
        } else if (audio && typeof audio.getReader === 'function') {
            // Si es un ReadableStream, leerlo completamente
            const reader = audio.getReader();
            let chunks = [];
            let done = false;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                if (value) chunks.push(...value);
                done = doneReading;
            }
            audioBuffer = Buffer.from(chunks);
        } else {
            throw new Error('Formato de audio no soportado');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
        const audioDir = path.join(process.cwd(), "public", "audios");
        await mkdir(audioDir, { recursive: true });
        const fileName = `audio_${timestamp}.mp3`;
        const audioPath = path.join(audioDir, fileName);
        await writeFile(audioPath, audioBuffer);

        // Devolver la ruta pública
        const publicUrl = `/audios/${fileName}`;
        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Ocurrió un error al generar el audio." }, { status: 500 });
    }
}
