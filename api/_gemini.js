// Ortak Gemini katmani. Dosya adi _ ile basladigi icin Vercel bunu bir uc nokta yapmaz.
// API anahtari yalnizca burada, sunucu tarafinda kullanilir.

export const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const API_KEY = process.env.GEMINI_API_KEY;

const MODEL_TERCIHLERI = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
];

let onbellek = null;

export async function modelSec() {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (onbellek) return onbellek;
  try {
    const r = await fetch(`${BASE}/models?key=${API_KEY}&pageSize=200`);
    if (!r.ok) throw new Error("liste alinamadi");
    const data = await r.json();
    const var_ = new Set(
      (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => (m.name || "").replace("models/", ""))
    );
    onbellek = MODEL_TERCIHLERI.find((m) => var_.has(m)) || "gemini-2.5-flash";
  } catch {
    onbellek = "gemini-2.5-flash";
  }
  return onbellek;
}

export function anahtarYok(res) {
  if (!API_KEY) {
    res.status(500).json({
      hata:
        "GEMINI_API_KEY tanimli degil. Vercel'de Settings > Environment Variables bolumune GEMINI_API_KEY adiyla ekleyip projeyi yeniden deploy edin.",
    });
    return true;
  }
  return false;
}

export async function geminiJSON({ sistem, kullanici, sema, sicaklik = 0.7 }) {
  const model = await modelSec();
  const r = await fetch(`${BASE}/models/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistem }] },
      contents: [{ role: "user", parts: [{ text: kullanici }] }],
      generationConfig: {
        temperature: sicaklik,
        responseMimeType: "application/json",
        responseSchema: sema,
      },
    }),
  });
  if (!r.ok) {
    const metin = await r.text();
    throw new Error(`Gemini ${r.status}: ${metin.slice(0, 400)}`);
  }
  const data = await r.json();
  const parca = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!parca) throw new Error("Model bos yanit dondu. Tekrar deneyin.");
  return JSON.parse(parca);
}

export function mufredatNotu(mufredat) {
  if (mufredat === "MEB") {
    return `Turkiye Yuzyili Maarif Modeli (TYMM) cercevesini kullan.
- ogrenmeCiktilari icin MEB kazanim kodu bicimini kullan (ornek: F.8.4.1.1, M.6.1.2.3, T.7.3.1.2). Kodu ilgili ders ve sinifa gore mantikli uret ve kesin oldugunu iddia etme.
- beceriler.alan: ilgili dersin alan becerileri (ornek fen icin: bilimsel gozlem, cikarim yapma, deney tasarlama).
- beceriler.kavramsal: TYMM kavramsal becerileri (ornek: analitik dusunme, siniflandirma, karsilastirma, degerlendirme).
- beceriler.egilimler: TYMM egilimleri (ornek: merak, sebat, ozdenetim, is birligi).
- degerler: TYMM erdem-deger-eylem cercevesinden (ornek: sorumluluk, durustluk, saygi, adalet, tasarruf).
- okuryazarlik: TYMM okuryazarlik turleri (ornek: bilgi okuryazarligi, dijital okuryazarlik, veri okuryazarligi, gorsel okuryazarlik, surdurulebilirlik okuryazarligi).
Tum ciktilari TURKCE yaz.`;
  }
  if (mufredat === "UK") {
    return `Use the UK National Curriculum framework.
- ogrenmeCiktilari kod field: use National Curriculum reference style (e.g. KS3 Sc 2.1).
- beceriler.alan: subject-specific skills. beceriler.kavramsal: cross-curricular thinking skills. beceriler.egilimler: learning dispositions.
- degerler: British Values and school character values where relevant.
- okuryazarlik: literacy, numeracy, digital literacy, oracy.
Write ALL output fields in ENGLISH.`;
  }
  return `Use the Cambridge IGCSE / A-Level framework.
- ogrenmeCiktilari kod field: use syllabus reference style (e.g. 0625/2.3).
- Include assessment objectives (AO1 knowledge, AO2 application, AO3 analysis) where relevant.
Write ALL output fields in ENGLISH.`;
}

export const SEMA_DERS = {
  type: "OBJECT",
  properties: {
    baslik: { type: "STRING" },
    ozet: { type: "STRING" },
    sureDk: { type: "INTEGER" },
    ogrenmeCiktilari: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { kod: { type: "STRING" }, ifade: { type: "STRING" } },
        required: ["kod", "ifade"],
      },
    },
    beceriler: {
      type: "OBJECT",
      properties: {
        alan: { type: "ARRAY", items: { type: "STRING" } },
        kavramsal: { type: "ARRAY", items: { type: "STRING" } },
        egilimler: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["alan", "kavramsal", "egilimler"],
    },
    degerler: { type: "ARRAY", items: { type: "STRING" } },
    okuryazarlik: { type: "ARRAY", items: { type: "STRING" } },
    anahtarKavramlar: { type: "ARRAY", items: { type: "STRING" } },
    onKosulBilgi: { type: "ARRAY", items: { type: "STRING" } },
    kavramYanilgilari: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { yanilgi: { type: "STRING" }, mudahale: { type: "STRING" } },
        required: ["yanilgi", "mudahale"],
      },
    },
    slaytlar: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          baslik: { type: "STRING" },
          maddeler: { type: "ARRAY", items: { type: "STRING" } },
          gorselOnerisi: { type: "STRING" },
          konusmaNotu: { type: "STRING" },
        },
        required: ["baslik", "maddeler", "gorselOnerisi", "konusmaNotu"],
      },
    },
    tartismaSorulari: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { soru: { type: "STRING" }, amac: { type: "STRING" } },
        required: ["soru", "amac"],
      },
    },
    farklilastirma: {
      type: "OBJECT",
      properties: {
        destek: { type: "ARRAY", items: { type: "STRING" } },
        zenginlestirme: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["destek", "zenginlestirme"],
    },
    olcme: {
      type: "OBJECT",
      properties: {
        ogrenmeKanitlari: { type: "ARRAY", items: { type: "STRING" } },
        cikisKarti: { type: "STRING" },
      },
      required: ["ogrenmeKanitlari", "cikisKarti"],
    },
    yazmaGorevi: {
      type: "OBJECT",
      properties: {
        yonerge: { type: "STRING" },
        rubrikOlcutleri: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { ad: { type: "STRING" }, tanim: { type: "STRING" } },
            required: ["ad", "tanim"],
          },
        },
      },
      required: ["yonerge", "rubrikOlcutleri"],
    },
  },
  required: [
    "baslik", "ozet", "sureDk", "ogrenmeCiktilari", "beceriler", "degerler",
    "okuryazarlik", "anahtarKavramlar", "onKosulBilgi", "kavramYanilgilari",
    "slaytlar", "tartismaSorulari", "farklilastirma", "olcme", "yazmaGorevi",
  ],
};

export const SEMA_DEGERLENDIRME = {
  type: "OBJECT",
  properties: {
    genelPuan: { type: "INTEGER" },
    seviye: { type: "STRING" },
    olcutler: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ad: { type: "STRING" },
          puan: { type: "INTEGER" },
          gerekce: { type: "STRING" },
          kanit: { type: "STRING" },
        },
        required: ["ad", "puan", "gerekce", "kanit"],
      },
    },
    satirIci: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          alinti: { type: "STRING" },
          tur: { type: "STRING" },
          yorum: { type: "STRING" },
          oneri: { type: "STRING" },
        },
        required: ["alinti", "tur", "yorum", "oneri"],
      },
    },
    ogrenciOzeti: { type: "STRING" },
    sonrakiAdim: { type: "STRING" },
  },
  required: ["genelPuan", "seviye", "olcutler", "satirIci", "ogrenciOzeti", "sonrakiAdim"],
};
