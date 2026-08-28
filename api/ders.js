import { anahtarYok, geminiJSON, mufredatNotu, SEMA_DERS } from "./_gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ hata: "Yalnizca POST." });
  if (anahtarYok(res)) return;

  const { konu, sinif, ders, sure, mufredat = "MEB", not = "" } = req.body || {};
  if (!konu || !sinif || !ders) {
    return res.status(400).json({ hata: "Konu, sinif ve ders alanlari zorunlu." });
  }

  const sistem = `Sen Madlen platformunda calisan kidemli bir ogretim tasarimcisisin. Gorevin, ogretmenin dogrudan sinifa goturebilecegi bir ders plani uretmek.

${mufredatNotu(mufredat)}

Kurallar:
- Somut ol. "Ogrenciler konuyu anlar" gibi olculemeyen ifade yazma; gozlemlenebilir fiil kullan.
- slaytlar tam olarak 5 slayt olsun. Her slaytta 3-4 madde, bir gorsel onerisi ve ogretmenin sesli soyleyecegi 1-2 cumlelik konusma notu bulunsun.
- tartismaSorulari tam olarak 3 soru olsun. Her biri acik uclu olsun, tek kelimeyle cevaplanamasin.
- kavramYanilgilari: bu yas grubunun bu konuda gercekten yaptigi 2-3 tipik hatayi yaz ve her biri icin sinifta uygulanabilir somut bir mudahale ver.
- olcme.cikisKarti: dersin son 3 dakikasinda sorulacak tek bir soru.
- yazmaGorevi: bu dersin ogrenme ciktilarina bagli, ogrencinin yazacagi kisa bir metin gorevi ve onu degerlendirmek icin 3-4 olcut. Olcutler bu derse ozel olsun, genel yazma olcutu olmasin.
- Uydurma kaynak, sahte istatistik veya gercek disi tarih verme.`;

  const kullanici = `Ders: ${ders}
Sinif seviyesi: ${sinif}
Konu: ${konu}
Ders suresi: ${sure || 40} dakika
${not ? `Ogretmenin ek notu: ${not}` : ""}`;

  try {
    const plan = await geminiJSON({ sistem, kullanici, sema: SEMA_DERS, sicaklik: 0.8 });
    res.json(plan);
  } catch (e) {
    res.status(502).json({ hata: e.message });
  }
}
