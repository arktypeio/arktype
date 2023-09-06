import type { Fn } from "./functions.js"

export declare const hktInput: unique symbol

export type hktInput = typeof hktInput

export declare abstract class Hkt<f extends Fn = Fn> {
	abstract readonly [hktInput]: unknown
	f: f
}

export type apply<
	hkt extends Hkt,
	args extends Parameters<hkt["f"]>[0]
> = ReturnType<
	(hkt & {
		readonly [hktInput]: args
	})["f"]
>
