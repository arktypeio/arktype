import type { Fn } from "./functions.js"

export declare const args: unique symbol

export type args = typeof args

export declare abstract class Hkt<f extends Fn = Fn> {
	abstract readonly [args]: unknown
	f: f
}

export type apply<
	hkt extends Hkt,
	args extends Parameters<hkt["f"]>[0]
> = ReturnType<
	(hkt & {
		readonly [args]: args
	})["f"]
>
