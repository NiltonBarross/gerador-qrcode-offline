(function (root) {
  "use strict";

  const bytes = (value) => new TextEncoder().encode(value);
  const required = (value, label) => {
    if (!value || !value.trim()) throw new Error("Preencha " + label + ".");
    return value;
  };

  function crc16(value) {
    let crc = 0xffff;
    for (const byte of bytes(value)) {
      crc ^= byte << 8;
      for (let bit = 0; bit < 8; bit++) {
        crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function tlv(id, value) {
    const length = bytes(value).length;
    if (length > 99) throw new Error("Chave e descrição Pix excedem o limite de 99 bytes. Reduza a descrição.");
    return id + String(length).padStart(2, "0") + value;
  }

  function validDocument(key) {
    if (/^(.)\1+$/.test(key)) return false;
    const cpf = key.length === 11;
    for (let digit = 0; digit < 2; digit++) {
      const base = key.slice(0, key.length - 2 + digit);
      let total = 0;
      for (let index = 0; index < base.length; index++) {
        const weight = cpf ? base.length + 1 - index : 2 + ((base.length - 1 - index) % 8);
        total += (base.charCodeAt(index) - 48) * weight;
      }
      const remainder = total % 11;
      if (Number(key[base.length]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
    }
    return true;
  }

  function pixKey(value) {
    const key = required(value, "a chave Pix").trim();
    if (bytes(key).length > 77) throw new Error("A chave Pix deve ter até 77 bytes.");
    if (/^\+[1-9]\d{7,14}$/.test(key)) return key;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return key.toLowerCase();
    if (/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(key)) return key.toLowerCase();
    const document = key.replace(/[.\/-]/g, "").toUpperCase();
    if ((/^\d{11}$/.test(document) || /^[A-Z0-9]{12}\d{2}$/.test(document)) && validDocument(document)) return document;
    throw new Error("Informe uma chave Pix válida: CPF, CNPJ, e-mail, telefone com +DDI ou chave aleatória.");
  }

  function merchant(value, label, max) {
    const text = required(value, label).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!/^[\x20-\x7e]+$/.test(text) || text.length > max) {
      throw new Error(label + ": use até " + max + " caracteres latinos, sem emojis.");
    }
    return text;
  }

  function pix(values) {
    const key = pixKey(values.key);
    const name = merchant(values.name, "o nome do recebedor", 25);
    const city = merchant(values.city, "a cidade do recebedor", 15);
    const description = (values.description || "").trim();
    let account = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
    if (description) account += tlv("02", description);
    let payload = tlv("00", "01") + tlv("26", account) + tlv("52", "0000") + tlv("53", "986");
    const amount = (values.amount || "").trim().replace(",", ".");
    if (amount) {
      if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(amount)) throw new Error("Valor Pix inválido: use até duas casas decimais, sem separador de milhar.");
      const [integer, decimal = ""] = amount.split(".");
      const normalized = integer.replace(/^0+(?=\d)/, "") + "." + decimal.padEnd(2, "0");
      if (/^0\.00$/.test(normalized)) throw new Error("O valor Pix deve ser maior que zero ou ficar em branco.");
      payload += tlv("54", normalized);
    }
    payload += tlv("58", "BR") + tlv("59", name) + tlv("60", city) + tlv("62", tlv("05", "***")) + "6304";
    return payload + crc16(payload);
  }

  function build(type, values) {
    if (type === "text") return required(values.content, "o conteúdo");
    if (type === "wifi") {
      const ssid = required(values.ssid, "o nome da rede Wi-Fi");
      const security = values.security;
      if (!["WPA", "WEP", "nopass"].includes(security)) throw new Error("Selecione a segurança da rede Wi-Fi.");
      if (security !== "nopass") required(values.password, "a senha da rede Wi-Fi");
      const escape = (value) => value.replace(/[\\;,:"']/g, "\\$&");
      return "WIFI:T:" + security + ";S:" + escape(ssid) + ";P:" + escape(security === "nopass" ? "" : values.password) + ";;";
    }
    if (type === "whatsapp") {
      const entered = required(values.phone, "o número do WhatsApp").trim();
      if (!/^\+?[\d\s().-]+$/.test(entered)) throw new Error("Informe o WhatsApp com DDI e DDD, usando apenas números.");
      const phone = entered.replace(/\D/g, "");
      if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error("Informe o WhatsApp com DDI e DDD (8 a 15 dígitos).");
      return "https://wa.me/" + phone + (values.message ? "?text=" + encodeURIComponent(values.message) : "");
    }
    if (type === "pix") return pix(values);
    throw new Error("Tipo de QR Code inválido.");
  }

  const api = { build, crc16 };
  root.QRPayloads = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
