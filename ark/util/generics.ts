import type { Primitive } from "./domain.ts"
import { noSuggest, type ErrorMessage } from "./errors.ts"
import type { unionToTuple } from "./unionToTuple.ts"

export type Stringifiable =
	| string
	| boolean
	| number
	| bigint
	| null
	| undefined

/** Force an operation like `{ a: 0 } & { b: 1 }` to be computed so that it displays `{ a: 0; b: 1 }`. */
export type show<t> = { [k in keyof t]: t[k] } & unknown

/** @deprecated use "show" instead */
export type evaluate<t> = { [k in keyof t]: t[k] } & unknown

export type exact<t extends object, u extends object> = {
	[k in keyof t]: k extends keyof u ? conform<t[k], u[k]> : never
}

export type exactMessageOnError<t extends object, u extends object> = {
	[k in keyof t]: k extends keyof u ? conform<t[k], u[k]>
	:	ErrorMessage<`'${k & string}' is not a valid key`>
} & u

export type promisable<t> = t | Promise<t>

export type leftIfEqual<l, r> = [l, r] extends [r, l] ? l : r

export type UnknownUnion =
	| string
	| number
	| symbol
	| bigint
	| boolean
	| object
	| null
	| undefined

/**
 * Interesection (`&`) that avoids evaluating `unknown` to `{}`
 */
export type andPreserveUnknown<l, r> =
	unknown extends l & r ? unknown : show<l & r>

/** Can be used to test for the universal subtypes, `any` and `never`, e.g.:
 *
 * ```ts
 * type isAnyOrNever<t> = [t] extends [anyOrNever] ? true : false
 * ```
 *
 *  The actual value is a string literal, but the only realistic subtypes
 *  of that literal are `any` and `never`.
 */
export type anyOrNever = " anyOrNever"

export type conform<t, base> = t extends base ? t : base

export type equals<l, r> = [l, r] extends [r, l] ? true : false

export type exactEquals<l, r> =
	(<_>() => _ extends l ? 1 : 2) extends <_>() => _ extends r ? 1 : 2 ? true
	:	false

/** You can avoid suggesting completions by prefixing a string key with whitespace.
 *  Isn't that keyNominal?
 */
export const keyNonimal = " keyNonimal"

export type Branded<t = unknown, id = unknown> = t & {
	readonly [keyNonimal]: [t, id]
}

export type unbrand<t> = t extends Branded<infer base, string> ? base : never

export type satisfy<base, t extends base> = t

export type defined<t> = t & ({} | null)

export type autocomplete<suggestions extends string> =
	| suggestions
	| (string & {})

export type widen<t, supertypes> = collectWidenedType<
	t,
	unionToTuple<supertypes>
>

type collectWidenedType<t, remaining extends unknown[], result = never> =
	remaining extends [infer head, ...infer tail] ?
		collectWidenedType<t, tail, t extends head ? result | head : result>
	:	result

type narrowTuple<t extends readonly unknown[]> =
	t extends readonly [infer head, ...infer tail] ?
		readonly [head, ...narrowTuple<tail>]
	:	[]

export type narrow<t> =
	t extends Primitive ? t
	: t extends readonly unknown[] ? narrowTuple<t>
	: { [k in keyof t]: narrow<t[k]> }

export const narrow = <t>(t: narrow<t>): t => t as t

/** primitive key used to represent an inferred type at compile-time */
export const inferred = noSuggest("arkInferred")

/** primitive key used to represent an inferred type at compile-time */
export type inferred = typeof inferred
