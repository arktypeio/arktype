export declare const _: unique symbol

export type _ = typeof _

type Fn = (...args: never[]) => unknown

export declare abstract class Kind<F extends Fn = Fn> {
	abstract readonly [_]: unknown
	f: F
}

export type Apply<F extends Kind, X extends Parameters<F["f"]>[0]> = ReturnType<
	(F & {
		readonly [_]: X
	})["f"]
>
