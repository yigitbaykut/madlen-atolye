/* Madlen Ogretmen Atolyesi - istemci mantigi
   Merkezi fikir: tek bir "ders baglami" nesnesi var ve uc arac da onu okuyor.
   Planla onu uretir, Ogret onunla sinirlanir, Degerlendir onun rubrigini kullanir. */

const $ = (s, k = document) => k.querySelector(s);
const $$ = (s, k = document) => [...k.querySelectorAll(s)];

const DERSLER = [
  "Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "Hayat Bilgisi",
  "İngilizce", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya",
  "Türk Dili ve Edebiyatı", "Din Kültürü ve Ahlak Bilgisi", "Felsefe",
  "Bilişim Teknolojileri", "Görsel Sanatlar", "Müzik", "Beden Eğitimi ve Spor",
];

const SINIFLAR = Array.from({ length: 12 }, (_, i) => `${i + 1}. Sınıf`);

const ORNEK_KONULAR = {
  "Fen Bilimleri": ["Basınç ve günlük hayattaki etkileri", "Madde döngüleri", "Kuvvet ve hareket"],
  "Matematik": ["Cebirsel ifadeler", "Oran ve orantı", "Veri analizi ve grafikler"],
  "Türkçe": ["Metinde ana fikir ve yardımcı fikir", "Cümlenin ögeleri", "Yazım kuralları"],
  "Sosyal Bilgiler": ["Üretim, dağıtım ve tüketim", "Etkin vatandaşlık", "İklim ve insan"],
  "Tarih": ["Kurtuluş Savaşı'nın hazırlık dönemi", "Sanayi Devrimi", "İpek Yolu"],
  "_varsayilan": ["Giriş konusu", "Temel kavramlar", "Uygulama örnekleri"],
};

/* ---------------- Durum ---------------- */

const durum = {
  baglam: null,   // { konu, ders, sinif, mufredat, ciktilar[], rubrik[] }
  plan: null,
  mesajlar: [],
};

function kaydet() {
  try {
    localStorage.setItem("madlen-atolye", JSON.stringify({
      baglam: durum.baglam, plan: durum.plan, mesajlar: durum.mesajlar,
    }));
  } catch { /* kota dolu olabilir, kritik degil */ }
}

function yukle() {
  try {
    const h = localStorage.getItem("madlen-atolye");
    if (!h) return;
    const d = JSON.parse(h);
    durum.baglam = d.baglam || null;
    durum.plan = d.plan || null;
    durum.mesajlar = d.mesajlar || [];
  } catch { /* bozuk kayit, temiz basla */ }
}

/* ---------------- Yardimcilar ---------------- */

