/**
 * @file ArkType definitions, held 1:1 with the VS Code extension's TextMate
 * grammar (ark/extension/injected.tmLanguage.json).
 *
 * A host language injects two kinds of range into `arktype`:
 *
 * - the `arguments` of a definition call, `(` through `)`: `type(...)`,
 *   `scope(...)`, `x.or(...)` and the rest. The grammar lexes it the way
 *   TextMate's `arkAll` does: objects, tuples and quoted definitions are
 *   ArkType; parentheses, ternaries and anything else are TypeScript, whose
 *   strings stay plain.
 * - the first string argument of `regex(...)`, quotes included.
 *
 * TextMate's rules are lexical, not syntactic, so this grammar is too: a
 * definition string is a flat run of tokens classified the way the TextMate
 * patterns classify them, including where they disagree with ArkType's own
 * parser. Only definition and regex internals are highlighted; everything
 * else is left to the host.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const definitionNames =
	/type|generic|scope|define|match|fn|module|[aA]rk[a-zA-Z]*/

const chainNames =
	/and|or|case|in|extends|ifExtends|intersect|merge|exclude|extract|overlaps|subsumes|to|satisfies/

// TypeScript's type-primitive and type-builtin-literals, which TextMate's
// `source.ts#type` scopes as support.type
const builtinTypes = [
	"string",
	"number",
	"bigint",
	"boolean",
	"symbol",
	"any",
	"void",
	"never",
	"unknown",
	"this",
	"true",
	"false",
	"undefined",
	"null",
	"object"
]

const identifierPattern = /[\p{L}_][\p{L}\p{N}_$]*/
// inside type arguments TextMate's type-name pattern also starts at `$`
const dollarIdentifierPattern = /\$[\p{L}\p{N}_$]*/

// a word character TextMate's `[A-Za-z]` and `[0-9]` patterns don't cover,
// which arkRegexSource leaves unscoped
const nonAsciiWordChar = /[[\p{L}\p{N}_]&&[^A-Za-z0-9]]/

const numberPattern =
	/0[xX][0-9a-fA-F][0-9a-fA-F_]*|0[bB][01][01_]*|0[oO]?[0-7][0-7_]*|[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][-+]?[0-9][0-9_]*)?/

/** The three quote kinds a definition can use, keyed by rule-name suffix. */
const quotes = {
	double: '"',
	single: "'",
	backtick: "`"
}

/** @param {string} char */
const escapeClass = char => (char === "`" ? "`" : `\\${char}`)

/**
 * Rules for a definition delimited by `quote`: TextMate's arkQuoted, whose
 * content runs from the opening quote to the next same quote on the line.
 *
 * @param {string} suffix
 * @param {string} quote
 */
