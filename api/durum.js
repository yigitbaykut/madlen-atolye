import { anahtarYok, modelSec } from "./_gemini.js";

export default async function handler(req, res) {
  if (anahtarYok(res)) return;
  res.json({ tamam: true, model: await modelSec() });
}