function kacis(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function hataKutusu(mesaj) {
  const temiz = /429|quota|RESOURCE_EXHAUSTED/i.test(mesaj)
    ? "Gemini kota sınırına takıldı. Bir dakika bekleyip tekrar deneyin."
    : /API key|API_KEY|GEMINI_API_KEY/i.test(mesaj)
    ? "API anahtarı okunamadı. Replit'te Secrets bölümünde GEMINI_API_KEY tanımlı mı, kontrol edin."
    : /404|not found/i.test(mesaj)
    ? "Seçili model bulunamadı. /api/modeller adresini açıp kullanılabilir modelleri görebilirsiniz."
    : mesaj;
  return `<div class="hata"><b>İşlem tamamlanamadı</b>${kacis(temiz)}</div>`;
}

async function istek(yol, govde) {
  const r = await fetch(yol, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  const d = await r.json().catch(() => ({ hata: "Sunucudan geçerli yanıt gelmedi." }));
  if (!r.ok) throw new Error(d.hata || `Sunucu hatası (${r.status})`);
  return d;
}

function iskelet(satir = 6) {
  return `<div class="panel"><div class="yukleniyor">
    ${Array.from({ length: satir }, (_, i) =>
      `<div class="satir" style="width:${[100, 82, 94, 68, 88, 76][i % 6]}%"></div>`).join("")}
    <div class="not"><span class="nokta"></span><span id="ilerlemeNotu">Öğrenme çıktıları çıkarılıyor…</span></div>
  </div></div>`;
}

const ILERLEME = [
  "Öğrenme çıktıları çıkarılıyor…",
  "Kavram yanılgıları taranıyor…",
  "Slaytlar yazılıyor…",
  "Ölçme ve farklılaştırma hazırlanıyor…",
  "Son düzenlemeler yapılıyor…",
];

function ilerlemeBaslat() {
  let i = 0;
  return setInterval(() => {
    i = (i + 1) % ILERLEME.length;
    const el = $("#ilerlemeNotu");
    if (el) el.textContent = ILERLEME[i];
  }, 3400);
}

function kopyala(btn, metin) {
  navigator.clipboard.writeText(metin).then(() => {
    const eski = btn.textContent;
    btn.textContent = "Kopyalandı";
    btn.classList.add("kopyalandi");
    setTimeout(() => { btn.textContent = eski; btn.classList.remove("kopyalandi"); }, 1800);
  });
}

/* ---------------- Baglam etiketi (imza ogesi) ---------------- */

function baglamCiz() {
  const k = $("#baglamKutusu");
  if (!durum.baglam) {
    k.innerHTML = `<div class="baglam bos"><span class="metin">Ders bağlamı yok</span></div>`;
    return;
  }
  const b = durum.baglam;
  k.innerHTML = `<div class="baglam" title="Bu bağlam üç aracın hepsinde geçerli">
    <span class="metin">${kacis(b.sinif)} · ${kacis(b.ders)} · ${kacis(b.konu)}</span>
    <button class="temizle" id="baglamTemizle" aria-label="Ders bağlamını kaldır">×</button>
  </div>`;
  $("#baglamTemizle").onclick = () => {
    durum.baglam = null;
    durum.mesajlar = [];
    kaydet();
    baglamCiz(); sohbetCiz(); rubrikNotCiz(); sohbetBaglamNotCiz();
  };
}

/* ---------------- Arac gecisi ---------------- */

function aracAc(ad) {
  $$(".arac").forEach((s) => (s.hidden = s.id !== ad));
  $$(".asama").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.arac === ad)));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".asama").forEach((b) => (b.onclick = () => aracAc(b.dataset.arac)));

/* ---------------- 01 PLANLA ---------------- */

function ornekleriCiz() {
  const ders = $("#pDers").value;
  const liste = ORNEK_KONULAR[ders] || ORNEK_KONULAR._varsayilan;
  $("#pOrnekler").innerHTML = liste.map((k) => `<button type="button">${kacis(k)}</button>`).join("");
  $$("#pOrnekler button").forEach((b) => (b.onclick = () => ($("#pKonu").value = b.textContent)));
}

async function planUret() {
  const konu = $("#pKonu").value.trim();
  if (!konu) { $("#pKonu").focus(); return; }

  const govde = {
    konu,
    ders: $("#pDers").value,
    sinif: $("#pSinif").value,
    sure: $("#pSure").value,
    mufredat: $("#pMufredat").value,
    not: $("#pNot").value.trim(),
  };

  $("#pUret").disabled = true;
  $("#pUret").textContent = "Hazırlanıyor…";
  $("#pCikti").innerHTML = iskelet();
  const sayac = ilerlemeBaslat();

  try {
    const plan = await istek("/api/ders", govde);
    durum.plan = plan;
    durum.baglam = {
      konu: govde.konu,
      ders: govde.ders,
      sinif: govde.sinif,
      mufredat: govde.mufredat,
      ciktilar: plan.ogrenmeCiktilari || [],
      rubrik: plan.yazmaGorevi?.rubrikOlcutleri || [],
      yazmaGorevi: plan.yazmaGorevi?.yonerge || "",
    };
    durum.mesajlar = [];
    kaydet();
    planCiz();
    baglamCiz();
    sohbetBaglamNotCiz();
    rubrikNotCiz();
    sohbetCiz();
  } catch (e) {
    $("#pCikti").innerHTML = hataKutusu(e.message);
  } finally {
    clearInterval(sayac);
    $("#pUret").disabled = false;
    $("#pUret").textContent = "Ders planı oluştur";
  }
}