const definitionRules = (suffix, quote) => {
	const q = escapeClass(quote)
	const imm = token.immediate
	/** @param {string} name */
	const r = name => `${name}_${suffix}`
	const otherQuotes = Object.values(quotes).filter(other => other !== quote)
	const typeStringPattern = new RegExp(
		otherQuotes
			.filter(other => other !== "`")
			.map(other => {
				const o = escapeClass(other)
				return `${o}[^${o}${q}\\n]*${o}?`
			})
			.join("|")
	)

	return {
		[r("definition")]: $ =>
			seq(
				alias($[r("_definition_start")], '"'),
				repeat($[r("_definition_item")]),
				optional(alias($[r("_backslashes")], $.trailing_backslashes)),
				alias(imm(quote), '"')
			),

		[r("_backslashes")]: () => imm(/\\+/),

		[r("_definition_item")]: $ =>
			choice(
				$._space,
				$[r("_word_item")],
				$[r("regex")],
				$._number,
				alias(imm("..."), $.operator),
				prec(-1, alias($[r("_backslashes")], $.operator)),
				alias($[r("_operator")], $.operator)
			),

		[r("_operator")]: () =>
			imm(new RegExp(`[^ \\t\\n\\r\\p{L}\\p{N}_\\\\${q}]`)),

		// TextMate tries a word's patterns in order: keyof/typeof and the
		// builtins, then generics (`Foo<`), then a module (`foo.`), then a
		// type name
		[r("_word_item")]: $ =>
			choice(
				alias($._builtin_type, $.builtin_type),
				alias($._keyword, $.keyword),
				$[r("typeof_expression")],
				$[r("generic")],
				$[r("member_type")],
				alias($._identifier, $.type_identifier)
			),

		[r("typeof_expression")]: $ =>
			prec.right(
				seq(
					alias(imm("typeof"), $.keyword),
					repeat(
						choice(
							$._space,
							alias($._identifier, $.variable),
							alias($._builtin_type, $.variable),
							alias(imm("."), $.accessor)
						)
					)
				)
			),

		// `string.email`, `user.profile.name`: every segment before a `.` is a
		// module; a builtin only starts one with no space before its `.`
		[r("member_type")]: $ =>
			seq(
				choice(
					seq(alias($._builtin_type, $.module), alias(imm("."), $.accessor)),
					seq(alias($._identifier, $.module), $._spaced_accessor)
				),
				repeat(seq(alias($[r("_any_word")], $.module), $._spaced_accessor)),
				choice(alias($[r("_any_word")], $.type_identifier), $[r("generic")])
			),

		[r("_any_word")]: $ =>
			choice($._identifier, $._builtin_type, $._keyword, imm("typeof")),

		// TextMate's type-name generic rule: `Name<` opens TypeScript type
		// arguments, closed by `>` or by the end of the definition
		[r("generic")]: $ =>
			prec.right(
				seq(alias($._identifier, $.type_identifier), $[r("type_arguments")])
			),

		[r("type_arguments")]: $ =>
			prec.right(
				seq(
					alias($._generic_open, "<"),
					repeat($[r("_type_argument_item")]),
					optional(alias(imm(">"), ">"))
				)
			),

		[r("_type_argument_item")]: $ =>
			choice(
				$._space,
				alias($._builtin_type, $.builtin_type),
				alias($._keyword, $.keyword),
				$[r("type_argument_generic")],
				$[r("type_argument_member")],
				alias($._type_argument_identifier, $.type_identifier),
				$._number,
				alias(imm(typeStringPattern), $.type_string),
				alias(imm(/[|&?:]/), $.operator),
				alias(imm(","), $.delimiter),
				alias(imm("=>"), $.keyword),
				alias(imm(/[()\[\]{}]/), $.bracket),
				alias(
					imm(new RegExp(`[^ \\t\\n\\r\\p{L}\\p{N}_$>${q}|&?:,()\\[\\]{}]`)),
					$.none
				)
			),

		[r("type_argument_generic")]: $ =>
			prec.right(
				seq(
					alias($._type_argument_identifier, $.type_identifier),
					$[r("type_arguments")]
				)
			),

		[r("type_argument_member")]: $ =>
			seq(
				choice(
					seq(alias($._builtin_type, $.module), alias(imm("."), $.accessor)),
					seq(alias($._type_argument_identifier, $.module), $._spaced_accessor)
				),
				repeat(seq(alias($[r("_any_word")], $.module), $._spaced_accessor)),
				choice(
					alias($[r("_any_word")], $.type_identifier),
					$[r("type_argument_generic")]
				)
			),

		// TextMate's arkRegex: `/`, then everything up to the next `/`, all
		// before the definition's closing quote
		[r("regex")]: $ =>
			seq(
				alias($[r("_regex_start")], $.operator),
				repeat(
					choice(
						$._space,
						alias(imm(/[A-Za-z]+/), $.type_identifier),
						alias(imm(/[0-9]+/), $.number_literal),
						prec(-1, alias($[r("_backslashes")], $.operator)),
						alias(
							imm(new RegExp(`[^ \\t\\n\\r\\p{L}\\p{N}_\\\\/${q}]`)),
							$.operator
						),
						alias(imm(nonAsciiWordChar), $.none)
					)
				),
				optional(alias($[r("_backslashes")], $.trailing_backslashes)),
				alias(imm("/"), $.operator)
			)
	}
}

/**
 * The first string argument of `regex(...)`: TextMate's arkRegexString,
 * which may span lines and treats `\\`, `\'`, `\"` and `` \` `` as one token.
 *
 * @param {string} suffix
 * @param {string} quote
 */
