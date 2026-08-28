import { anahtarYok, geminiJSON, SEMA_DEGERLENDIRME } from "./_gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ hata: "Yalnizca POST." });
  if (anahtarYok(res)) return;

  const { metin, sinif = "8. Sinif", ders = "", konu = "", olcutler = [], mufredat = "MEB" } = req.body || {};
  if (!metin || metin.trim().length < 40) {
    return res.status(400).json({ hata: "Degerlendirmek icin en az 40 karakterlik bir metin yapistirin." });
  }

  const dil = mufredat === "MEB" ? "TURKCE" : "ENGLISH";
  const rubrik =
    olcutler.length > 0
      ? olcutler.map((o) => `- ${o.ad}: ${o.tanim}`).join("\n")
      : `- Fikir ve icerik: Dusunce ozgun mu, konuyu gercekten ele almis mi?
- Yapi ve butunluk: Giris, gelisme, sonuc birbirini takip ediyor mu?
- Kanit ve gerekcelendirme: Iddialarini ornekle destekliyor mu?
- Dil ve anlatim: Cumleler acik mi, yas grubuna gore ne kadar guclu?`;

  const sistem = `Sen deneyimli bir ${ders || "Turkce"} ogretmenisin ve ${sinif} seviyesinde bir ogrencinin yazisini degerlendiriyorsun. Tum ciktilari ${dil} yaz.

Kullanacagin rubrik olcutleri (her biri 25 puan uzerinden, toplam 100):
${rubrik}

${konu ? `Bu yazi su dersin yazma gorevi icin yazildi: "${konu}". Degerlendirmeni bu dersin hedefleriyle iliskilendir.` : ""}

Kurallar:
- olcutler dizisinde YUKARIDAKI olcutlerin AYNISINI ve ayni sirayla kullan. Her birine 0-25 arasi puan ver.
- Her olcutun "kanit" alanina, ogrencinin metninden BIREBIR kopyalanmis kisa bir alinti koy. Alintiyi degistirme, duzeltme veya kisaltma.
- satirIci dizisinde 4-6 madde olsun. Her maddenin "tur" alani SADECE "guclu" veya "gelistirilmeli" olabilir, baska deger yazma. En az 2 madde "guclu" turunde olsun; sadece hata listeleme.
- satirIci icindeki "alinti" alani da metinden BIREBIR kopyalanmis olmali, en fazla 15 kelime.
- "oneri" alani somut olsun. "Daha iyi yaz" degil, "Bu cumleyi ikiye bol ve ikincisine bir ornek ekle" gibi.
- ogrenciOzeti: dogrudan ogrenciye hitap eden, 2. tekil sahis, 3-4 cumlelik sicak ve durust bir ozet. Once neyi iyi yaptigini soyle, sonra tek bir gelisim alani ver.
- sonrakiAdim: ogrencinin bu hafta yapacagi TEK bir somut alistirma.
- Notu sisirme. ${sinif} seviyesine gore gercekci puan ver.
- Metnin yazarina dair kisisel cikarim yapma, sadece yaziyi degerlendir.`;

  try {
    const sonuc = await geminiJSON({
      sistem,
      kullanici: `Degerlendirilecek ogrenci metni:\n\n"""\n${metin.slice(0, 12000)}\n"""`,
      sema: SEMA_DEGERLENDIRME,
      sicaklik: 0.4,
    });
    res.json(sonuc);
  } catch (e) {
    res.status(502).json({ hata: e.message });
  }
}
