# Gerador de QR Code offline

Gere QR Codes de links, textos, Wi-Fi, WhatsApp e Pix estático no navegador. Exporte PNG, JPEG ou PDF com legenda, cores, tamanho e correção de erros ajustáveis. O conteúdo inicial é `https://instagram.com`.

## Abrir sem instalar nada

Baixe [standalone/gerador-qrcode-offline.html](standalone/gerador-qrcode-offline.html) e abra o arquivo no navegador. Essa pasta contém somente o HTML: bibliotecas, estilos e scripts estão embutidos. Não exige internet, servidor ou Node.js.

Para trabalhar no código, abra [src/index.html](src/index.html) no navegador, mantendo as pastas ao lado dele.

## Estrutura

```text
src/
  index.html         # Interface
  css/styles.css     # Estilos
  js/app.js          # Preview, formulários e downloads
  js/payloads.js     # Codificadores e validação dos tipos
  vendor/            # Bibliotecas QR Code e jsPDF, com licenças originais
standalone/          # HTML independente gerado
scripts/build.cjs    # Empacotamento sem dependências
tests/               # Testes de codificação e integração
specs/               # Escopo e registro da exceção ao Spec Kit
```

## Desenvolvimento

Com Node.js 24 ou superior:

```sh
npm run build
npm test
```

Não há dependências a instalar. Edite `src/`, execute o build e inclua o HTML atualizado de `standalone/` na contribuição. Os testes conferem CRC, exemplo oficial Pix, entradas inválidas, formulários, caminhos de exportação e sincronização da versão independente. A integração usa DOM e canvas simulados; confira também visual e arquivos exportados no navegador.

## Tipos prontos

- **Link ou texto:** aceita texto livre, acentos e emojis.
- **Wi-Fi:** informe rede, senha e segurança WPA/WPA2 pessoal, WEP ou sem senha. Caracteres especiais são escapados. Quem lê o QR pode recuperar a senha. Redes WPA3 exclusivas e corporativas não são atendidas.
- **WhatsApp:** informe número com DDI e DDD, por exemplo `+55 11 99999-9999`, e mensagem opcional. O código e o link exibido abrem `wa.me`.
- **Pix:** informe chave cadastrada, nome e cidade do recebedor; valor e descrição são opcionais. Aceita CPF, CNPJ, e-mail, telefone com `+DDI` ou chave aleatória. Use `10,50` ou `10.50`, sem separador de milhar. O limite da descrição depende do tamanho da chave: o campo de conta completo admite 99 bytes.

Pix segue o [Manual de Padrões para Iniciação do Pix do Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf): BR Code estático, TLV, moeda BRL e CRC16/CCITT-FALSE. Não gera cobrança dinâmica, não consulta o DICT e não confirma pagamentos. Valide a leitura no aplicativo bancário e confira o destinatário antes de usar.

## Privacidade e compatibilidade

Os dados são processados localmente, sem armazenamento ou transmissão pelo gerador. Abrir o link WhatsApp acessa o serviço externo. Fontes do sistema permitem uso offline. Teste o QR em um leitor real, principalmente ao reduzir margem ou contraste. A integração de download do Claude foi preservada, mas depende desse ambiente.

## Contribuições

Use mensagens de commit curtas e imperativas. Explique o comportamento alterado, liste verificações feitas e inclua capturas para mudanças visuais. Preserve avisos e licenças das bibliotecas em `src/vendor/`.
