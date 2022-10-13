import type { EvaluateFunction } from "@re-/tools"

export class InternalArktypeError extends Error {}

export const throwInternalError = (message: string) => {
    throw new InternalArktypeError(message)
}

export type LazyDynamicWrap<
    Fn extends Function,
    DynamicFn extends Function
> = Fn & {
    lazy: LazyDynamicWrap<Fn, DynamicFn>
    dynamic: LazyDynamicWrap<DynamicFn, DynamicFn>
}

export const lazyDynamicWrap = <
    InferredFn extends Function,
    DynamicFn extends Function
>(
    fn: DynamicFn
) =>
    Object.assign(fn, {
        lazy: lazify(fn),
        dynamic: fn
    }) as any as EvaluateFunction<LazyDynamicWrap<InferredFn, DynamicFn>>

const lazify = <Fn extends Function>(fn: Fn) =>
    ((...args: any[]) => {
        let cache: any
        return new Proxy(
            {},
            {
                get: (_, k) => {
                    if (!cache) {
                        cache = fn(...args)
                    }
                    return cache[k]
                }
            }
        )
    }) as any as Fn
