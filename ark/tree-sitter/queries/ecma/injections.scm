; Injects ArkType into TypeScript, TSX and JavaScript, matching where the
; VS Code extension's TextMate grammar (injected.tmLanguage.json) applies.
; Uses only node types those three grammars share, so one file serves all of
; them: Neovim and Helix can inherit it through `ecma`, Zed can append it to
; each host's injections.scm.

; type(...), scope(...), ark(...) and the other definition entrypoints. The
; anchor rejects `type<T>(...)`, which TextMate doesn't highlight either. A
; name may follow a `$` in the identifier (`my$type`), as TextMate's `\b` allows.
((call_expression
  function: (identifier) @_name
  .
  arguments: (arguments) @injection.content)
  (#match? @_name "^([A-Za-z0-9_$]*[$])?(type|generic|scope|define|match|fn|module|[aA]rk[a-zA-Z]*)$")
  (#set! injection.language "arktype")
  (#set! injection.include-children))

; $.type(...), ark.scope(...), and chained methods: T.or(...), T.merge(...)
((call_expression
  function: (member_expression
    property: (property_identifier) @_name)
  .
  arguments: (arguments) @injection.content)
  (#match? @_name "^(([A-Za-z0-9_$]*[$])?(type|generic|scope|define|match|fn|module|[aA]rk[a-zA-Z]*)|and|or|case|in|extends|ifExtends|intersect|merge|exclude|extract|overlaps|subsumes|to|satisfies)$")
  (#set! injection.language "arktype")
  (#set! injection.include-children))

; regex(...): its first argument, when a string, is the pattern
((call_expression
  function: [
    (identifier) @_name
    (member_expression
      property: (property_identifier) @_name)
  ]
  .
  arguments: (arguments
    .
    [
      (string)
      (template_string)
    ] @injection.content))
  (#eq? @_name "regex")
  (#set! injection.language "arktype")
  (#set! injection.include-children))
