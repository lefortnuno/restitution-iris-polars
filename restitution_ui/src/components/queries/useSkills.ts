import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/components/queries/axiosInstance";
import { toast } from "react-toastify";

export interface SkillType {
  skill: string;
  prompt: string;
  is_base: boolean;
}

const fetchSkills = async (): Promise<SkillType[]> => {
  const response = await axiosInstance.get<SkillType[]>("/skills/");
  return response.data;
};

export const useSkills = () =>
  useQuery<SkillType[], Error>({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });

export const useCreateSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ skill, prompt }: { skill: string; prompt: string }) => {
      const response = await axiosInstance.post("/skills/", { skill, prompt });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Skill "${variables.skill}" créé.`);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Erreur lors de la création.";
      toast.error(msg);
    },
  });
};

export const useUpdateSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ skill, prompt }: { skill: string; prompt: string }) => {
      const response = await axiosInstance.put(`/skills/${skill}/`, { prompt });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Skill "${variables.skill}" mis à jour.`);
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Erreur lors de la mise à jour.";
      toast.error(msg);
    },
  });
};

export const useDeleteSkill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (skill: string) => {
      const response = await axiosInstance.delete(`/skills/${skill}/`);
      return { skill, status: response.status };
    },
    onSuccess: (data) => {
      if (data.status === 204) {
        toast.success(`Skill "${data.skill}" supprimé.`);
      } else {
        toast.info(`Skill "${data.skill}" réinitialisé au prompt par défaut.`);
      }
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? "Erreur lors de la suppression.";
      toast.error(msg);
    },
  });
};
