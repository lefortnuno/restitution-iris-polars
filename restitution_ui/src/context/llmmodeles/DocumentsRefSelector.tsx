import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useDocuments } from "@/components/queries/useDocuments";
import { divForm, divPackForm, inputSearcForm, labelForm } from "@/components/ui/styles";
import { ChevronDown } from "lucide-react";

export default function DocumentsRefSelector() {
  const { setValue, control } = useFormContext();
  const { data: documents, isLoading } = useDocuments();
  const llmmodeles = useWatch({ control, name: "llmmodeles" });
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const indexedDocs = documents?.filter((d) => d.statut === "indexe") ?? [];
  const selectedIds: number[] = llmmodeles?.[0]?.documents_ref ?? [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (id: number) => {
    const current = llmmodeles?.[0] ?? {};
    const already = selectedIds.includes(id);
    const next = already ? selectedIds.filter((i) => i !== id) : [...selectedIds, id];
    setValue("llmmodeles", [{ ...current, documents_ref: next }], { shouldDirty: true });
  };

  const label =
    selectedIds.length === 0
      ? "Recherche automatique"
      : `${selectedIds.length} doc(s) sélectionné(s)`;

  return (
    <div className={`${divPackForm} min-w-[220px]`} ref={ref}>
      <div className={`${divForm} border-gray-300`}>
        <label className={labelForm}>Docs RAG :</label>
        <div className="relative">
          <div className="flex flex-wrap gap-2 mt-0 items-center">
            <button
              type="button"
              onClick={() => !isLoading && indexedDocs.length > 0 && setIsOpen((o) => !o)}
              disabled={isLoading || indexedDocs.length === 0}
              className={`max-w-[100%] ${inputSearcForm} truncate flex items-center justify-between disabled:opacity-50 text-left`}
            >
              <span className={`truncate ${selectedIds.length === 0 ? "text-gray-400" : "text-gray-800"}`}>
                {isLoading ? "Chargement…" : indexedDocs.length === 0 ? "Aucun document indexé" : label}
              </span>
              {!isLoading && indexedDocs.length > 0 && (
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 ml-2 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>
          </div>
          {isOpen && (
            <div className="absolute top-full mt-1 w-full max-h-48 overflow-y-auto border border-gray-400 rounded-md bg-white shadow-lg z-50">
              {indexedDocs.map((doc) => (
                <label
                  key={doc.id}
                  className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 hover:bg-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.id)}
                    onChange={() => toggle(doc.id)}
                    className="accent-teal-600 h-3.5 w-3.5 shrink-0"
                  />
                  <span className="truncate text-gray-800" title={doc.titre}>
                    {doc.titre}
                  </span>
                  <span className="ml-auto text-gray-400 shrink-0 text-xs capitalize">
                    {doc.categorie}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