function planMetni(p) {
  const s = [];
  s.push(p.baslik, "", p.ozet, "", `Süre: ${p.sureDk} dk`, "");
  s.push("ÖĞRENME ÇIKTILARI");
  (p.ogrenmeCiktilari || []).forEach((c) => s.push(`${c.kod} — ${c.ifade}`));
  s.push("", "ANAHTAR KAVRAMLAR", (p.anahtarKavramlar || []).join(", "));
  s.push("", "KAVRAM YANILGILARI");
  (p.kavramYanilgilari || []).forEach((y) => s.push(`• ${y.yanilgi}\n  Müdahale: ${y.mudahale}`));
  s.push("", "SLAYTLAR");
  (p.slaytlar || []).forEach((sl, i) => {
    s.push(`${i + 1}. ${sl.baslik}`);
    (sl.maddeler || []).forEach((m) => s.push(`   - ${m}`));
    s.push(`   Görsel: ${sl.gorselOnerisi}`);
    s.push(`   Konuşma notu: ${sl.konusmaNotu}`);
  });
  s.push("", "TARTIŞMA SORULARI");
  (p.tartismaSorulari || []).forEach((t, i) => s.push(`${i + 1}. ${t.soru} (amaç: ${t.amac})`));
  s.push("", "FARKLILAŞTIRMA");
  s.push("Destek: " + (p.farklilastirma?.destek || []).join(" | "));
  s.push("Zenginleştirme: " + (p.farklilastirma?.zenginlestirme || []).join(" | "));
  s.push("", "ÖLÇME");
  (p.olcme?.ogrenmeKanitlari || []).forEach((k) => s.push(`- ${k}`));
  s.push(`Çıkış kartı: ${p.olcme?.cikisKarti || ""}`);
  s.push("", "YAZMA GÖREVİ", p.yazmaGorevi?.yonerge || "");
  (p.yazmaGorevi?.rubrikOlcutleri || []).forEach((r) => s.push(`- ${r.ad}: ${r.tanim}`));
  return s.join("\n");
}

