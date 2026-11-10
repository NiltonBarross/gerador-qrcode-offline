# Repository Guidelines

## Project Structure & Module Organization

`gerador-qrcode-offline.html` is the complete application: embedded QR generation and PDF libraries, inline CSS, page markup, and application JavaScript. The final script handles preview rendering and PNG, JPEG, and PDF downloads, including Claude download integration and browser fallbacks. There are no separate source, asset, or test directories. Keep Portuguese interface text consistent with `lang="pt-BR"`.

## Build, Test, and Development Commands

No package manager, build pipeline, or installation step is configured. Open the HTML directly in a modern browser. On Windows PowerShell:

```powershell
Start-Process .\gerador-qrcode-offline.html
```

Reload the page after edits. There are no configured test, lint, or formatting commands; do not assume `npm test` or `npm run build` exists.

## Coding Style & Naming Conventions

Follow the surrounding two-space indentation. Application JavaScript uses `const` and `let`, camelCase functions such as `buildFile`, and double-quoted strings. HTML IDs and CSS classes use lowercase names with hyphens where needed, such as `manual-close`. Preserve embedded third-party license notices and avoid reformatting bundled libraries. Keep changes focused on application code and retain accessible labels, keyboard focus styles, and live status messages.

## Testing Guidelines

No automated framework or coverage threshold is configured. Manually verify normal text, URLs, accents, emojis, empty input, and oversized content. Exercise correction levels, image size, margins, colors, and captions. Check low-contrast warnings and all three export formats; open exported files and scan a generated QR with a reader. Check narrow screens, keyboard navigation, browser console errors, and offline behavior. Validate Claude-specific download paths in that environment when changing them.

## Commit & Pull Request Guidelines

No Git metadata is available in this checkout, so existing commit conventions cannot be established. Use concise imperative messages, for example `Fix caption alignment in exported images`. Pull requests should explain the behavior changed, reference relevant issues, list manual checks and browsers used, and include screenshots for visual changes.

## Security & Offline Behavior

Keep QR content processing local. Avoid introducing remote scripts or transmitting entered content. Google Fonts is externally referenced; verify fallback fonts when offline. Preserve browser download fallbacks and object URL cleanup.
