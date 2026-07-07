import { useEffect, useState } from "react";

export function useScoreOverrides() {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [showOverrides, setShowOverrides] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDelta, setNewDelta] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("seat_score_overrides");
      if (stored) setOverrides(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("seat_score_overrides", JSON.stringify(overrides));
  }, [overrides]);

  function addOverride() {
    const key = newKey.trim();
    const delta = parseFloat(newDelta);
    if (!key || isNaN(delta)) return;
    setOverrides((prev) => ({ ...prev, [key]: delta }));
    setNewKey("");
    setNewDelta("");
  }

  function removeOverride(key: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return {
    overrides,
    showOverrides,
    setShowOverrides,
    newKey,
    setNewKey,
    newDelta,
    setNewDelta,
    addOverride,
    removeOverride,
  };
}
