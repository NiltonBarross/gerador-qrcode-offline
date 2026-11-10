(function () {
  const $ = (id) => document.getElementById(id);
  const els = {
    content: $("content"), caption: $("caption"), size: $("size"), margin: $("margin"),
    fg: $("fg"), bg: $("bg"), canvas: $("canvas"), empty: $("empty"), meta: $("meta"),
    status: $("status"), sizeOut: $("size-out"), marginOut: $("margin-out"),
    fgHex: $("fg-hex"), bgHex: $("bg-hex"), ecl: $("ecl")
  };
  const buttons = document.querySelectorAll(".downloads button");
  let ecl = "M";
  let ready = false;
  let downloads = null;
  let dlPromise = null;
  let manualUrl = null;

  // Codifica acentos e emojis corretamente (UTF-8)
  if (window.qrcode) {
    qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s));
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function render() {
    let text;
    const type = $("qr-type").value;
    const values = Object.fromEntries(["content", "ssid", "password", "security", "phone", "message", "key", "amount", "description", "name", "city"].map(id => [id, $(id).value]));
    $("whatsapp-link").hidden = true;
    const size = +els.size.value;
    const margin = +els.margin.value;
    const caption = els.caption.value.trim();
    const fg = els.fg.value, bg = els.bg.value;
    els.sizeOut.textContent = size + " px";
    els.marginOut.textContent = margin + (margin === 1 ? " módulo" : " módulos");
    els.fgHex.textContent = fg.toUpperCase();
    els.bgHex.textContent = bg.toUpperCase();
    els.meta.classList.remove("error");
    if (typeof hideManual === "function") hideManual();

    try { text = QRPayloads.build(type, values); }
    catch (error) { setEmpty(error.message, true); return; }
    if (type === "whatsapp") {
      $("whatsapp-link").href = text;
      $("whatsapp-link").hidden = false;
    }

    if (!window.qrcode) {
      setEmpty("Não foi possível carregar o gerador. Verifique a conexão e recarregue a página.", true);
      return;
    }
    if (!text.trim()) { setEmpty("Digite algo no campo Conteúdo para gerar o QR Code."); return; }

    let qr;
    try {
      qr = qrcode(0, ecl);
      qr.addData(text, "Byte");
      qr.make();
    } catch (e) {
      setEmpty("Conteúdo longo demais para um QR Code. Encurte o texto ou reduza a correção de erros.", true);
      return;
    }

    const n = qr.getModuleCount();
    const total = n + margin * 2;
    const capH = caption ? Math.round(size * 0.11) : 0;
    const cv = els.canvas;
    cv.width = size; cv.height = size + capH;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = fg;
    const cell = size / total;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue;
        const x0 = Math.round((c + margin) * cell), y0 = Math.round((r + margin) * cell);
        const x1 = Math.round((c + margin + 1) * cell), y1 = Math.round((r + margin + 1) * cell);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    if (caption) {
      let fs = Math.round(size * 0.05);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      do { ctx.font = "600 " + fs + "px Sora, 'Segoe UI', sans-serif"; fs--; }
      while (ctx.measureText(caption).width > size * 0.9 && fs > 8);
      ctx.fillText(caption, size / 2, size + capH * 0.4);
    }

    els.canvas.hidden = false; els.empty.hidden = true;
    ready = true; toggleButtons();
    const contrast = (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05);
    let msg = "Versão " + ((n - 17) / 4) + ", " + n + "×" + n + " módulos, " + cv.width + "×" + cv.height + " px";
    if (contrast < 3) {
      msg = "Contraste baixo entre as cores: alguns leitores podem não reconhecer o código.";
      els.meta.classList.add("error");
    } else if (luminance(fg) > luminance(bg)) {
      msg = "Código claro sobre fundo escuro: nem todos os leitores reconhecem esse formato.";
      els.meta.classList.add("error");
    }
    els.meta.textContent = msg;
  }

  function setEmpty(msg, isError) {
    hideManual();
    els.canvas.hidden = true; els.empty.hidden = false; els.empty.textContent = msg;
    els.meta.textContent = ""; if (isError) els.meta.classList.add("error");
    ready = false; toggleButtons();
  }

  function toggleButtons() { buttons.forEach((b) => (b.disabled = !ready)); }

  function jpegCanvas() {
    // JPEG não tem transparência: garante fundo sólido
    const src = els.canvas, out = document.createElement("canvas");
    out.width = src.width; out.height = src.height;
    const ctx = out.getContext("2d");
    ctx.fillStyle = els.bg.value; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    return out;
  }

  function dataUrlToBytes(url) {
    const bin = atob(url.slice(url.indexOf(",") + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Gera o arquivo de forma síncrona, para o download sair direto do clique
  function buildFile(fmt) {
    if (fmt === "png") return dataUrlToBytes(els.canvas.toDataURL("image/png"));
    if (fmt === "jpeg") return dataUrlToBytes(jpegCanvas().toDataURL("image/jpeg", 0.95));
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error("pdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 210, ph = 297, w = 120;
    const h = w * els.canvas.height / els.canvas.width;
    doc.addImage(els.canvas.toDataURL("image/png"), "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
    return new Uint8Array(doc.output("arraybuffer"));
  }

  function fileName(fmt) {
    const d = new Date(), p = (v) => String(v).padStart(2, "0");
    const stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
    return "qrcode-" + stamp + "." + (fmt === "jpeg" ? "jpg" : fmt);
  }

  let busy = false;
  const MIME = { png: "image/png", jpeg: "image/jpeg", pdf: "application/pdf" };

  // 1º caminho: recurso de download do Claude (com prazo curto)
  function capabilityWithin(ms) {
    if (downloads) return Promise.resolve(downloads);
    if (!(window.claude && typeof window.claude.use === "function")) return Promise.resolve(null);
    return Promise.race([getDownloads(), new Promise((r) => setTimeout(() => r(null), ms))]);
  }

  function download(fmt) {
    if (!ready || busy) return;
    let bytes;
    try { bytes = buildFile(fmt); }
    catch (e) { els.status.textContent = "Não foi possível gerar o " + fmt.toUpperCase() + ". Recarregue a página e tente de novo."; return; }
    const name = fileName(fmt);
    hideManual();

    // Fora do Claude (arquivo aberto no navegador): download comum
    if (!(window.claude && typeof window.claude.use === "function")) {
      browserDownload(bytes, name, fmt);
      return;
    }
    if (downloads) { saveVia(downloads, name, bytes, fmt); return; }

    busy = true;
    els.status.textContent = "Preparando download…";
    capabilityWithin(3000).then((d) => {
      busy = false;
      if (d) saveVia(d, name, bytes, fmt);
      else showManual(fmt, bytes, name);
    });
  }

  function browserDownload(bytes, name, fmt) {
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME[fmt] }));
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    els.status.textContent = "Baixado: " + name;
  }

  function saveVia(dl, name, bytes, fmt) {
    busy = true;
    els.status.textContent = "Confirme o download na janela que abriu.";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { busy = false; showManual(fmt, bytes, name); }
    }, 8000);
    dl.save({ filename: name, data: bytes.slice() }).then(() => {
      settled = true; hideManual();
      els.status.textContent = "Baixado: " + name;
    }).catch((e) => {
      settled = true;
      const code = e && e.code;
      if (code === "declined") els.status.textContent = "Download cancelado.";
      else if (code === "rate_limited") els.status.textContent = "Já existe um download aguardando confirmação. Conclua-o e tente de novo.";
      else showManual(fmt, bytes, name);
    }).finally(() => { busy = false; clearTimeout(timer); });
  }

  // 2º caminho: salvar manualmente (funciona em qualquer visualização)
  function showManual(fmt, bytes, name) {
    hideManual();
    const blob = new Blob([bytes], { type: MIME[fmt] });
    manualUrl = URL.createObjectURL(blob);
    const img = $("manual-img"), txt = $("manual-text");
    if (fmt === "pdf") {
      const w = window.open(manualUrl, "_blank");
      if (w) {
        els.status.textContent = "O PDF abriu em uma nova aba. Use o botão de download do leitor de PDF para salvar.";
        return;
      }
      img.hidden = true;
      txt.textContent = "Esta visualização bloqueou o download do PDF. Abra o artefato pelo link em uma aba própria do navegador ou use a versão para baixar.";
    } else {
      img.hidden = false;
      img.src = "data:" + MIME[fmt] + ";base64," + toBase64(bytes);
      txt.textContent = "Esta visualização bloqueou o download automático. Clique com o botão direito na imagem abaixo (ou toque e segure no celular) e escolha “Salvar imagem como”. Ela já está em " + fmt.toUpperCase() + ", no tamanho escolhido.";
    }
    els.status.textContent = "";
    $("manual").hidden = false;
  }
  function hideManual() {
    $("manual").hidden = true;
    if (manualUrl) { URL.revokeObjectURL(manualUrl); manualUrl = null; }
  }
  function toBase64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  $("manual-close").addEventListener("click", hideManual);

  els.ecl.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    ecl = b.dataset.v;
    els.ecl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  ["content", "caption", "size", "margin", "fg", "bg"].forEach((k) => els[k].addEventListener("input", render));
  function updateType() {
    const type = $("qr-type").value;
    for (const item of ["text", "wifi", "whatsapp", "pix"]) $(item + "-fields").hidden = type !== item;
    const noPassword = $("security").value === "nopass";
    $("password-field").hidden = noPassword;
    $("password").disabled = noPassword;
    render();
  }
  $("qr-type").addEventListener("change", updateType);
  $("security").addEventListener("change", updateType);
  for (const id of ["ssid", "password", "phone", "message", "key", "amount", "description", "name", "city"]) $(id).addEventListener("input", render);
  buttons.forEach((b) => b.addEventListener("click", () => download(b.dataset.fmt)));

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  render();

  function getDownloads() {
    if (downloads) return Promise.resolve(downloads);
    if (!(window.claude && typeof window.claude.use === "function")) return Promise.resolve(null);
    if (!dlPromise) {
      dlPromise = window.claude.use("downloads")
        .then((d) => { downloads = d; if (!d) dlPromise = null; return d; })
        .catch(() => { dlPromise = null; return null; });
    }
    return dlPromise;
  }
  // Tenta preparar o download assim que o visualizador estiver disponível
  let tries = 0;
  (function warm() {
    if (window.claude && typeof window.claude.use === "function") { getDownloads(); return; }
    if (++tries < 40) setTimeout(warm, 250);
  })();
})();
