import type { Fn } from "./functions.js"
import type { conform } from "./generics.js"

export declare abstract class Hkt<f extends Fn = Fn> {
	abstract readonly [Hkt.key]: unknown
	f: f
}

/** A small set of HKT utility types based on https://github.com/poteat/hkt-toolbelt */
export namespace Hkt {
	export declare const key: unique symbol

	export type key = typeof key

	export type apply<
		hkt extends Hkt,
		args extends Parameters<hkt["f"]>[0]
	> = ReturnType<
		(hkt & {
			readonly [key]: args
		})["f"]
	>

	export type inputOf<hkt extends Hkt> = Parameters<hkt["f"]>[0]

	type reify<hkt extends Hkt> = hkt & {
		<In extends inputOf<hkt>>(
			In: narrow<In>
		): apply<hkt, In> extends Hkt ? reify<apply<hkt, In>> : apply<hkt, In>
	}

	export interface Reify extends Hkt {
		f(In: conform<this[key], Hkt>): reify<typeof In>
	}

	type Narrowable =
		| string
		| number
		| bigint
		| boolean
		| undefined
		| null
		| Fn
		| Hkt
		| readonly Narrowable[]
		| {
				[key: string]: Narrowable
		  }

	export type narrow<
		t,
		base = conform<t, Narrowable> | [...conform<t, readonly Narrowable[]>]
	> = base extends readonly unknown[]
		? { [key in keyof t]: narrow<t[key]> }
		: base

	export interface Narrow extends Hkt {
		f(In: this[key]): narrow<typeof In>
	}
}
