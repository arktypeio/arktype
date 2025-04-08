import type { ArkTypeScanner } from "../scanner.js"

export type parseRegexp<
	unscanned extends string,
	initial extends boolean = false
> =
	initial extends true ?
		unscanned extends `^${infer nextUnscanned}$` ? parseRegexp<nextUnscanned>
		: unscanned extends `^${infer nextUnscanned}` ?
			append<parseRegexp<nextUnscanned>, string>
		: unscanned extends `${infer nextUnscanned}$` ?
			append<right<string>, parseRegexp<nextUnscanned>>
		:	append<right<string>, append<parseRegexp<unscanned>, string>>
	: unscanned extends `${infer a}|${infer b}` ?
		union<parseRegexp<a>, parseRegexp<b>>
	: parseRegexpToken<unscanned> extends (
		parseRegexpTokenResult<infer type, infer nextUnscanned>
	) ?
		continueParsing<right<type>, nextUnscanned>
	: unscanned extends (
		ArkTypeScanner.shift<infer lookahead, infer nextUnscanned>
	) ?
		lookahead extends EnclosingStartToken ?
			ArkTypeScanner.shiftUntil<
				nextUnscanned,
				EnclosingTokens[lookahead]
			> extends ArkTypeScanner.shiftResult<infer scanned, infer nextUnscanned> ?
				nextUnscanned extends "" ? left<"Incomplete enclosure">
				: lookahead extends "[" ?
					nextUnscanned extends (
						ArkTypeScanner.shift<string, infer nextUnscanned>
					) ?
						continueParsing<
							parseRegexpCharacterSet<scanned, true>,
							nextUnscanned
						>
					:	never
				: lookahead extends "(" ?
					nextUnscanned extends (
						ArkTypeScanner.shift<string, infer nextUnscanned>
					) ?
						continueParsing<
							parseRegexpCaptureGroup<scanned, true>,
							nextUnscanned
						>
					:	never
				:	left<`Unknown enclosure "${lookahead}"`>
			:	never
		:	continueParsing<right<lookahead>, nextUnscanned>
	: unscanned extends "" ? right<"">
	: left<`Unknown token "${unscanned}"`>

export type left<l extends string> = ["left", l]
export type right<r extends string> = ["right", r]
type either<l extends string, r extends string> = left<l> | right<r>

type append<
	a extends either<string, string>,
	b extends either<string, string>
> =
	a extends right<infer r1> ?
		b extends right<infer r2> ?
			right<`${r1}${r2}`>
		:	b
	:	a

type earlyReturn<a extends string, b extends either<string, string>> =
	b extends right<string> ? right<a> : b

type union<a extends either<string, string>, b extends either<string, string>> =
	a extends right<infer r1> ?
		b extends right<infer r2> ?
			r1 | r2
		:	b
	:	a

type continueParsing<
	type extends either<string, string>,
	unscanned extends string
> =
	type extends right<infer type> ?
		type extends string ?
			parseQuantifier<unscanned> extends (
				parseQuantifierResult<infer min, infer max, infer nextUnscanned>
			) ?
				append<applyQuantifier<type, min, max>, parseRegexp<nextUnscanned>>
			:	append<right<type>, parseRegexp<unscanned>>
		:	never
	:	type

const enclosingTokens = {
	"[": "]",
	"(": ")"
} as const

type EnclosingTokens = typeof enclosingTokens
type EnclosingStartToken = keyof typeof enclosingTokens

type parseRegexpToken<unscanned extends string> =
	unscanned extends ArkTypeScanner.shift<".", infer nextUnscanned> ?
		parseRegexpTokenResult<string, nextUnscanned>
	: unscanned extends ArkTypeScanner.shift<"\\w", infer nextUnscanned> ?
		parseRegexpTokenResult<AlphanumericCharacter | "_", nextUnscanned>
	: unscanned extends ArkTypeScanner.shift<"\\d", infer nextUnscanned> ?
		parseRegexpTokenResult<DigitCharacter, nextUnscanned>
	: unscanned extends ArkTypeScanner.shift<"\\s", infer nextUnscanned> ?
		parseRegexpTokenResult<WhitespaceCharacter, nextUnscanned>
	: unscanned extends ArkTypeScanner.shift<"\\W", infer nextUnscanned> ?
		parseRegexpTokenResult<string, nextUnscanned>
	: unscanned extends ArkTypeScanner.shift<"\\D", infer nextUnscanned> ?
		parseRegexpTokenResult<string, nextUnscanned>
	: unscanned extends ArkTypeScanner.shift<"\\S", infer nextUnscanned> ?
		parseRegexpTokenResult<string, nextUnscanned>
	: // this covers both backreferences and escaped character codes
	unscanned extends (
		ArkTypeScanner.shift<
			`\\${
				| DigitCharacter
				| `${DigitCharacter}${DigitCharacter}`
				| `${DigitCharacter}${DigitCharacter}${DigitCharacter}`
				| `${DigitCharacter}${DigitCharacter}${DigitCharacter}${DigitCharacter}`}`,
			infer nextUnscanned
		>
	) ?
		parseRegexpTokenResult<string, nextUnscanned>
	: unscanned extends (
		ArkTypeScanner.shift<`\\${infer lookahead}`, infer nextUnscanned>
	) ?
		lookahead extends "" ?
			left<"Incomplete escape sequence">
		:	parseRegexpTokenResult<lookahead, nextUnscanned>
	:	unknown

