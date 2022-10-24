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
    }) as any as LazyDynamicWrap<InferredFn, DynamicFn>

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
