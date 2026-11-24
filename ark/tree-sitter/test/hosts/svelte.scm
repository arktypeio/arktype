; Svelte's template expressions, `{...}`, which the grammar's own
; injections.scm leaves out but nvim-treesitter and Helix inject as
; JavaScript (and TextMate highlights as TypeScript in a lang="ts" file)
((svelte_raw_text) @injection.content
  (#set! injection.language "typescript"))
