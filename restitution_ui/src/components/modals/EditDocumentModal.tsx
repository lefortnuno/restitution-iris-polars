import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useUpdateDocument, DocumentType } from "@/components/queries/useDocuments";

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "financier", label: "Financier" },
  { value: "geographique", label: "Géographique" },
  { value: "temporel", label: "Temporel" },
];

type Props = {
  document: DocumentType | null;
  onClose: () => void;
};

export default function EditDocumentModal({ document, onClose }: Props) {
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("general");
  const { mutate: update, isPending } = useUpdateDocument();

  useEffect(() => {
    if (document) {
      setTitre(document.titre);
      setCategorie(document.categorie);
    }
  }, [document]);

  if (!document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    update({ id: document.id, titre: titre.trim(), categorie }, { onSuccess: onClose });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Modifier le document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400">
            Le fichier source ne peut pas être modifié. Pour changer le fichier, supprimez ce document et créez-en un nouveau.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !titre.trim()}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
