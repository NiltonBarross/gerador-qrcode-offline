const test = require("node:test");
const assert = require("node:assert/strict");
const { build, crc16 } = require("../src/js/payloads.js");

const receiver = { key: "123e4567-e12b-12d1-a456-426655440000", name: "Fulano de Tal", city: "BRASILIA" };

function fields(text) {
  const input = Buffer.from(text);
  const result = {};
  for (let cursor = 0; cursor < input.length;) {
    const id = input.subarray(cursor, cursor + 2).toString();
    const length = Number(input.subarray(cursor + 2, cursor + 4).toString());
    result[id] = input.subarray(cursor + 4, cursor + 4 + length).toString();
    cursor += 4 + length;
    assert.ok(cursor <= input.length);
  }
  return result;
}

test("CRC16 CCITT-FALSE known check vector", () => assert.equal(crc16("123456789"), "29B1"));

test("matches Banco Central static QR fixture including CRC", () => {
  assert.equal(build("pix", receiver), "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D");
});

test("Pix amount is exact and description lengths count UTF-8 bytes", () => {
  const payload = build("pix", { ...receiver, amount: "000123,4", description: "Café ☕" });
  const parsed = fields(payload);
  assert.equal(parsed["54"], "123.40");
  assert.equal(fields(parsed["26"])["02"], "Café ☕");
  assert.equal(parsed["63"], crc16(payload.slice(0, -4)));
  assert.equal(fields(parsed["62"])["05"], "***");
});

test("validates Pix amount, required fields, and account template limit", () => {
  for (const amount of ["0", "0.00", "-1", "1.234", "1e2", "1.000,00", "Infinity"]) {
    assert.throws(() => build("pix", { ...receiver, amount }));
  }
  assert.throws(() => build("pix", { ...receiver, name: "" }));
  assert.throws(() => build("pix", { ...receiver, city: "x".repeat(16) }));
  assert.throws(() => build("pix", { ...receiver, description: "é".repeat(19) }));
  assert.equal(fields(build("pix", { ...receiver, name: "João", city: "São Paulo" }))["59"], "Joao");
});

test("supports valid CPF, numeric/alphanumeric CNPJ, email, phone and random keys", () => {
  for (const key of ["529.982.247-25", "00.038.166/0001-05", "12ABC34501DE35", "person@example.com", "+5561912345678", receiver.key]) {
    assert.ok(build("pix", { ...receiver, key }).startsWith("000201"));
  }
  for (const key of ["11111111111", "52998224724", "12ABC34501DE34", "garbage", "+0", "a@", "a@b..com", "a@-b.com", "a@b-.com", "a".repeat(78)]) {
    assert.throws(() => build("pix", { ...receiver, key }));
  }
});

test("Wi-Fi escapes reserved characters and omits open-network password", () => {
  assert.equal(build("wifi", { ssid: "Cafe;A:B", password: "a\\b,c", security: "WPA" }), "WIFI:T:WPA;S:Cafe\\;A\\:B;P:a\\\\b\\,c;;");
  assert.equal(build("wifi", { ssid: "Open", password: "ignored", security: "nopass" }), "WIFI:T:nopass;S:Open;P:;;");
  assert.throws(() => build("wifi", { ssid: "Net", password: "", security: "WPA" }));
  assert.throws(() => build("wifi", { ssid: "Net", security: "bad" }));
});

test("WhatsApp normalizes international number and encodes message", () => {
  assert.equal(build("whatsapp", { phone: "+55 (11) 99999-9999", message: "Olá & oi?" }), "https://wa.me/5511999999999?text=Ol%C3%A1%20%26%20oi%3F");
  assert.equal(build("whatsapp", { phone: "5511999999999" }), "https://wa.me/5511999999999");
  for (const phone of ["", "012345678", "55abc11999999999", "123", "1234567890123456"]) assert.throws(() => build("whatsapp", { phone }));
});

test("text preserves accents and whitespace; unknown type fails", () => {
  assert.equal(build("text", { content: " Olá 🌎 " }), " Olá 🌎 ");
  assert.throws(() => build("text", { content: "  " }));
  assert.throws(() => build("missing", {}));
});