function planCiz() {
  const p = durum.plan;
  if (!p) return;
  const b = durum.baglam;

  const rozet = (a) => `<span class="rozet">${kacis(a)}</span>`;

  $("#pCikti").innerHTML = `
  <div class="eylemler">
    <button class="btn btn-ince" id="pKopyala">Planı kopyala</button>
    <button class="btn btn-ince" id="pIndir">.txt indir</button>
    <button class="btn btn-ince" id="pYeniden">Aynı konuyu yeniden üret</button>
  </div>

  <div class="panel">
    <div class="plan-basi">
      <h2 class="serif">${kacis(p.baslik)}</h2>
      <p class="ozet">${kacis(p.ozet)}</p>
      <div class="etiketler">
        <span class="etiket">${kacis(b.sinif)}</span>
        <span class="etiket">${kacis(b.ders)}</span>
        <span class="etiket">${p.sureDk} dk</span>
        <span class="etiket">${kacis(b.mufredat === "MEB" ? "TYMM" : b.mufredat)}</span>
      </div>
    </div>

    <div class="blok">
      <h3>Öğrenme çıktıları</h3>
      ${(p.ogrenmeCiktilari || []).map((c) =>
        `<div class="cikti"><span class="kod mono">${kacis(c.kod)}</span><span>${kacis(c.ifade)}</span></div>`).join("")}
    </div>

    <div class="blok">
      <h3>Beceriler, değerler ve okuryazarlık</h3>
      <div class="alt-blok"><div class="ad">Alan becerileri</div><div class="rozetler">${(p.beceriler?.alan || []).map(rozet).join("")}</div></div>
      <div class="alt-blok"><div class="ad">Kavramsal beceriler</div><div class="rozetler">${(p.beceriler?.kavramsal || []).map(rozet).join("")}</div></div>
      <div class="alt-blok"><div class="ad">Eğilimler</div><div class="rozetler">${(p.beceriler?.egilimler || []).map(rozet).join("")}</div></div>
      <div class="alt-blok"><div class="ad">Değerler</div><div class="rozetler">${(p.degerler || []).map((d) => `<span class="rozet sari">${kacis(d)}</span>`).join("")}</div></div>
      <div class="alt-blok"><div class="ad">Okuryazarlık</div><div class="rozetler">${(p.okuryazarlik || []).map(rozet).join("")}</div></div>
    </div>

    <div class="blok">
      <h3>Kavram yanılgıları ve müdahale</h3>
      ${(p.kavramYanilgilari || []).map((y) =>
        `<div class="yanilgi"><div class="y">${kacis(y.yanilgi)}</div><div class="m"><b>Müdahale:</b> ${kacis(y.mudahale)}</div></div>`).join("")}
    </div>

    <div class="blok">
      <h3>Slayt yapısı</h3>
      ${(p.slaytlar || []).map((s, i) => `
        <div class="slayt">
          <div class="slayt-basi"><span class="slayt-no mono">${String(i + 1).padStart(2, "0")}</span><h4>${kacis(s.baslik)}</h4></div>
          <ul>${(s.maddeler || []).map((m) => `<li>${kacis(m)}</li>`).join("")}</ul>
          <div class="meta">
            <div><b>Görsel önerisi:</b> ${kacis(s.gorselOnerisi)}</div>
            <div><b>Konuşma notu:</b> ${kacis(s.konusmaNotu)}</div>
          </div>
        </div>`).join("")}
    </div>

    <div class="blok">
      <h3>Tartışma soruları</h3>
      ${(p.tartismaSorulari || []).map((t) =>
        `<div class="soru"><p>${kacis(t.soru)}</p><small>Amaç: ${kacis(t.amac)}</small></div>`).join("")}
    </div>

    <div class="blok">
      <h3>Farklılaştırma</h3>
      <div class="iki-sutun">
        <div><div class="ad" style="font-size:13px;font-weight:700;color:var(--gri);margin-bottom:6px">Destek</div>
          <ul class="sade">${(p.farklilastirma?.destek || []).map((x) => `<li>${kacis(x)}</li>`).join("")}</ul></div>
        <div><div class="ad" style="font-size:13px;font-weight:700;color:var(--gri);margin-bottom:6px">Zenginleştirme</div>
          <ul class="sade">${(p.farklilastirma?.zenginlestirme || []).map((x) => `<li>${kacis(x)}</li>`).join("")}</ul></div>
      </div>
    </div>

    <div class="blok" style="margin-bottom:0">
      <h3>Ölçme</h3>
      <ul class="sade">${(p.olcme?.ogrenmeKanitlari || []).map((k) => `<li>${kacis(k)}</li>`).join("")}</ul>
      <div class="yanilgi" style="margin-top:11px"><div class="y">Çıkış kartı</div><div class="m">${kacis(p.olcme?.cikisKarti)}</div></div>
    </div>
  </div>

  <div class="devir">
    <h3>Bu dersi diğer araçlara taşı</h3>
    <p>Bağlam üstteki etikette duruyor. Asistan bu dersin çıktılarıyla sınırlanır, değerlendirme de bu dersin yazma görevi ölçütlerini kullanır.</p>
    <div class="btnlar">
      <button class="btn btn-sari" id="devirOgret">Öğrenciye aç →</button>
      <button class="btn btn-sari" id="devirDegerlendir">Yazma görevini değerlendir →</button>
    </div>
  </div>`;

  $("#pKopyala").onclick = (e) => kopyala(e.target, planMetni(p));
  $("#pIndir").onclick = () => {
    const blob = new Blob([planMetni(p)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.baslik.replace(/[^\wçğıöşüÇĞİÖŞÜ ]/g, "").slice(0, 50)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $("#pYeniden").onclick = planUret;
  $("#devirOgret").onclick = () => aracAc("ogret");
  $("#devirDegerlendir").onclick = () => aracAc("degerlendir");
}

/* ---------------- 02 ÖĞRET ---------------- */

function sohbetBaglamNotCiz() {
  const k = $("#sBaglamNot");
  if (!durum.baglam) {
    k.innerHTML = `<div class="bos-durum" style="padding:16px; text-align:left">
      <p style="font-size:14px">Ders bağlamı yok. Asistan genel çalışıyor. Planla sekmesinden ders üretirseniz asistan o dersin çıktılarına bağlanır.</p></div>`;
    return;
  }
  const b = durum.baglam;
  k.innerHTML = `<div class="yanilgi"><div class="y">Bağlı ders: ${kacis(b.konu)}</div>
    <div class="m">${(b.ciktilar || []).slice(0, 3).map((c) => `<div><span class="mono">${kacis(c.kod)}</span> ${kacis(c.ifade)}</div>`).join("")}</div></div>`;
  $("#sSinif").value = b.sinif;
}

function sohbetCiz() {
  const akis = $("#sAkis");
  const b = durum.baglam;

  $("#sBasi").innerHTML = b
    ? `<span><b>${kacis(b.konu)}</b> · ${kacis(b.sinif)} · ${kacis(b.ders)}</span><span>Çıktılara bağlı</span>`
    : `<span><b>Genel mod</b></span><span>Ders bağlamı seçilmedi</span>`;

  if (!durum.mesajlar.length) {
    akis.innerHTML = `<div class="bos-durum">
      <h3>Merhaba, ne öğrenmek istiyorsun?</h3>
      <p>${b ? `${kacis(b.konu)} konusunda takıldığın yeri yaz. Alıştırma sorularında cevabı vermem, birlikte adım adım gideriz.`
             : "Bir soru yaz ya da aşağıdaki hazır sorulardan birine dokun."}</p>
    </div>`;
  } else {
    akis.innerHTML = durum.mesajlar.map((m) =>
      `<div class="balon ${m.rol === "ogrenci" ? "ogrenci" : "asistan"}">${kacis(m.metin)}</div>`).join("");
  }
  akis.scrollTop = akis.scrollHeight;

  const hazir = b
    ? [`${b.konu} nedir, basitçe anlatır mısın?`, "Bu konuda örnek bir soru sorar mısın?", "Bir sınav sorusunda takıldım, yardım eder misin?"]
    : ["Bir konuyu bana basitçe anlatır mısın?", "Ödevimde takıldım, ipucu verir misin?", "Bu konuyu nasıl çalışmalıyım?"];
  $("#sHizli").innerHTML = hazir.map((h) => `<button type="button">${kacis(h)}</button>`).join("");
  $$("#sHizli button").forEach((btn) => (btn.onclick = () => { $("#sGirdi").value = btn.textContent; sohbetGonder(); }));
}

async function sohbetGonder() {
  const girdi = $("#sGirdi");
  const metin = girdi.value.trim();
  if (!metin) return;

  durum.mesajlar.push({ rol: "ogrenci", metin });
  girdi.value = "";
  $("#sGonder").disabled = true;
  sohbetCiz();

  const akis = $("#sAkis");
  const balon = document.createElement("div");
  balon.className = "balon asistan yaziyor";
  balon.textContent = "yazıyor…";
  akis.appendChild(balon);
  akis.scrollTop = akis.scrollHeight;

  const b = durum.baglam;

  try {
    const r = await fetch("/api/sohbet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mesajlar: durum.mesajlar,
        sinif: $("#sSinif").value,
        ders: b?.ders || "",
        konu: b?.konu || "",
        ciktilar: b?.ciktilar || [],
        mufredat: b?.mufredat || "MEB",
      }),
    });

    if (!r.ok || !r.body) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.hata || "Asistana ulaşılamadı.");
    }

    const okuyucu = r.body.getReader();
    const cozucu = new TextDecoder();
    let toplam = "";
    let tampon = "";
    balon.classList.remove("yaziyor");
    balon.textContent = "";

    while (true) {
      const { done, value } = await okuyucu.read();
      if (done) break;
      tampon += cozucu.decode(value, { stream: true });
      const satirlar = tampon.split("\n");
      tampon = satirlar.pop() || "";
      for (const satir of satirlar) {
        if (!satir.startsWith("data:")) continue;
        const ham = satir.slice(5).trim();
        if (!ham || ham === "[BITTI]") continue;
        try {
          const p = JSON.parse(ham);
          if (p.metin) {
            toplam += p.metin;
            balon.textContent = toplam;
            akis.scrollTop = akis.scrollHeight;
          }
        } catch { /* parcali satir */ }
      }
    }

    durum.mesajlar.push({ rol: "asistan", metin: toplam || "Yanıt alınamadı, tekrar dener misin?" });
    kaydet();
    sohbetCiz();
  } catch (e) {
    balon.remove();
    const h = document.createElement("div");
    h.innerHTML = hataKutusu(e.message);
    akis.appendChild(h);
    akis.scrollTop = akis.scrollHeight;
  } finally {
    $("#sGonder").disabled = false;
    girdi.focus();
  }
}

