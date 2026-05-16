import { Table } from "@tanstack/react-table";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";
import { Plus, Trash2, FileText, Sparkles, LayoutList } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Mode = "restitution" | "documents" | "skills";

type TableToolbarProps = {
  table: Table<any>;
  onBulkDelete: () => void;
  search: string;
  setSearch: (value: string) => void;
  mode?: Mode;
  onSetMode?: (mode: Mode) => void;
  onAdd?: () => void;
};

const modeBtn = "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border shadow-sm focus:outline-none focus:ring-1 focus:ring-teal-500 rounded-sm transition-colors bg-white border-gray-300 text-gray-600 hover:bg-gray-50";

export default function TableToolbar({
  table,
  onBulkDelete,
  search,
  setSearch,
  mode = "restitution",
  onSetMode,
  onAdd,
}: TableToolbarProps) {
  const selectedRowIds = table.getState().rowSelection;
  const selectedRowCount = Object.keys(selectedRowIds).length;
  const navigate = useNavigate();

  const handleAdd = () => {
    if (onAdd) { onAdd(); return; }
    if (mode === "documents") { navigate("/documents"); return; }
    navigate("/parametrage");
  };

  return (
    <div className="w-full divide-y divide-gray-200 overflow-visible rounded-lg bg-white">
      <div className="flex items-center justify-end p-2 border-t border-gray-300">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche"
            className="p-2 mr-2 shadow-sm border outline-0 focus:ring-teal-500 focus:border-teal-500 sm:text-sm border-gray-300 rounded-md"
            id="recherche"
            name="recherche"
            autoComplete="off"
          />

          <div className="min-h-[20px] w-px bg-gray-500 mx-2" />

          {selectedRowCount > 0 && (
            <button
              onClick={onBulkDelete}
              className="bg-transparent text-black border border-gray-500 px-4 py-1 rounded-sm flex items-center gap-2 hover:bg-red-500 hover:text-white transition"
            >
              <Trash2 size={18} />
              Supprimer ({selectedRowCount})
            </button>
          )}

          <div className="min-h-[20px] w-px bg-gray-300 mx-1" />

          {/* Show buttons for the two OTHER modes */}
          {mode !== "restitution" && (
            <button className={modeBtn} onClick={() => onSetMode?.("restitution")} title="Restitution des données">
              <LayoutList size={16} />
              Restitution
            </button>
          )}
          {mode !== "documents" && (
            <button className={modeBtn} onClick={() => onSetMode?.("documents")} title="Base Documentaire IA">
              <FileText size={16} />
              Base Doc
            </button>
          )}
          {mode !== "skills" && (
            <button className={modeBtn} onClick={() => onSetMode?.("skills")} title="Skills IA">
              <Sparkles size={16} />
              Skills IA
            </button>
          )}

          <div className="min-h-[20px] w-px bg-gray-500 mx-2" />

          <button
            className="capitalize inline-flex items-center justify-center gap-1.5 border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:ring-offset-2 sm:w-auto"
            onClick={(e) => { e.stopPropagation(); handleAdd(); }}
          >
            <Plus size={16} />
            Ajouter
          </button>

          <ColumnVisibilityMenu table={table} />
        </div>
      </div>
    </div>
  );
}
