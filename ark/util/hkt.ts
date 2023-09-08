import type { Fn } from "./functions.js"
import type { asConst, conform } from "./generics.js"

export declare abstract class Hkt<f extends Fn = Fn> {
	abstract readonly [Hkt.In]: unknown
	f: f
}

/** A small set of HKT utility types based on https://github.com/poteat/hkt-toolbelt */
export namespace Hkt {
	export declare const In: unique symbol

	export type In = typeof In

	export type apply<
		hkt extends Hkt,
		args extends Parameters<hkt["f"]>[0]
	> = ReturnType<
		(hkt & {
			readonly [In]: args
		})["f"]
	>

	export type inputOf<hkt extends Hkt> = Parameters<hkt["f"]>[0]

	export type reify<hkt extends Hkt> = hkt & {
		<In extends inputOf<hkt>>(
			In: asConst<In>
		): apply<hkt, In> extends Hkt ? reify<apply<hkt, In>> : apply<hkt, In>
	}

	export interface Reify extends Hkt {
		f(In: conform<this[In], Hkt>): reify<typeof In>
	}
}
