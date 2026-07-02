import { NextResponse } from "next/server";
import { initializePromptDefaults } from "@/lib/admin-config";

export async function POST() {
  try {
    const result = await initializePromptDefaults();
    return NextResponse.json({
      ok: true,
      initialized: result.initialized,
      message: result.initialized.length > 0
        ? `${result.initialized.length} prompt(s) initialisé(s) : ${result.initialized.join(", ")}`
        : "Tous les prompts étaient déjà présents — aucune modification.",
    });
  } catch (err) {
    console.error("[init-prompts]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de l'initialisation des prompts." }, { status: 500 });
  }
}