/* ---------------- 03 DEĞERLENDİR ---------------- */

function rubrikNotCiz() {
  const k = $("#dRubrikNot");
  const b = durum.baglam;
  if (!b || !(b.rubrik || []).length) {
    k.innerHTML = `<div class="bos-durum" style="padding:16px; text-align:left">
      <p style="font-size:14px">Ders bağlamı yok. Genel yazma rubriği kullanılacak: fikir, yapı, kanıt, dil.</p></div>`;
    return;
  }
  k.innerHTML = `<div class="yanilgi"><div class="y">Rubrik: ${kacis(b.konu)}</div>
    <div class="m">${b.rubrik.map((r) => `<div>• <b>${kacis(r.ad)}</b> — ${kacis(r.tanim)}</div>`).join("")}</div></div>`;
  $("#dSinif").value = b.sinif;
}

function kelimeSay() {
  const n = $("#dMetin").value.trim().split(/\s+/).filter(Boolean).length;
  $("#dSayac").textContent = `${n} kelime`;
}

function metniIsaretle(metin, satirIci) {
  const isaretler = [];
  for (const s of satirIci || []) {
    const alinti = (s.alinti || "").trim();
    if (alinti.length < 4) continue;
    const i = metin.indexOf(alinti);
    if (i === -1) continue;
    if (isaretler.some((m) => i < m.son && i + alinti.length > m.bas)) continue;
    isaretler.push({ bas: i, son: i + alinti.length, tur: s.tur });
  }
  isaretler.sort((a, b) => a.bas - b.bas);

  let cikti = "";
  let imlec = 0;
  for (const m of isaretler) {
    cikti += kacis(metin.slice(imlec, m.bas));
    cikti += `<mark class="${m.tur === "guclu" ? "guclu" : "gelistirilmeli"}">${kacis(metin.slice(m.bas, m.son))}</mark>`;
    imlec = m.son;
  }
  cikti += kacis(metin.slice(imlec));
  return cikti;
}

