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

/**
 *  Can be used to allow arbitrarily chained property access and function calls.
 *  This is useful for expressions whose meaning is not attached to a value,
 *  e.g. to allow the extraction of types using typeof without depending on
 *  the existence of a real object that conforms to that type's structure:
 *
 * @example
 * const myType: MyType = chainableNoOpProxy
 *
 * // The following types are equivalent
 * type ExtractedType = typeof myType.a.b.c
 * type DirectlyExtractedType = MyType["a"]["b"]["c"]
 */
export const chainableNoOpProxy: any = new Proxy(() => chainableNoOpProxy, {
    get: () => chainableNoOpProxy
})

export const isKeyOf = <Obj extends object, K extends string | number>(
    key: K,
    obj: Obj
): key is Extract<keyof Obj, K> => key in obj

export type Dictionary<Of = unknown> = Record<string, Of>

export type ClassOf<Instance> = new (...constructorArgs: any[]) => Instance

export type InstanceOf<Class extends ClassOf<unknown>> = Class extends ClassOf<
    infer Instance
>
    ? Instance
    : never

export type IsTopType<T> = (any extends T ? true : false) extends true
    ? true
    : false

export type IsAny<T> = (any extends T ? TopTypeIsAny<T> : false) extends true
    ? true
    : false

export type IsUnknown<T> = (
    any extends T ? TopTypeIsUnknown<T> : false
) extends true
    ? true
    : false

type TopTypeIsAny<T> = (T extends {} ? true : false) extends false
    ? false
    : true

type TopTypeIsUnknown<T> = (T extends {} ? true : false) extends false
    ? true
    : false

export type Conform<T, Base> = T extends Base ? T : Base

// Currently returns never if string and number keys of the same name are merged, e.g.:
// type Result = Merge<{1: false}, {"1": true}> //never
// This feels too niche to fix at the cost of performance and complexity, but that could change
// It also overrides values with undefined, unlike the associated function. We'll have to see if this is problematic.
export type Merge<Base, Merged> = Evaluate<
    Omit<ExtractMergeable<Base>, Extract<keyof Base, keyof Merged>> &
        ExtractMergeable<Merged>
>

type ExtractMergeable<T> = T extends {} ? T : {}

export type Narrow<T> = CastWithExclusion<T, NarrowRecurse<T>, []>

type NarrowRecurse<T> = {
    [K in keyof T]: T[K] extends Narrowable | [] ? T[K] : NarrowRecurse<T[K]>
}

type CastWithExclusion<T, CastTo, Excluded> = T extends Excluded ? T : CastTo

type Narrowable = string | boolean | number | bigint

/**
 * Note: Similarly to Narrow, trying to Evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 *
 */
export type Evaluate<T> = {
    [K in keyof T]: T[K]
} & unknown

export type BuiltinJsTypes = {
    bigint: bigint
    boolean: boolean
    function: Function
    number: number
    object: object | null
    string: string
    symbol: symbol
    undefined: undefined
}

export type BuiltinJsTypeOf<Data> = Data extends Function
    ? "function"
    : Data extends object | null
    ? "object"
    : Data extends string
    ? "string"
    : Data extends number
    ? "number"
    : Data extends undefined
    ? "undefined"
    : Data extends boolean
    ? "boolean"
    : Data extends bigint
    ? "bigint"
    : "symbol"

export type BuiltinJsTypeName = keyof BuiltinJsTypes

export type NormalizedJsTypes = Evaluate<
    Omit<BuiltinJsTypes, "object"> & {
        object: Record<string, unknown>
        array: unknown[]
        null: null
    }
>

export type NormalizedJsTypeName = keyof NormalizedJsTypes

export type NormalizedJsTypeOf<Data> = IsTopType<Data> extends true
    ? NormalizedJsTypeName
    : Data extends readonly unknown[]
    ? "array"
    : Data extends null
    ? "null"
    : BuiltinJsTypeOf<Data>

export const jsTypeOf = <Data>(data: Data) =>
    (Array.isArray(data)
        ? "array"
        : data === null
        ? "null"
        : typeof data) as NormalizedJsTypeOf<Data>

export const hasJsType = <TypeName extends NormalizedJsTypeName>(
    data: unknown,
    typeName: TypeName
): data is NormalizedJsTypes[TypeName] => jsTypeOf(data) === typeName

export const hasJsTypeIn = <TypeName extends NormalizedJsTypeName>(
    data: unknown,
    typeNames: Record<TypeName, unknown>
): data is NormalizedJsTypes[TypeName] => jsTypeOf(data) in typeNames