type parseRegexpTokenResult<type extends string, unscanned extends string> = {
	type: type
	unscanned: unscanned
}

type parseQuantifier<unscanned extends string> =
	unscanned extends ArkTypeScanner.shift<Quantifier, infer nextUnscanned> ?
		unscanned extends ArkTypeScanner.shift<infer quantifier, nextUnscanned> ?
			quantifier extends Quantifier ?
				Quantifiers[quantifier] extends (
					parseQuantifierResult<infer min, infer max, string>
				) ?
					parseQuantifierResult<min, max, nextUnscanned>
				:	never
			:	never
		:	never
	: unscanned extends ArkTypeScanner.shift<`{`, infer nextUnscanned> ?
		parseDigits<nextUnscanned> extends (
			parseDigitsResult<infer min, infer nextUnscanned>
		) ?
			nextUnscanned extends ArkTypeScanner.shift<",", infer nextUnscanned> ?
				parseDigits<nextUnscanned> extends (
					parseDigitsResult<infer max, infer nextUnscanned>
				) ?
					nextUnscanned extends ArkTypeScanner.shift<"}", infer nextUnscanned> ?
						// {min,max}
						parseUnsupportedQuantifierResult<nextUnscanned>
					:	unknown
				: nextUnscanned extends ArkTypeScanner.shift<"}", infer nextUnscanned> ?
					// {min,}
					parseUnsupportedQuantifierResult<nextUnscanned>
				:	unknown
			: nextUnscanned extends ArkTypeScanner.shift<"}", infer nextUnscanned> ?
				// {count}
				parseUnsupportedQuantifierResult<nextUnscanned>
			:	unknown
		: nextUnscanned extends ArkTypeScanner.shift<",", infer nextUnscanned> ?
			parseDigits<nextUnscanned> extends (
				parseDigitsResult<infer max, infer nextUnscanned>
			) ?
				nextUnscanned extends ArkTypeScanner.shift<`}`, infer nextUnscanned> ?
					// {,max}
					parseUnsupportedQuantifierResult<nextUnscanned>
				:	unknown
			:	unknown
		:	unknown
	:	unknown

// The following quantifiers are supported out-of-the-box.
// Remaining quantifiers (e.g. {0,}, {123}) are parsed dynamically and represented as parseQuantifierResult<0, Infinity>, leading to a `string` type.
type Quantifiers = {
	"*": parseQuantifierResult<0, Infinity, string>
	"+": parseQuantifierResult<1, Infinity, string>
	"+?": parseQuantifierResult<1, Infinity, string>
	"?": parseQuantifierResult<0, 1, string>
	"{0}": parseQuantifierResult<0, 0, string>
	"{1}": parseQuantifierResult<1, 1, string>
	"{2}": parseQuantifierResult<2, 2, string>
	"{3}": parseQuantifierResult<3, 3, string>
	"{1,1}": parseQuantifierResult<1, 1, string>
	"{1,2}": parseQuantifierResult<1, 2, string>
	"{1,3}": parseQuantifierResult<1, 3, string>
	"{2,3}": parseQuantifierResult<2, 3, string>
	"{0,1}": parseQuantifierResult<0, 1, string>
	"{0,2}": parseQuantifierResult<0, 2, string>
	"{0,3}": parseQuantifierResult<0, 3, string>
	"{,1}": parseQuantifierResult<0, 1, string>
	"{,2}": parseQuantifierResult<0, 2, string>
	"{,3}": parseQuantifierResult<0, 3, string>
}

type Infinity = 999
type Quantifier = keyof Quantifiers

type invalidMinMaxQuantifier = left<"Quantifier min must be smaller than max">

// Apply quantifier ranges up to size 3.
type applyQuantifier<
	type extends string,
	min extends number,
	max extends number
