import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useSkills } from "@/components/queries/useSkills";
import {
  divForm,
  divPackForm,
  inputSearcForm,
  labelForm,
  spanResultForm,
  xForm,
} from "@/components/ui/styles";
import { X } from "lucide-react";

export default function SkillSelector() {
  const { setValue, control } = useFormContext();
  const { data: skills, isLoading } = useSkills();
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const llmmodeles = useWatch({ control, name: "llmmodeles" });
  const currentSkill = llmmodeles?.[0]?.skill ?? "auto";
  const hasLlm = !!llmmodeles?.[0]?.libelle_llm;

  const options = [
    { value: "auto", label: "Détection automatique" },
    ...(skills?.map((s) => ({
      value: s.skill,
      label: s.skill.charAt(0).toUpperCase() + s.skill.slice(1),
    })) ?? []),
  ];

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((o) => o.value === currentSkill)?.label ?? currentSkill;
  const isDefaultSkill = currentSkill === "auto";

  const select = (value: string) => {
    const current = llmmodeles?.[0] ?? {};
    setValue("llmmodeles", [{ ...current, skill: value }], { shouldDirty: true });
    setSearch("");
    setIsFocused(false);
  };

  const clear = () => {
    const current = llmmodeles?.[0] ?? {};
    setValue("llmmodeles", [{ ...current, skill: "auto" }], { shouldDirty: true });
  };

  return (
    <div className={`${divPackForm} min-w-[200px]`}>
      <div className={`${divForm} border-gray-300`}>
        <label className={labelForm}>Skill IA :</label>
        <div className="relative">
          <div className="flex flex-wrap gap-2 mt-0 items-center">
            {!isDefaultSkill && (
              <div className="flex items-center p-2 mt-0 text-sm bg-gray-100 border border-gray-300 rounded shadow-sm min-w-0">
                <span
                  className={`${spanResultForm} cursor-pointer hover:text-teal-700`}
                  title="Cliquer pour modifier"
                  onClick={() => setIsFocused(true)}
                >
                  {selectedLabel}
                </span>
                <X onClick={clear} className={xForm} aria-label="Réinitialiser skill" />
              </div>
            )}
            {isDefaultSkill && (
              <input
                type="text"
                placeholder={isLoading ? "Chargement…" : !hasLlm ? "Choisir d'abord un modèle" : "Détection automatique"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => hasLlm && setIsFocused(true)}
                onBlur={() =>
                  requestAnimationFrame(() => {
                    setIsFocused(false);
                    setSearch("");
                  })
                }
                disabled={!hasLlm}
                className={`max-w-[100%] ${inputSearcForm} truncate disabled:opacity-50`}
                autoComplete="off"
              />
            )}
          </div>

          {isFocused && (
            <div className="absolute top-full mt-1 w-full max-h-60 overflow-y-auto flex flex-col border border-gray-400 rounded-md bg-white shadow-lg z-50">
              {filteredOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 hover:bg-gray-200"
                  onMouseDown={() => select(opt.value)}
                >
                  <span className="text-gray-800 truncate w-full">{opt.label}</span>
                </label>
              ))}
              {filteredOptions.length === 0 && (
                <div className="w-full border-0 px-3 py-2 text-sm text-gray-400 outline-none">
                  Skill non trouvé
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
