import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "La clave de OpenAI no está configurada." }, { status: 500 });
  }

  const formData = await request.formData();
  const fileEntries = formData.getAll("files");
  const uploadedFiles = fileEntries.filter((entry): entry is File => entry instanceof File);

  if (uploadedFiles.length === 0) {
    return NextResponse.json({ error: "No se proporcionaron archivos para generar el podcast." }, { status: 400 });
  }

  const pdfFiles = uploadedFiles.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    return NextResponse.json({ error: "Los archivos deben estar en formato PDF." }, { status: 400 });
  }

  try {
    // Subir los archivos PDF y obtener sus IDs
    const uploads = await Promise.all(
      pdfFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploadedFile = await client.files.create({
          file: await toFile(buffer, file.name, { type: file.type || "application/pdf" }),
          purpose: "user_data",
        });
        return uploadedFile;
      })
    );

    // Usar solo el primer PDF como referencia (puedes adaptar para varios si lo necesitas)
    const referenceFile = uploads[0];

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Genera un diálogo entre dos personas usando el contenido del siguiente fichero adjunto.",
                "No generes intros ni conclusiones, solo el diálogo.",
                "Haz que sea corto, no mas de 3000 caracteres.",
                "Responde únicamente con un JSON que contenga un array de objetos con las propiedades 'text' y 'voiceId'.",
                "Utiliza el ID de voz '9BWtsMINqrJLrRacOk9x' para la primera persona y 'IKne3meq5aSn9XLyUdCD' para la segunda.",
                "Ejemplo de formato: [ { \"text\": \"[cheerfully] Hola\", \"voiceId\": \"9BWtsMINqrJLrRacOk9x\" } ]"
              ].join(" "),
            },
            {
              type: "input_file",
              file_id: referenceFile.id,
            },
          ],
        },
      ],
    });

    const transcript = response.output_text?.trim();

    if (!transcript) {
      return NextResponse.json({ error: "No se pudo generar el diálogo del podcast." }, { status: 502 });
    }

    try {
      const parsedTranscript = JSON.parse(transcript);

      if (!Array.isArray(parsedTranscript)) {
        throw new Error("El formato del diálogo no es un array.");
      }

      return NextResponse.json(parsedTranscript);
    } catch (parseError) {
      console.error(parseError);
      return NextResponse.json({ error: "El formato del diálogo generado no es válido." }, { status: 502 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Ocurrió un error al comunicarse con OpenAI." }, { status: 500 });
  }
}