> = [
	[
		right<"">,
		right<"" | type>,
		right<"" | type | `${type}${type}`>,
		right<"" | type | `${type}${type}` | `${type}${type}${type}`>,
		...right<string>[]
	],
	[
		invalidMinMaxQuantifier,
		right<type>,
		right<type | `${type}${type}`>,
		right<`${type}${type}${type}`>,
		...right<string>[]
	],
	[
		invalidMinMaxQuantifier,
		invalidMinMaxQuantifier,
		right<`${type}${type}`>,
		right<`${type}${type}${type}`>,
		...right<string>[]
	],
	[
		invalidMinMaxQuantifier,
		invalidMinMaxQuantifier,
		invalidMinMaxQuantifier,
		right<`${type}${type}${type}`>,
		...right<string>[]
	],
	...right<string>[][]
][min][max]

type parseQuantifierResult<
	min extends number,
	max extends number,
	unscanned extends string
> = {
	min: min
	max: max
	unscanned: unscanned
}

type parseUnsupportedQuantifierResult<unscanned extends string> =
	parseQuantifierResult<0, Infinity, unscanned>

type parseDigits<unscanned extends string> =
	unscanned extends ArkTypeScanner.shift<DigitCharacter, infer nextUnscanned> ?
		unscanned extends ArkTypeScanner.shift<infer digit, nextUnscanned> ?
			parseDigits<nextUnscanned> extends (
				parseDigitsResult<infer digits, infer nextUnscanned>
			) ?
				parseDigitsResult<`${digit}${digits}`, nextUnscanned>
			:	parseDigitsResult<digit, nextUnscanned>
		:	never
	:	unknown

type parseDigitsResult<digits extends string, unscanned extends string> = {
	digits: digits
	unscanned: unscanned
}

// Parse character sets.
// Has limited support for ranges (only 0-9, a-z, A-Z).
// While it is possible to dynamically parse them with string arrays, this quickly hits the recursion limit.
// Efficient approaches that utilize string inference would be possible if a `type T = 'abc'[number]` were to resolve to `'a' | 'b' | 'c'`. But it doesn't.
type parseRegexpCharacterSet<
	unscanned extends string,
	initial extends boolean = false
> =
	initial extends true ?
		// inverted character sets are not supported - default to string
		unscanned extends ArkTypeScanner.shift<"^", infer nextUnscanned> ?
			earlyReturn<string, parseRegexpCharacterSet<nextUnscanned>>
		:	parseRegexpCharacterSet<unscanned>
	: // support standard a-z, A-Z, and 0-9 ranges
	unscanned extends ArkTypeScanner.shift<"a-z", infer nextUnscanned> ?
		union<
			right<LowercaseLetterCharacter>,
			parseRegexpCharacterSet<nextUnscanned>
		>
	: unscanned extends ArkTypeScanner.shift<"A-Z", infer nextUnscanned> ?
		union<
			right<UppercaseLetterCharacter>,
			parseRegexpCharacterSet<nextUnscanned>
		>
	: unscanned extends ArkTypeScanner.shift<"0-9", infer nextUnscanned> ?
		union<right<DigitCharacter>, parseRegexpCharacterSet<nextUnscanned>>
	: parseRegexpToken<unscanned> extends left<infer l> ? left<l>
	: parseRegexpToken<unscanned> extends (
		parseRegexpTokenResult<infer type, infer nextUnscanned>
	) ?
		union<right<type>, parseRegexpCharacterSet<nextUnscanned>>
	: unscanned extends (
		ArkTypeScanner.shift<infer lookahead, infer nextUnscanned>
	) ?
		nextUnscanned extends ArkTypeScanner.shift<"-", infer nextUnscanned> ?
			nextUnscanned extends "" ? right<lookahead | "-">
			: nextUnscanned extends (
				ArkTypeScanner.shift<string, infer nextUnscanned>
			) ?
				earlyReturn<string, parseRegexpCharacterSet<nextUnscanned>>
			:	never
		:	union<right<lookahead>, parseRegexpCharacterSet<nextUnscanned>>
	:	never

type parseRegexpCaptureGroup<
	unscanned extends string,
	initial extends boolean = false
> =
	initial extends true ?
		unscanned extends ArkTypeScanner.shift<"?:" | "?=", infer nextUnscanned> ?
			parseRegexpCaptureGroup<nextUnscanned>
		: unscanned extends ArkTypeScanner.shift<"?!", infer nextUnscanned> ?
			earlyReturn<string, parseRegexpCaptureGroup<nextUnscanned>>
		:	parseRegexpCaptureGroup<unscanned>
	:	parseRegexp<unscanned>

export type AlphanumericCharacter =
	| DigitCharacter
	| LowercaseLetterCharacter
	| UppercaseLetterCharacter

export type DigitCharacter =
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"

export type LowercaseLetterCharacter =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z"

export type UppercaseLetterCharacter =
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I"
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P"
	| "Q"
	| "R"
	| "S"
	| "T"
	| "U"
	| "V"
	| "W"
	| "X"
	| "Y"
	| "Z"

export type WhitespaceCharacter = " " | "\t" | "\n" | "\r" | "\f"