async function degerlendir() {
  const metin = $("#dMetin").value.trim();
  if (metin.length < 40) {
    $("#dCikti").innerHTML = hataKutusu("Değerlendirmek için en az 40 karakterlik bir metin yapıştırın.");
    return;
  }
  const b = durum.baglam;

  $("#dDegerlendir").disabled = true;
  $("#dDegerlendir").textContent = "Okunuyor…";
  $("#dCikti").innerHTML = `<div class="panel"><div class="yukleniyor">
    <div class="satir" style="width:60%"></div><div class="satir" style="width:96%"></div>
    <div class="satir" style="width:88%"></div><div class="satir" style="width:74%"></div>
    <div class="not"><span class="nokta"></span><span>Metin ölçütlere göre okunuyor…</span></div></div></div>`;

  try {
    const s = await istek("/api/degerlendir", {
      metin,
      sinif: $("#dSinif").value,
      ders: b?.ders || "",
      konu: b?.konu || "",
      olcutler: b?.rubrik || [],
      mufredat: b?.mufredat || "MEB",
    });
    degerlendirmeCiz(s, metin);
  } catch (e) {
    $("#dCikti").innerHTML = hataKutusu(e.message);
  } finally {
    $("#dDegerlendir").disabled = false;
    $("#dDegerlendir").textContent = "Değerlendir";
  }
}

