const fs = require("node:fs");
const path = require("node:path");
let html = fs.readFileSync("src/index.html", "utf8");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, file) => `<style>\n${fs.readFileSync(path.join("src", file), "utf8")}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, file) => `<script>\n${fs.readFileSync(path.join("src", file), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`);
fs.mkdirSync("standalone", { recursive: true });
fs.writeFileSync("standalone/gerador-qrcode-offline.html", html);
console.log("Standalone atualizado.");
