import { throwParseError } from "./errors.ts"
import { anchoredRegex, RegexPatterns } from "./strings.ts"

export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type NumberLiteral<n extends number = number> = `${n}`

export type BigintLiteral<n extends bigint = bigint> = `${n}n`

export type IntegerLiteral<n extends bigint = bigint> = `${n}`

export type NonNegativeIntegerLiteral<n extends bigint = bigint> =
	| `${Digit}`
	| (`${Exclude<Digit, 0>}${string}` & `${n}`)

/*
 * The goal of the number literal and bigint literal regular expressions is to:
 *
 *   1. Ensure definitions form a bijection with the values they represent.
 *   2. Attempt to mirror TypeScript's own format for stringification of numeric
 *      values such that the regex should match a given definition if any only if
 *      a precise literal type will be inferred (in TS4.8+).
 */

const anchoredNegativeZeroPattern = /^-0\.?0*$/.source
const positiveIntegerPattern = /[1-9]\d*/.source
const looseDecimalPattern = /\.\d+/.source
const strictDecimalPattern = /\.\d*[1-9]/.source

type CreateNumberMatcherOptions = {
	decimalPattern: string
	allowDecimalOnly: boolean
}

const createNumberMatcher = (opts: CreateNumberMatcherOptions) =>
	anchoredRegex(
		RegexPatterns.negativeLookahead(anchoredNegativeZeroPattern) +
			RegexPatterns.nonCapturingGroup(
				"-?" +
					RegexPatterns.nonCapturingGroup(
						RegexPatterns.nonCapturingGroup("0|" + positiveIntegerPattern) +
							RegexPatterns.nonCapturingGroup(opts.decimalPattern) +
							"?"
					) +
					(opts.allowDecimalOnly ? "|" + opts.decimalPattern : "") +
					"?"
			)
	)

/**
 *  Matches a well-formatted numeric expression according to the following rules:
 *    1. Must include an integer portion (i.e. '.321' must be written as '0.321')
 *    2. The first digit of the value must not be 0, unless the entire integer portion is 0
 *    3. If the value includes a decimal, its last digit may not be 0
 *    4. The value may not be "-0"
 */
export const wellFormedNumberMatcher: RegExp = createNumberMatcher({
	decimalPattern: strictDecimalPattern,
	allowDecimalOnly: false
})

export const isWellFormedNumber: RegExp["test"] =
	wellFormedNumberMatcher.test.bind(wellFormedNumberMatcher)

/**
 * Similar to wellFormedNumber but more permissive in the following ways:
 *
 *  - Allows numbers without an integer portion like ".5" (well-formed equivalent is "0.5")
 *  - Allows decimals with trailing zeroes like "0.10" (well-formed equivalent is "0.1")
 */
export const numericStringMatcher: RegExp = createNumberMatcher({
	decimalPattern: looseDecimalPattern,
	allowDecimalOnly: true
})

export const numberLikeMatcher = /^-?\d*\.?\d*$/
const isNumberLike = (s: string) => s.length !== 0 && numberLikeMatcher.test(s)

/**
 *  Matches a well-formatted integer according to the following rules:
 *    1. must begin with an integer, the first digit of which cannot be 0 unless the entire value is 0
 *    2. The value may not be "-0"
 */
export const wellFormedIntegerMatcher: RegExp = anchoredRegex(
	RegexPatterns.negativeLookahead("^-0$") +
		"-?" +
		RegexPatterns.nonCapturingGroup(
			RegexPatterns.nonCapturingGroup("0|" + positiveIntegerPattern)
		)
)

export const isWellFormedInteger: RegExp["test"] =
	wellFormedIntegerMatcher.test.bind(wellFormedIntegerMatcher)

export const integerLikeMatcher = /^-?\d+$/
const isIntegerLike = integerLikeMatcher.test.bind(integerLikeMatcher)

type NumericLiteralKind = "number" | "bigint" | "integer"

const numericLiteralDescriptions = {
	number: "a number",
	bigint: "a bigint",
	integer: "an integer"
} as const

type numericLiteralDescriptions = typeof numericLiteralDescriptions

export type writeMalformedNumericLiteralMessage<
	def extends string,
	kind extends NumericLiteralKind
> = `'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation`

export const writeMalformedNumericLiteralMessage = <
	def extends string,
	kind extends NumericLiteralKind
>(
	def: def,
	kind: kind
): writeMalformedNumericLiteralMessage<def, kind> =>
	`'${def}' was parsed as ${numericLiteralDescriptions[kind]} but could not be narrowed to a literal value. Avoid unnecessary leading or trailing zeros and other abnormal notation`

type ValidationKind = "number" | "integer"

const isWellFormed = (def: string, kind: ValidationKind) =>
	kind === "number" ? isWellFormedNumber(def) : isWellFormedInteger(def)

const parseKind = (def: string, kind: ValidationKind) =>
	kind === "number" ? Number(def) : Number.parseInt(def)

