import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/components/queries/axiosInstance";
import { toast } from "react-toastify";

export interface DocumentType {
  id: number;
  titre: string;
  fichier: string;
  categorie: string;
  statut: "en_attente" | "indexation" | "indexe" | "erreur";
  nb_chunks: number;
  created_at: string;
  updated_at: string;
}

const STATUTS_EN_COURS = ["en_attente", "indexation"];

const fetchDocuments = async (): Promise<DocumentType[]> => {
  const response = await axiosInstance.get<DocumentType[]>("/documents/");
  return response.data;
};

export const useDocuments = () =>
  useQuery<DocumentType[], Error>({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (Array.isArray(docs) && docs.some((d) => STATUTS_EN_COURS.includes(d.statut))) {
        return 3000;
      }
      return false;
    },
  });

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axiosInstance.post("/documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Document uploadé — indexation en cours...");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.fichier?.[0] ?? "Erreur lors de l'upload.";
      toast.error(msg);
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, titre, categorie }: { id: number; titre: string; categorie: string }) => {
      const response = await axiosInstance.patch(`/documents/${id}/`, { titre, categorie });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Document mis à jour.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.titre?.[0] ?? "Erreur lors de la mise à jour.";
      toast.error(msg);
    },
  });
};

export const useDeleteBulkDocuments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await axiosInstance.delete("/documents/bulk_delete/", {
        data: { ids },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Documents supprimés.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression.");
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`/documents/${id}/`);
    },
    onSuccess: () => {
      toast.success("Document supprimé.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression.");
    },
  });
};
