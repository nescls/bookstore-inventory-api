export function resolveLanguage(header?: string): "es" | "en" {
  const preferences = (header ?? "")
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.trim().toLowerCase().split(";");
      const qualityParam = params.find((param) =>
        param.trim().startsWith("q="),
      );
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;
      return { tag: tag.split("-")[0], quality, index };
    })
    .filter(
      (preference) =>
        Number.isFinite(preference.quality) &&
        preference.quality > 0 &&
        preference.quality <= 1,
    )
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return (
    (preferences.find(
      (preference) => preference.tag === "es" || preference.tag === "en",
    )?.tag as "es" | "en") || "es"
  );
}