const patternRules = (suffix, quote) => {
	const q = escapeClass(quote)
	const imm = token.immediate
	return {
		[`pattern_${suffix}`]: $ =>
			seq(
				alias(quote, '"'),
				repeat(
					choice(
						imm(/\s+/),
						alias(imm(/\\[\\'"`]/), $.operator),
						alias(imm(/[A-Za-z]+/), $.type_identifier),
						alias(imm(/[0-9]+/), $.number_literal),
						alias(
							imm(new RegExp(`[^ \\t\\n\\r\\p{L}\\p{N}_${q}]`)),
							$.operator
						),
						alias(imm(nonAsciiWordChar), $.none)
					)
				),
				alias(imm(quote), '"')
			)
	}
}

export default grammar({
	name: "arktype",

	extras: () => [/\s/],

	externals: $ => [
		$._definition_start_double,
		$._definition_start_single,
		$._definition_start_backtick,
		$._regex_start_double,
		$._regex_start_single,
		$._regex_start_backtick,
		$._error_sentinel
	],

	rules: {
		source: $ => choice($.arguments, $.pattern),

		// ---- TextMate's arkAll: where definitions are ----

		arguments: $ => seq("(", repeat($._ark_item), ")"),

		_ark_item: $ =>
			choice(
				$.object,
				$.tuple,
				$._definition,
				$.ternary,
				$.function_body,
				":",
				$._ts_shared_item
			),

		// a function's block after `=>` or its parameters is TypeScript, as
		// TextMate's function rules make it
		function_body: $ =>
			prec(
				1,
				seq(
					choice("=>", $.parenthesized),
					alias($.ts_object, $.statement_block)
				)
			),

		object: $ =>
			seq(
				"{",
				repeat(choice(alias(/[\p{L}\p{N}_]+:/, $.key), $._ark_item)),
				"}"
			),

		tuple: $ => seq("[", repeat($._ark_item), "]"),

		_definition: $ =>
			choice($.definition_double, $.definition_single, $.definition_backtick),

		// TypeScript's ternary: between `?` and `:` strings are plain
		ternary: $ =>
			seq("?", repeat(choice($._ts_shared_item, $.ts_object, $.ts_array)), ":"),

		// ---- TypeScript: what TextMate hands to source.ts ----

		_ts_item: $ => choice($._ts_shared_item, $.ts_object, $.ts_array, ":", "?"),

		_ts_shared_item: $ =>
			choice(
				$.comment,
				$.string,
				$.template_string,
				$.regex_literal,
				$.call,
				$.chained_call,
				$.parenthesized,
				alias($._definition_name, $.identifier),
				$.identifier,
				$.number,
				$._punctuation
			),

		// any call TextMate's arkDefinition begins on: the name, then `(`
		call: $ =>
			seq(
				field("function", alias($._definition_name, $.identifier)),
				field("arguments", alias($._call_arguments, $.arguments))
			),

		// arkChained: `.`, a chained method, then `(`
		chained_call: $ =>
			seq(
				".",
				field("method", alias(token.immediate(chainNames), $.identifier)),
				field("arguments", alias($._call_arguments, $.arguments))
			),

		_call_arguments: $ =>
			seq(token.immediate(prec(1, "(")), repeat($._ark_item), ")"),

		parenthesized: $ => seq("(", repeat($._ts_item), ")"),

		ts_object: $ => seq("{", repeat($._ts_item), "}"),

		ts_array: $ => seq("[", repeat($._ts_item), "]"),

		_definition_name: () => definitionNames,

		identifier: () => /[\p{L}_][\p{L}\p{N}_]*/,

		number: () => /[0-9][\p{L}\p{N}_.]*/,

		_punctuation: () =>
			choice(
				".",
				"...",
				"?.",
				"??",
				",",
				";",
				"=>",
				"$",
				"/",
				/[^ \t\n\r\p{L}\p{N}_"'`()\[\]{}.,;?:$/]/
			),

		comment: () =>
			token(
				choice(seq("//", /[^\n]*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"))
			),

		string: () =>
			token(choice(/"([^"\\\n]|\\(.|\n))*"?/, /'([^'\\\n]|\\(.|\n))*'?/)),

		template_string: $ =>
			seq(
				"`",
				repeat(
					choice(
						token.immediate(/[^`\\$]+|\$/),
						token.immediate(/\\(.|\n)/),
						seq(token.immediate("${"), repeat($._ts_item), "}")
					)
				),
				token.immediate("`")
			),

		regex_literal: () =>
			token(seq("/", /([^/\\\n\[]|\\.|\[([^\]\\\n]|\\.)*\])+/, "/", /[a-z]*/)),

		// ---- shared definition tokens ----

		_space: () => token.immediate(/[ \t]+/),

		_builtin_type: () => token.immediate(choice(...builtinTypes)),

		_keyword: () =>
			token.immediate(choice("keyof", "readonly", "infer", "extends")),

		_identifier: () => token.immediate(identifierPattern),

		// the same token as outside type arguments, so the parser keeps the
		// arguments open, plus the names only TypeScript's type-name allows
		_type_argument_identifier: $ =>
			choice($._identifier, token.immediate(dollarIdentifierPattern)),

		_spaced_accessor: $ =>
			alias(token.immediate(prec(1, /[ \t]*\??\./)), $.accessor),

		_generic_open: () => token.immediate(prec(1, /[ \t]*</)),

		// a number and its bigint `n`, which TextMate scopes as storage
		_number: $ =>
			seq(
				alias(token.immediate(numberPattern), $.number_literal),
				optional(alias(token.immediate("n"), $.bigint_suffix))
			),

		trailing_backslashes: () => token.immediate(/\\+/),

		...definitionRules("double", quotes.double),
		...definitionRules("single", quotes.single),
		...definitionRules("backtick", quotes.backtick),

		// ---- regex(...) ----

		pattern: $ =>
			choice($.pattern_double, $.pattern_single, $.pattern_backtick),

		...patternRules("double", quotes.double),
		...patternRules("single", quotes.single),
		...patternRules("backtick", quotes.backtick)
	}
})
