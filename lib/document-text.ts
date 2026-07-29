// Extraction de texte brut depuis un document uploadé (PDF / Word).
// Partagé par les deux imports « document → structure » : le playbook de
// scoring (/api/playbook/import) et la bibliothèque d'objections
// (/api/objections/categories/import) — même formats acceptés, mêmes
// messages d'erreur, un seul endroit à corriger quand un parseur casse.

export class UnsupportedFileTypeError extends Error {
  constructor() {
    super("UNSUPPORTED_FILE_TYPE");
    this.name = "UnsupportedFileTypeError";
  }
}

export const SUPPORTED_DOCUMENT_FORMATS_LABEL = "Formats acceptés : PDF, Word (.doc, .docx).";

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse est distribué en CJS, d'où le require(). pdf-parse v2 a
  // supprimé l'export fonction-appelable de la v1 au profit d'une classe
  // PDFParse — ne PAS revenir à require("pdf-parse")(buffer), qui lève
  // « pdfParse is not a function » (bug #13).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return (result.value as string) ?? "";
}

export async function extractTextFromUploadedFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type.includes("pdf") || name.endsWith(".pdf")) {
    return extractTextFromPdf(buffer);
  }
  if (
    file.type.includes("word") ||
    file.type.includes("officedocument.wordprocessing") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return extractTextFromDocx(buffer);
  }
  throw new UnsupportedFileTypeError();
}
