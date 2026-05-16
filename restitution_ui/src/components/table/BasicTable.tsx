import React, { useState, useEffect } from "react";
import {
  getCoreRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Pagination from "@/components/table/Pagination";
import TableToolbar from "@/components/table/TableToolBar";
import TableHeader from "@/components/table/TableHeader";
import TableBody from "@/components/table/TableBody";
import {
  useDeleteRestitution,
  useDeleteBulkRestitutions,
} from "@/components/queries/useDeleteRestitution";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import BulkDeleteConfirmModal from "../modals/BulkDeleteConfirmModal";

type BasicTableProps = {
  data: any[];
  columns: any[];
  isLoading?: boolean;
  isError?: boolean;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (value: string) => void;
  sorting: SortingState;
  setSorting: (value: SortingState) => void;
  onSortingChange: (sorting: SortingState) => void;
  mode?: "restitution" | "documents" | "skills";
  onSetMode?: (mode: "restitution" | "documents" | "skills") => void;
  onDeleteRow?: (id: number, onSuccess: () => void) => void;
  onBulkDeleteRow?: (ids: number[], onSuccess: () => void) => void;
  onEditRow?: (row: any) => void;
  onAdd?: () => void;
  customContent?: React.ReactNode;
};

export default function BasicTable({
  data,
  columns,
  isLoading = false,
  isError = false,
  page,
  totalPages,
  setPage,
  search,
  setSearch,
  sorting,
  setSorting,
  onSortingChange,
  mode = "restitution",
  onSetMode,
  onDeleteRow,
  onBulkDeleteRow,
  onEditRow,
  onAdd,
  customContent,
}: BasicTableProps) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRowSelection({});
  }, [mode]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Bulk delete modal states
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const { mutate: deleteRestitution, isPending: isDeleting } =
    useDeleteRestitution();
  const { mutate: deleteBulk, isPending: isBulkDeleting } =
    useDeleteBulkRestitutions();

  const table = useReactTable({
    data,
    columns,
    manualSorting: true,

    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row.id.toString(),
    groupedColumnMode: "reorder",

    state: {
      rowSelection,
      columnVisibility,
      sorting,
    },

    onSortingChange: (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;

      onSortingChange(newSorting);
    },

    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
  });

  // Supprimer une seule ligne
  function handleConfirmDelete() {
    if (confirmDeleteId === null) return;
    if (onDeleteRow) {
      onDeleteRow(confirmDeleteId, () => setConfirmDeleteId(null));
    } else {
      deleteRestitution(confirmDeleteId, {
        onSuccess: () => setConfirmDeleteId(null),
      });
    }
  }

  // Supprimer en bulk
  function handleBulkDeleteConfirm() {
    const ids = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((id) => Number(id));

    if (ids.length === 0) return;

    const onSuccess = () => {
      setIsBulkDeleteOpen(false);
      setRowSelection({});
    };

    if (onBulkDeleteRow) {
      onBulkDeleteRow(ids, onSuccess);
    } else {
      deleteBulk(ids, { onSuccess });
    }
  }

  return (
    <>
      <div className="max-h-screen-xl p-4 w-[98%]">
        <TableToolbar
          table={table}
          onBulkDelete={() => setIsBulkDeleteOpen(true)}
          search={search}
          setSearch={setSearch}
          mode={mode}
          onSetMode={onSetMode}
          onAdd={onAdd}
        />

        {customContent ?? (
          <>
            <div className="my-4 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <TableHeader headerGroups={table.getHeaderGroups()} />
                      <TableBody
                        rows={table.getRowModel().rows}
                        onRowSelect={(rowId) =>
                          setRowSelection((prev) => ({
                            ...prev,
                            [rowId]: !prev[rowId],
                          }))
                        }
                        onDeleteRequest={(id) => setConfirmDeleteId(id)}
                        onEditRequest={onEditRow}
                        isLoading={isLoading}
                        isError={isError}
                        isEmpty={
                          !isLoading &&
                          !isError &&
                          table.getRowModel().rows.length === 0
                        }
                        isDeleting={isDeleting}
                        actionsMode={mode === "documents" ? "delete-only" : "all"}
                        emptyMessage={mode === "documents" ? "Aucun document trouvé." : "Aucune restitution trouvée."}
                      />
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        message={
          mode === "documents"
            ? "Êtes-vous sûr de vouloir supprimer ce document ? Les chunks indexés associés seront également supprimés."
            : undefined
        }
      />

      <BulkDeleteConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        isLoading={isBulkDeleting}
        count={Object.keys(rowSelection).filter((key) => rowSelection[key]).length}
        itemLabel={mode === "documents" ? "document" : "restitution"}
        feminine={mode !== "documents"}
      />
    </>
  );
}