function degerlendirmeCiz(s, metin) {
  const puan = Math.max(0, Math.min(100, s.genelPuan || 0));
  const cevre = 2 * Math.PI * 37;
  const dolu = (puan / 100) * cevre;

  $("#dCikti").innerHTML = `
  <div class="panel">
    <div class="puan-basi">
      <div class="halka">
        <svg width="86" height="86" viewBox="0 0 86 86">
          <circle cx="43" cy="43" r="37" fill="none" stroke="#eee1ce" stroke-width="7"/>
          <circle cx="43" cy="43" r="37" fill="none" stroke="#c05621" stroke-width="7"
            stroke-linecap="round" stroke-dasharray="${dolu} ${cevre}"/>
        </svg>
        <div class="sayi">${puan}</div>
      </div>
      <div>
        <div class="seviye">${kacis(s.seviye)}</div>
        <div class="alt">${kacis($("#dSinif").value)} seviyesine göre değerlendirildi${durum.baglam ? ` · ${kacis(durum.baglam.konu)}` : ""}</div>
      </div>
    </div>

    <div class="blok">
      <h3>Ölçütler</h3>
      ${(s.olcutler || []).map((o) => `
        <div class="olcut">
          <div class="olcut-basi"><span class="ad">${kacis(o.ad)}</span><span class="p mono">${o.puan}/25</span></div>
          <div class="cubuk"><i style="width:${Math.max(0, Math.min(100, (o.puan / 25) * 100))}%"></i></div>
          <div class="gerekce">${kacis(o.gerekce)}</div>
          ${o.kanit ? `<div class="kanit">${kacis(o.kanit)}</div>` : ""}
        </div>`).join("")}
    </div>

    <div class="blok">
      <h3>Metin üzerinde</h3>
      <div class="metin-gorunum">${metniIsaretle(metin, s.satirIci)}</div>
      <p class="ipucu">Yeşil: iyi çalışan yerler. Sarı: geliştirilecek yerler.</p>
    </div>

    <div class="blok" style="margin-bottom:0">
      <h3>Satır içi geri bildirim</h3>
      ${(s.satirIci || []).map((g) => `
        <div class="geri-madde ${g.tur === "guclu" ? "guclu" : "gelistirilmeli"}">
          <div class="alinti">“${kacis(g.alinti)}”</div>
          <div class="yorum">${kacis(g.yorum)}</div>
          <div class="oneri"><b>Öneri:</b> ${kacis(g.oneri)}</div>
        </div>`).join("")}
    </div>
  </div>

  <div class="panel" style="margin-top:18px">
    <div class="ogrenci-notu">
      <h3>Öğrenciyle paylaşılacak özet</h3>
      <p>${kacis(s.ogrenciOzeti)}</p>
      <div class="adim"><b>Bu hafta yapılacak</b>${kacis(s.sonrakiAdim)}</div>
    </div>
    <div class="eylemler" style="margin:14px 0 0">
      <button class="btn btn-ince" id="dKopyaOzet">Özeti kopyala</button>
      <button class="btn btn-ince" id="dKopyaTam">Tam raporu kopyala</button>
    </div>
  </div>`;

  const tam = [
    `Puan: ${puan}/100 — ${s.seviye}`, "",
    "ÖLÇÜTLER",
    ...(s.olcutler || []).map((o) => `${o.ad}: ${o.puan}/25 — ${o.gerekce}`),
    "", "GERİ BİLDİRİM",
    ...(s.satirIci || []).map((g) => `[${g.tur}] "${g.alinti}" → ${g.yorum} | Öneri: ${g.oneri}`),
    "", "ÖĞRENCİYE", s.ogrenciOzeti, `Bu hafta: ${s.sonrakiAdim}`,
  ].join("\n");

  $("#dKopyaOzet").onclick = (e) => kopyala(e.target, `${s.ogrenciOzeti}\n\nBu hafta: ${s.sonrakiAdim}`);
  $("#dKopyaTam").onclick = (e) => kopyala(e.target, tam);
}

