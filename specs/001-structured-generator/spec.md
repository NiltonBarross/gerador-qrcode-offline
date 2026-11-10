# Gerador estruturado e tipos prontos

## Exceção autorizada
Em 2026-11-10, após falha do executável specify e bloqueio de rede na instalação, o usuário respondeu “Pode continuar, cria um repositório público na minha conta com isso” ao pedido explícito de exceção ao fluxo Spec Kit. A implementação segue essa autorização.

## Requisitos e critérios
- Separar HTML, CSS, bibliotecas e código de aplicação em src; abrir src/index.html sem servidor.
- Gerar standalone/gerador-qrcode-offline.html com todos os recursos locais embutidos e sem dependência de rede.
- Usar https://instagram.com como conteúdo inicial.
- Selecionar link/texto, Wi-Fi (SSID, senha, segurança), WhatsApp (telefone internacional, mensagem) e Pix estático (chave, valor opcional, descrição, nome e cidade).
- Validar entradas e bloquear exportação inválida; preservar PNG, JPEG e PDF.
- Pix deve usar TLV BR Code, moeda 986, país BR, GUI br.gov.bcb.pix e CRC16 correto.
- Testes automatizados devem passar e a saída standalone deve corresponder às fontes.
- Publicar somente arquivos do projeto em repositório público na conta pessoal autenticada.

## Plano
Preservar interface e bibliotecas existentes. Usar scripts Node sem dependências para geração e testes. Separar codificadores puros da interação DOM. Não adicionar backend ou persistência de dados.
