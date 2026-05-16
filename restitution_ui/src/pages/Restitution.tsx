import { useRef, useEffect, useMemo, useState } from "react";
import { Row, HeaderContext, SortingState } from "@tanstack/react-table";
import BasicTable from "@/components/table/BasicTable";
import Header from "@/layout/headers/Header";
import Asides from "@/layout/asides/Asides";
import { UrlRestitution } from "@/layout/content/url";
import useRestitutions, {
  RestitutionType,
} from "@/components/queries/useRestitutions";
import {
  useDocuments,
  useDeleteDocument,
  useDeleteBulkDocuments,
  DocumentType,
} from "@/components/queries/useDocuments";
import {
  useSkills,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
  SkillType,
} from "@/components/queries/useSkills";
import { ErrorBoundary } from "react-error-boundary";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import UploadDocumentModal from "@/components/modals/UploadDocumentModal";
import EditDocumentModal from "@/components/modals/EditDocumentModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      id={`checkbox-${Math.random().toString(36).substr(2, 9)}`}
      name="select-row"
      ref={ref}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 cursor-pointer accent-blue-600"
    />
  );
}

const PATTERN_HELP = `## Rôle
<qui est l'analyste et son domaine d'expertise>

## Focus
<ce qu'il doit observer dans les données>

## Ton
<ton et style de communication attendus>`;

