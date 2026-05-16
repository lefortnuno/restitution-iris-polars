import { useState, useRef } from "react";
import { X } from "lucide-react";
import { useUploadDocument } from "@/components/queries/useDocuments";

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "financier", label: "Financier" },
  { value: "geographique", label: "Géographique" },
  { value: "temporel", label: "Temporel" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UploadDocumentModal({ isOpen, onClose }: Props) {
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("general");
  const [fichier, setFichier] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending } = useUploadDocument();

  if (!isOpen) return null;

  const reset = () => {
    setTitre("");
    setCategorie("general");
    setFichier(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fichier || !titre.trim()) return;
    const fd = new FormData();
    fd.append("titre", titre.trim());
    fd.append("categorie", categorie);
    fd.append("fichier", fichier);
    upload(fd, { onSuccess: handleClose });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Ajouter un document</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
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
              placeholder="Nom du document"
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fichier <span className="text-gray-400">(PDF ou TXT)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              required
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !fichier || !titre.trim()}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending ? "Upload en cours…" : "Uploader"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