const ORNEK_METIN = `Basınç günlük hayatımızda çok yerde karşımıza çıkar. Mesela bıçağın keskin olması onun daha kolay kesmesini sağlar çünkü yüzey alanı küçüldükçe basınç artar. Aynı şekilde kamyonların lastikleri geniştir, böylece yola yaptıkları basınç azalır ve yol bozulmaz.

Kar üzerinde yürürken ayağımız batar ama kayak takarsak batmayız. Bunun sebebi kayakların yüzey alanının büyük olmasıdır. Ben bunu geçen kış denedim ve gerçekten işe yaradı.

Sıvılarda da basınç vardır. Derine indikçe basınç artar. Bu yüzden barajların alt kısmı üst kısmından daha kalın yapılır. Dalgıçların da çok derine inerken özel kıyafet giymesi gerekir.

Sonuç olarak basınç hayatımızın her yerindedir ve mühendisler bir şey tasarlarken bunu hep düşünmek zorundadır.`;

/* ---------------- Baslangic ---------------- */

function baslat() {
  $("#pDers").innerHTML = DERSLER.map((d) => `<option${d === "Fen Bilimleri" ? " selected" : ""}>${d}</option>`).join("");
  [$("#pSinif"), $("#sSinif"), $("#dSinif")].forEach((sel) => {
    sel.innerHTML = SINIFLAR.map((s) => `<option${s === "8. Sınıf" ? " selected" : ""}>${s}</option>`).join("");
  });

  ornekleriCiz();
  $("#pDers").onchange = ornekleriCiz;
  $("#pUret").onclick = planUret;
  $("#pKonu").onkeydown = (e) => { if (e.key === "Enter") planUret(); };

  $("#sGonder").onclick = sohbetGonder;
  $("#sGirdi").onkeydown = (e) => { if (e.key === "Enter") sohbetGonder(); };
  $("#sTemizle").onclick = () => { durum.mesajlar = []; kaydet(); sohbetCiz(); };

  $("#dDegerlendir").onclick = degerlendir;
  $("#dMetin").oninput = kelimeSay;
  $("#dOrnek").onclick = () => { $("#dMetin").value = ORNEK_METIN; kelimeSay(); };

  yukle();
  baglamCiz();
  sohbetBaglamNotCiz();
  rubrikNotCiz();
  sohbetCiz();
  kelimeSay();
  if (durum.plan) planCiz();
  else $("#pCikti").innerHTML = `<div class="bos-durum">
    <h3>Henüz plan yok</h3>
    <p>Soldan konu ve sınıf seç, plan oluştur. Plan hazır olduğunda üstte bir ders bağlamı etiketi belirir ve diğer iki araç o derse bağlanır.</p></div>`;
}

baslat();
