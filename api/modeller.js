import { anahtarYok, API_KEY, BASE } from "./_gemini.js";

export default async function handler(req, res) {
  if (anahtarYok(res)) return;
  const r = await fetch(`${BASE}/models?key=${API_KEY}&pageSize=200`);
  const data = await r.json();
  res.json(
    (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace("models/", ""))
  );
}
