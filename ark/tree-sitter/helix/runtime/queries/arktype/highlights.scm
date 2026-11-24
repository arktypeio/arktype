; Generated from queries/highlights.scm by scripts/writeHelix.ts; edit that instead.

; ArkType definitions and regex(...) patterns, highlighted 1:1 with the VS
; Code extension's TextMate grammar. Each node type has exactly one capture
; and no captured node contains another, so the result doesn't depend on
; which pattern an editor lets win.
;
; Only definition and pattern internals are captured: the host language
; already highlights the call around them, and everything this grammar
; parses as plain TypeScript is left to it.

; the quotes of a definition or pattern
(definition_double "\"" @string)
(definition_single "\"" @string)
(definition_backtick "\"" @string)
(pattern_double "\"" @string)
(pattern_single "\"" @string)
(pattern_backtick "\"" @string)

(builtin_type) @type.builtin

(type_identifier) @type

(module) @namespace

(keyword) @keyword

(bigint_suffix) @keyword

(variable) @variable

(number_literal) @constant.numeric

(operator) @operator

(type_string) @string

[
  (accessor)
  (delimiter)
] @punctuation.delimiter

(bracket) @punctuation.bracket

(type_arguments_double ["<" ">"] @punctuation.bracket)
(type_arguments_single ["<" ">"] @punctuation.bracket)
(type_arguments_backtick ["<" ">"] @punctuation.bracket)