function SkillsPanel({
  showAdd,
  onCloseAdd,
  search = "",
}: {
  showAdd: boolean;
  onCloseAdd: () => void;
  search?: string;
}) {
  const { data: skills, isLoading } = useSkills();
  const q = search.toLowerCase();
  const filteredSkills = q ? skills?.filter((s) => s.skill.toLowerCase().includes(q)) : skills;
  const { mutate: createSkill, isPending: isCreating } = useCreateSkill();
  const { mutate: updateSkill, isPending: isUpdating } = useUpdateSkill();
  const { mutate: deleteSkill, isPending: isDeleting } = useDeleteSkill();

  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [confirmDeleteSkillName, setConfirmDeleteSkillName] = useState<
    string | null
  >(null);
  const [newSkill, setNewSkill] = useState("");
  const [newPrompt, setNewPrompt] = useState(PATTERN_HELP);

  const startEdit = (s: SkillType) => {
    setEditingSkill(s.skill);
    setEditPrompt(s.prompt);
  };

  const cancelEdit = () => {
    setEditingSkill(null);
    setEditPrompt("");
  };

  const confirmEdit = () => {
    if (!editingSkill) return;
    updateSkill(
      { skill: editingSkill, prompt: editPrompt },
      { onSuccess: cancelEdit },
    );
  };

  const handleCreate = () => {
    if (!newSkill.trim()) return;
    createSkill(
      { skill: newSkill.trim(), prompt: newPrompt.trim() },
      {
        onSuccess: () => {
          onCloseAdd();
          setNewSkill("");
          setNewPrompt(PATTERN_HELP);
        },
      },
    );
  };

  const handleCancelAdd = () => {
    onCloseAdd();
    setNewSkill("");
    setNewPrompt(PATTERN_HELP);
  };

  return (
    <div className="pt-4">
      {isLoading ? (
        <p className="text-sm text-gray-400 animate-pulse">
          Chargement des skills…
        </p>
      ) : (
        <>
          {/* ── Cartes skills ── */}
          <div className="flex flex-wrap gap-4 items-start">
            {filteredSkills?.map((s) => (
              <div
                key={s.skill}
                className={`flex flex-col border rounded-lg bg-white shadow-sm transition-all ${
                  editingSkill === s.skill
                    ? "border-teal-300 min-w-[360px] max-w-[560px] px-5 py-4"
                    : "border-gray-200 min-w-[220px] max-w-[300px] px-4 py-3"
                }`}
              >
                {/* En-tête de la carte */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800 capitalize">
                      {s.skill}
                    </span>
                    {s.is_base && (
                      <span className="text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">
                        Base
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {editingSkill === s.skill ? (
                      <>
                        <button
                          onClick={confirmEdit}
                          disabled={isUpdating}
                          className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 transition"
                        >
                          {isUpdating ? "…" : "Enregistrer"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(s)}
                          className="text-gray-400 hover:text-blue-600 transition"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSkillName(s.skill)}
                          className="text-gray-400 hover:text-red-600 transition"
                          title={s.is_base ? "Réinitialiser" : "Supprimer"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Corps */}
                {editingSkill === s.skill ? (
                  <>
                    <label className="text-xs font-medium text-gray-500 mb-1">
                      Prompt
                    </label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={8}
                      className="w-full font-mono text-xs border border-gray-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500 resize-y"
                    />
                    <span className="text-xs text-gray-400 mt-1 self-end">
                      {editPrompt.length} caractères
                    </span>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 line-clamp-4 leading-relaxed">
                    {s.prompt || "—"}
                  </p>
                )}
              </div>
            ))}

            {/* ── Carte d'ajout ── */}
            {showAdd && (
              <div className="mb-6 flex flex-col border border-teal-300 bg-teal-50 rounded-lg shadow-sm min-w-[360px] max-w-[560px] px-5 py-4">
                {/* En-tête */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex flex-col flex-1 min-w-0">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      pattern="[a-z][a-z0-9_]{1,29}"
                      placeholder="Nom du skill (ex : rh)"
                      className="font-semibold text-sm bg-transparent border-b border-teal-300 outline-none pb-0.5 placeholder:text-teal-400 text-gray-800"
                    />
                    <span className="text-xs text-teal-600 mt-0.5">
                      lettres minuscules et _
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCreate}
                      disabled={isCreating || !newSkill.trim()}
                      className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isCreating ? "…" : "Créer"}
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="px-3 py-1 text-xs border border-teal-300 text-teal-700 bg-white rounded hover:bg-teal-100 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>

                {/* Corps */}
                <label className="text-xs font-medium text-teal-700 mb-1">
                  Prompt
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={8}
                  className="w-full font-mono text-xs border border-teal-200 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500 resize-y bg-white"
                />
                <span className="text-xs text-teal-600 mt-1 self-end">
                  {newPrompt.length} caractères
                </span>
              </div>
            )}
          </div>
 
        </>
      )}

      <DeleteConfirmModal
        isOpen={confirmDeleteSkillName !== null}
        onClose={() => setConfirmDeleteSkillName(null)}
        onConfirm={() => {
          if (!confirmDeleteSkillName) return;
          deleteSkill(confirmDeleteSkillName, {
            onSettled: () => setConfirmDeleteSkillName(null),
          });
        }}
        isLoading={isDeleting}
        message={
          confirmDeleteSkillName
            ? `Êtes-vous sûr de vouloir ${
                skills?.find((s) => s.skill === confirmDeleteSkillName)?.is_base
                  ? "réinitialiser le skill"
                  : "supprimer le skill"
              } « ${confirmDeleteSkillName} » ?`
            : undefined
        }
      />
    </div>
  );
}

export default function Restitution() {
  const [mode, setMode] = useState<"restitution" | "documents" | "skills">(
    "restitution",
  );
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [editDocData, setEditDocData] = useState<DocumentType | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useRestitutions(page, debouncedSearch, ordering);
  const {
    data: documents,
    isLoading: isDocsLoading,
    isError: isDocsError,
  } = useDocuments();
  const { mutate: deleteDocument } = useDeleteDocument();
  const { mutate: deleteBulkDocuments } = useDeleteBulkDocuments();

  const totalPages = Math.ceil((data?.count ?? 0) / 6);

  const handleSortingChange = (sortingState: SortingState) => {
    setSorting(sortingState);
    if (sortingState.length > 0) {
      const { id, desc } = sortingState[0];
      setOrdering(desc ? `-${id}` : id);
    } else {
      setOrdering("");
    }
  };

  const statusMap: Record<string, { label: string; cls: string }> = {
    indexe: { label: "Indexé", cls: "bg-green-100 text-green-700" },
    en_attente: { label: "En attente", cls: "bg-gray-100 text-gray-600" },
    indexation: { label: "Indexation…", cls: "bg-yellow-100 text-yellow-700" },
    erreur: { label: "Erreur", cls: "bg-red-100 text-red-600" },
  };

  const docColumns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }: HeaderContext<any, unknown>) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={(event) => table.getToggleAllRowsSelectedHandler()(event)}
          />
        ),
        cell: ({ row }: { row: Row<any> }) => (
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            disabled={!row.getCanSelect()}
            onChange={(event) => row.getToggleSelectedHandler()(event)}
          />
        ),
      },
      {
        header: "Numéro",
        accessorKey: "id",
      },
      {
        header: "Titre",
        accessorKey: "titre",
      },
      {
        header: "Date de création",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<any> }) => {
          const date = new Date(row.original.created_at);
          return `Le ${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
        },
      },
      {
        header: "Date de modification",
        accessorKey: "updated_at",
        cell: ({ row }: { row: Row<any> }) => {
          const date = new Date(row.original.updated_at);
          return `Le ${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
        },
      },
      {
        header: "Catégorie",
        accessorKey: "categorie",
        cell: ({ row }: { row: Row<any> }) => (
          <span className="capitalize">{row.original.categorie ?? "—"}</span>
        ),
      },
      {
        header: "Tronc (chunks)",
        accessorKey: "nb_chunks",
      },
      {
        header: "Statut",
        accessorKey: "statut",
        cell: ({ row }: { row: Row<any> }) => {
          const s = row.original.statut as string;
          const { label, cls } = statusMap[s] ?? { label: s, cls: "" };
          return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
              {label}
            </span>
          );
        },
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [],
  );

  const resColumns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }: HeaderContext<RestitutionType, unknown>) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={(event) => table.getToggleAllRowsSelectedHandler()(event)}
          />
        ),
        cell: ({ row }: { row: Row<RestitutionType> }) => (
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            disabled={!row.getCanSelect()}
            onChange={(event) => row.getToggleSelectedHandler()(event)}
          />
        ),
      },
      {
        header: "Numéro",
        accessorKey: "id",
      },
      {
        header: "Nom de la restitution",
        accessorKey: "nom",
      },
      {
        header: "Date de création",
        accessorKey: "created_at",
        cell: ({ row }: { row: Row<RestitutionType> }) => {
          const rawDate = row.original.created_at;
          const date = new Date(rawDate);
          const formatted = `Le ${date.toLocaleDateString(
            "fr-FR",
          )} à ${date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
          return formatted;
        },
      },
      {
        header: "Date de modification",
        accessorKey: "updated_at",
        cell: ({ row }: { row: Row<RestitutionType> }) => {
          const rawDate = row.original.updated_at;
          const date = new Date(rawDate);
          const formatted = `Le ${date.toLocaleDateString(
            "fr-FR",
          )} à ${date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
          return formatted;
        },
      },
      {
        header: "Créer par",
        // accessorKey: "created_by.username", // Desactiver le sorting ici
        cell: ({ row }: { row: Row<RestitutionType> }) =>
          row.original.created_by?.first_name ?? "—",
      },
      {
        header: "Affichage sous forme",
        cell: ({ row }: { row: Row<RestitutionType> }) =>
          row.original.affichages?.[0]?.nom_affichage ?? "—",
        // enableGlobalFilter: false,
        // enableSorting: false,
      },
    ],
    [],
  );

  const filteredDocs = useMemo(
    () =>
      search
        ? (documents ?? []).filter((d) =>
            d.titre.toLowerCase().includes(search.toLowerCase()),
          )
        : (documents ?? []),
    [documents, search],
  );

  const handleSetMode = (next: typeof mode) => {
    if (next !== "skills") setShowAddSkill(false);
    if (next !== "documents") setShowAddDoc(false);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setMode(next);
  };

  const titles: Record<typeof mode, string> = {
    restitution: "Restitution des données",
    documents: "Base Documentaire IA",
    skills: "Skills IA",
  };

  return (
    <>
      <Asides />

      <div className="md:pl-64 flex flex-col flex-1">
        <Header />

        <main className="flex-1">
          <UrlRestitution />
          <div className="py-2">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900 my-3">
                {titles[mode]}
              </h1>
            </div>

            <ErrorBoundary fallback={<div>Erreur dans le tableau.</div>}>
              <BasicTable
                data={mode === "documents" ? filteredDocs : (data?.results ?? [])}
                columns={mode === "documents" ? docColumns : resColumns}
                isLoading={mode === "documents" ? isDocsLoading : isLoading}
                isError={mode === "documents" ? isDocsError : isError}
                page={mode === "documents" ? 1 : page}
                totalPages={mode === "documents" ? 1 : totalPages}
                setPage={mode === "documents" ? () => {} : setPage}
                search={search}
                setSearch={setSearch}
                sorting={sorting}
                setSorting={setSorting}
                onSortingChange={handleSortingChange}
                mode={mode}
                onSetMode={handleSetMode}
                onDeleteRow={
                  mode === "documents"
                    ? (id, onSuccess) => deleteDocument(id, { onSuccess })
                    : undefined
                }
                onBulkDeleteRow={
                  mode === "documents"
                    ? (ids, onSuccess) =>
                        deleteBulkDocuments(ids, { onSuccess })
                    : undefined
                }
                onEditRow={
                  mode === "documents"
                    ? (row) => setEditDocData(row)
                    : undefined
                }
                onAdd={
                  mode === "skills"
                    ? () => setShowAddSkill(true)
                    : mode === "documents"
                      ? () => setShowAddDoc(true)
                      : undefined
                }
                customContent={
                  mode === "skills" ? (
                    <SkillsPanel
                      showAdd={showAddSkill}
                      onCloseAdd={() => setShowAddSkill(false)}
                      search={search}
                    />
                  ) : undefined
                }
              />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <UploadDocumentModal
        isOpen={showAddDoc}
        onClose={() => setShowAddDoc(false)}
      />

      <EditDocumentModal
        document={editDocData}
        onClose={() => setEditDocData(null)}
      />
    </>
  );
}
