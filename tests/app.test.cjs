const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadApp(html) {
  const elements = {};
  const node = (id) => elements[id] ||= {
    value: "", hidden: false, disabled: false, textContent: "", listeners: {},
    classList: { add() {}, remove() {} },
    addEventListener(event, fn) { this.listeners[event] = fn; },
    setAttribute() {}, querySelectorAll() { return []; }
  };
  for (const match of html.matchAll(/<(input|textarea|select|canvas|div|p|span|output|a|button)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    node(match[3]).value = match[2].match(/\bvalue="([^"]*)"/)?.[1] || "";
  }
  Object.assign(node("content"), { value: "https://instagram.com" });
  node("qr-type").value = "text";
  node("security").value = "WPA";
  const context = { fillRect() {}, fillText() {}, drawImage() {}, measureText() { return { width: 100 }; } };
  node("canvas").getContext = () => context;
  node("canvas").toDataURL = () => "data:image/png;base64,AA==";
  const formats = ["png", "jpeg", "pdf"].map(fmt => ({ ...node("download-" + fmt), dataset: { fmt } }));
  const downloaded = [];
  let pdfImages = 0;
  const document = {
    getElementById: node,
    querySelectorAll: () => formats,
    body: { appendChild() {} },
    createElement(tag) {
      if (tag === "canvas") return { getContext: () => context, toDataURL: () => "data:image/jpeg;base64,AA==" };
      return { click() { downloaded.push(this.download); }, remove() {} };
    }
  };
  const sandbox = { document, TextEncoder, Uint8Array, Blob, atob, btoa, console,
    setTimeout() { return 0; }, clearTimeout() {},
    URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
    jspdf: { jsPDF: class { addImage() { pdfImages++; } output() { return new ArrayBuffer(1); } } }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ["vendor/qrcode.js", "js/payloads.js", "js/app.js"]) vm.runInContext(fs.readFileSync("src/" + file, "utf8"), sandbox, { filename: file });
  return { node, formats, downloaded, pdfImages: () => pdfImages };
}

test("application starts, validates presets, clears stale QR and exports all formats", () => {
  const app = loadApp(fs.readFileSync("src/index.html", "utf8"));
  assert.equal(app.node("canvas").width, 1024);
  assert.equal(app.formats[0].disabled, false);
  for (const button of app.formats) button.listeners.click();
  assert.equal(app.downloaded.length, 3);
  assert.equal(app.pdfImages(), 1);
  app.node("qr-type").value = "wifi";
  app.node("qr-type").listeners.change();
  assert.equal(app.formats[0].disabled, true);
  assert.equal(app.node("canvas").hidden, true);
  app.node("size").value = "512";
  app.node("size").listeners.input();
  assert.equal(app.node("size-out").textContent, "512 px");
  app.node("ssid").value = "Rede; café";
  app.node("security").value = "nopass";
  app.node("security").listeners.change();
  assert.equal(app.formats[0].disabled, false);
  assert.equal(app.node("password").disabled, true);
  app.node("qr-type").value = "whatsapp";
  app.node("phone").value = "+55 (11) 99999-9999";
  app.node("message").value = "Olá!";
  app.node("qr-type").listeners.change();
  assert.equal(app.node("whatsapp-link").href, "https://wa.me/5511999999999?text=Ol%C3%A1!");
  app.node("qr-type").value = "pix";
  Object.entries({ key: "teste@example.com", name: "TESTE", city: "RECIFE", amount: "10,50" }).forEach(([id, value]) => app.node(id).value = value);
  app.node("qr-type").listeners.change();
  assert.equal(app.formats[0].disabled, false);
  app.node("amount").value = "1,234";
  app.node("amount").listeners.input();
  assert.equal(app.formats[0].disabled, true);
  assert.equal(app.node("whatsapp-link").hidden, true);
});

test("standalone contains exactly the current local assets and compiles", () => {
  const source = fs.readFileSync("src/index.html", "utf8");
  let expected = source.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, file) => `<style>\n${fs.readFileSync("src/" + file, "utf8")}\n</style>`);
  expected = expected.replace(/<script src="([^"]+)"><\/script>/g, (_, file) => `<script>\n${fs.readFileSync("src/" + file, "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`);
  const actual = fs.readFileSync("standalone/gerador-qrcode-offline.html", "utf8");
  assert.equal(actual, expected, "Run npm run build after source changes");
  assert.equal(actual.includes("hapvida"), false);
  const markup = actual.replace(/<script>[\s\S]*?<\/script>/g, "");
  assert.equal(/<script[^>]+src=|<link[^>]+href=/i.test(markup), false);
  for (const match of actual.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  for (const id of ["qr-type", "text-fields", "wifi-fields", "whatsapp-fields", "pix-fields"]) assert.match(actual, new RegExp(`id="${id}"`));
});
