import { useEffect, useState } from "react";
import Asides from "@/layout/asides/Asides";
import Header from "@/layout/headers/Header";
import {
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  SkillType,
} from "@/components/queries/useSkills";

const PATTERN_HELP = `Pattern recommandé :

## Rôle
<qui est l'analyste et son domaine d'expertise>

## Focus
<ce qu'il doit observer dans les données>

## Ton
<ton et style de communication attendus>`;

const SKILL_EMOJIS: Record<string, string> = {
  financier:    "💰",
  geographique: "🌍",
  temporel:     "📅",
  general:      "📊",
};

/* ─── Formulaire création ──────────────────────────────────────────────── */
function NewSkillForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState(PATTERN_HELP);
  const { mutate: createSkill, isPending } = useCreateSkill();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    createSkill({ skill: name.trim().toLowerCase(), prompt }, { onSuccess: onClose });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-5 bg-gray-50 border border-gray-200 rounded-lg space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-700">Nouveau skill</h3>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Nom du skill <span className="text-gray-400">(lettres minuscules et _, ex: rh, juridique)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          pattern="[a-z][a-z0-9_]{1,29}"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="ex: rh"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={10}
          required
          className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50"
        >
          {isPending ? "Création..." : "Créer"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/* ─── Bouton suppression ───────────────────────────────────────────────── */
function DeleteButton({ skill, isBase }: { skill: string; isBase: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const { mutate: del, isPending } = useDeleteSkill();

  const label = isBase ? "Réinitialiser" : "Supprimer";
  const confirmLabel = isBase ? "Confirmer réinitialisation" : "Confirmer suppression";

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <button
          onClick={() => del(skill, { onSettled: () => setConfirming(false) })}
          disabled={isPending}
          className={`font-medium disabled:opacity-50 ${isBase ? "text-amber-600 hover:text-amber-800" : "text-red-600 hover:text-red-800"}`}
        >
          {isPending ? "..." : confirmLabel}
        </button>
        <button onClick={() => setConfirming(false)} className="text-gray-400 hover:text-gray-600">
          Annuler
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`text-xs px-2.5 py-1 rounded border ${
        isBase
          ? "border-amber-300 text-amber-700 hover:bg-amber-50"
          : "border-red-300 text-red-600 hover:bg-red-50"
      }`}
    >
      {label}
    </button>
  );
}

/* ─── Carte skill ──────────────────────────────────────────────────────── */
function SkillCard({ data }: { data: SkillType }) {
  const [prompt, setPrompt] = useState(data.prompt);
  const { mutate: updateSkill, isPending } = useUpdateSkill();
  const dirty = prompt.trim() !== data.prompt.trim();
  const emoji = SKILL_EMOJIS[data.skill] ?? "🧩";

  useEffect(() => {
    setPrompt(data.prompt);
  }, [data.prompt]);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 capitalize">{data.skill}</h3>
              {data.is_base && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">base</span>
              )}
            </div>
            {dirty && <span className="text-xs text-amber-600">Modifié</span>}
          </div>
        </div>
        <DeleteButton skill={data.skill} isBase={data.is_base} />
      </div>
      <div className="p-5 space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={10}
          className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{prompt.length} caractères</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPrompt(data.prompt)}
              disabled={!dirty || isPending}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={() => updateSkill({ skill: data.skill, prompt })}
              disabled={!dirty || isPending || !prompt.trim()}
              className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ──────────────────────────────────────────────────── */
export default function Skills() {
  const [showForm, setShowForm] = useState(false);
  const { data: skills, isLoading, isError } = useSkills();

  return (
    <div className="min-h-screen bg-gray-100">
      <Asides />
      <div className="md:pl-64 flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Skills IA</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Comportement de l'IA selon le contexte métier — rechargé à chaud.
                </p>
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nouveau skill
                </button>
              )}
            </div>

            <details className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-blue-900">
                Voir le pattern recommandé
              </summary>
              <pre className="text-xs text-blue-800 mt-3 whitespace-pre-wrap font-mono">
                {PATTERN_HELP}
              </pre>
            </details>

            {showForm && <NewSkillForm onClose={() => setShowForm(false)} />}

            {isLoading && (
              <div className="text-center py-12 text-gray-400 text-sm">Chargement...</div>
            )}
            {isError && (
              <div className="text-center py-12 text-red-500 text-sm">
                Erreur lors du chargement des skills.
              </div>
            )}

            {skills && (
              <div className="space-y-4">
                {skills.map((s) => (
                  <SkillCard key={s.skill} data={s} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