const isKindLike = (def: string, kind: ValidationKind) =>
	kind === "number" ? isNumberLike(def) : isIntegerLike(def)

export const tryParseNumber = <errorOnFail extends boolean | string>(
	token: string,
	options?: NumericParseOptions<errorOnFail>
): errorOnFail extends true | string ? number : number | undefined =>
	parseNumeric(token, "number", options)

export const tryParseWellFormedNumber: typeof tryParseNumber = (
	token,
	options
) => parseNumeric(token, "number", { ...options, strict: true })

export type tryParseNumber<token extends string, messageOnFail extends string> =
	token extends `${infer n extends number}` ?
		number extends n ?
			writeMalformedNumericLiteralMessage<token, "number">
		:	n
	:	messageOnFail

export type parseNumber<token extends string> =
	token extends `${infer n extends number}` ? n : never

export const tryParseInteger = <errorOnFail extends boolean | string>(
	token: string,
	options?: NumericParseOptions<errorOnFail>
): errorOnFail extends true | string ? number : number | undefined =>
	parseNumeric(token, "integer", options)

// We use bigint to check if the string matches an integer, but here we
// convert it to a plain number by exploiting the fact that TS stringifies
// numbers and bigints the same way.
export type tryParseInteger<
	token extends string,
	messageOnFail extends string
> =
	token extends `${infer b extends bigint}` ?
		bigint extends b ? writeMalformedNumericLiteralMessage<token, "integer">
		: token extends `${infer n extends number}` ? n
		: never
	:	messageOnFail

export type parseInteger<token extends string> =
	token extends `${bigint}` ?
		token extends `${infer n extends number}` ?
			n
		:	never
	:	never

export type parseNonNegativeInteger<token extends string> =
	token extends `-${string}` ? never : parseInteger<token>

export type NumericParseOptions<errorOnFail extends boolean | string> = {
	errorOnFail?: errorOnFail
	strict?: boolean
}

const parseNumeric = <errorOnFail extends boolean | string>(
	token: string,
	kind: ValidationKind,
	options?: NumericParseOptions<errorOnFail>
): errorOnFail extends true | string ? number : number | undefined => {
	const value = parseKind(token, kind)
	if (!Number.isNaN(value)) {
		if (isKindLike(token, kind)) {
			if (options?.strict) {
				return isWellFormed(token, kind) ? value : (
						throwParseError(writeMalformedNumericLiteralMessage(token, kind))
					)
			}
			return value
		}
	}
	return (
		options?.errorOnFail ?
			throwParseError(
				options?.errorOnFail === true ?
					`Failed to parse ${numericLiteralDescriptions[kind]} from '${token}'`
				:	options?.errorOnFail
			)
		:	undefined) as never
}

export const tryParseWellFormedBigint = (def: string): bigint | undefined => {
	if (def[def.length - 1] !== "n") return

	const maybeIntegerLiteral = def.slice(0, -1)
	let value
	try {
		value = BigInt(maybeIntegerLiteral)
	} catch {
		return
	}
	if (wellFormedIntegerMatcher.test(maybeIntegerLiteral)) return value

	if (integerLikeMatcher.test(maybeIntegerLiteral)) {
		// If the definition looks like a bigint but is
		// not well-formed, throw.
		return throwParseError(writeMalformedNumericLiteralMessage(def, "bigint"))
	}
}

/**
 * Returns the next or previous representable floating-point number after the given input.
 *
 * @param {"+" | "-"} [direction="+"] - The direction to find the nearest float. "+" for the next float, "-" for the previous float.
 * @throws {Error} If the input is not a finite number.
 *
 * @example
 * console.log(nearestFloat(0)); // Smallest positive number
 * console.log(nearestFloat(2)); // 2.0000000000000004
 * console.log(nearestFloat(2.1)); // 2.1000000000000005
 * console.log(nearestFloat(2, "-")); // 1.9999999999999998
 * console.log(nearestFloat(2.1, "-")); // 2.0999999999999996
 * // as size of input increases, the increments become larger to stay within what
 * // JS can represent in a numeric value
 * console.log(nearestFloat(5555555555555555)); // 5555555555555556
 * console.log(nearestFloat(5555555555555555, "-")); // 5555555555555554
 */
export const nearestFloat = (n: number, direction: "+" | "-" = "+"): number => {
	const buffer = new ArrayBuffer(8)
	const f64 = new Float64Array(buffer)
	const u32 = new Uint32Array(buffer)

	f64[0] = n

	if (n === 0) {
		u32[0] = 1
		u32[1] = direction === "-" ? 1 << 31 : 0
	} else if ((n > 0 && direction === "+") || (n < 0 && direction === "-")) {
		if (u32[0]++ === 0xffffffff) u32[1]++
	} else if (u32[0]-- === 0) u32[1]--

	return f64[0]
}
