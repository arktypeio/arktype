import type { Fn } from "./functions.js"

export declare const args: unique symbol

export type args = typeof args

export declare abstract class Kind<f extends Fn = Fn> {
	abstract readonly [args]: unknown
	f: f
}

export type apply<k extends Kind, args extends Parameters<k["f"]>> = ReturnType<
	(k & {
		readonly [args]: args
	})["f"]
>
