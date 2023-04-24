import { hasKind } from "./domains.js"
import { throwInternalError } from "./errors.js"

export const asConst = <t>(t: asConstRecurse<t>) => t

export type asConst<t> = castWithExclusion<t, asConstRecurse<t>, []>

type asConstRecurse<t> = {
    [k in keyof t]: t[k] extends Literalable | [] ? t[k] : asConstRecurse<t[k]>
} & unknown

export type castWithExclusion<t, castTo, excluded> = t extends excluded
    ? t
    : castTo

export type Literalable = string | boolean | number | bigint

export type evaluateObjectOrFunction<t> = unknown extends t
    ? t
    : t extends (...args: infer args) => infer ret
    ? (...args: args) => ret
    : evaluate<t>

export type evaluate<t> = { [k in keyof t]: t[k] } & unknown

export type exact<t, u> = {
    [k in keyof t]: k extends keyof u ? t[k] : never
}

// TODO: Try replacing defer
export type noInfer<t> = [t][t extends any ? 0 : never]

export type merge<base, merged> = evaluate<Omit<base, keyof merged> & merged>

/** Replace existing keys of o without altering readonly or optional modifiers  */
export type replaceProps<
    o,
    replacements extends { -readonly [k in keyof o]?: unknown }
> = evaluate<{
    [k in keyof o]: k extends keyof replacements ? replacements[k] : o[k]
}>

export type isAny<t> = [unknown, t] extends [t, {}] ? true : false

export type isUnknown<t> = unknown extends t
    ? [t] extends [{}]
        ? false
        : true
    : false

export type extractKeysWithValue<o, filter> = {
    [k in keyof o]: isAny<o[k]> extends true
        ? never
        : o[k] extends never
        ? never
        : o[k] extends filter
        ? k
        : never
}[keyof o]

export type extractValues<o, filter> = o[extractKeysWithValue<o, filter>]

export type conform<t, base> = t extends base ? t : base

export const isKeyOf = <k extends string | number, obj extends object>(
    k: k,
    obj: obj
): k is Extract<keyof obj, k> => k in obj

export type constructor<instance = unknown> = new (...args: any[]) => instance

export type FunctionLike =
    | ((...args: any[]) => unknown)
    | (new (...args: any[]) => unknown)

export type instanceOf<classType extends constructor<any>> =
    classType extends constructor<infer Instance> ? Instance : never

export type entryOf<o> = evaluate<
    { [k in keyof o]-?: [k, defined<o[k]>] }[o extends List
        ? keyof o & number
        : keyof o]
>

export type entriesOf<o extends object> = evaluate<entryOf<o>[]>

export const entriesOf = <o extends object>(o: o) =>
    Object.entries(o) as entriesOf<o>

export type valueOf<o extends object> = evaluate<o[keyof o]>

/** Mimics the result of Object.keys(...) */
export type keysOf<o> = [o] extends [object]
    ? o extends readonly unknown[]
        ? any[] extends o
            ? `${number}`
            : keyof o & `${number}`
        : keyof o extends number
        ? `${keyof o}`
        : Exclude<keyof o, symbol>
    : never

export const keysOf = <o extends object>(o: o) => Object.keys(o) as keysOf<o>[]

export type stringKeyOf<o> = keyof o & string

/** Mimics output of TS's keyof operator at runtime */
export const prototypeKeysOf = <t>(value: t): evaluate<keyof t>[] => {
    const result: (string | number | symbol)[] = []
    while (
        value !== Object.prototype &&
        value !== null &&
        value !== undefined
    ) {
        for (const k of Object.getOwnPropertyNames(value)) {
            if (!result.includes(k)) {
                result.push(k)
            }
        }
        for (const symbol of Object.getOwnPropertySymbols(value)) {
            if (!result.includes(symbol)) {
                result.push(symbol)
            }
        }
        value = Object.getPrototypeOf(value)
    }
    return result as evaluate<keyof t>[]
}

export const constructorExtends = (
    constructor: constructor,
    base: constructor
) => {
    let current = constructor.prototype

    while (current !== null) {
        if (current === base.prototype) {
            return true
        }

        current = Object.getPrototypeOf(current)
    }
    return false
}

export const hasKey = <o extends object, k extends keyof o>(
    o: o,
    k: k
): o is requireKeys<o, k> => k in o

export const keyCount = (o: object) => Object.keys(o).length

export type keySet<key extends string = string> = { readonly [_ in key]?: true }

export const hasKeys = (value: unknown) =>
    hasKind(value, "object") ? Object.keys(value).length !== 0 : false

export type mutable<o> = {
    -readonly [k in keyof o]: o[k]
}

export const mutable = <t>(t: t) => t as mutable<t>

export type immutable<o> = {
    readonly [k in keyof o]: o[k]
}

export type deepImmutable<o> = [o] extends [object]
    ? {
          readonly [k in keyof o]: deepImmutable<o[k]>
      }
    : o

/** Check for type equality without breaking TS for this repo. Fails on some types like Dict/{} */
export type equals<t, u> = identity<t> extends identity<u> ? true : false

const id = Symbol("id")

export type nominal<t, id extends string> = t & {
    readonly [id]: id
}

export type assertEqual<t, u> = equals<t, u> extends true
    ? t
    : error<`types were not equivalent`>

export type identity<in out t> = (_: t) => t

export type extend<t, u extends t> = u

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type subsume<t extends u, u> = u

export type defined<t> = Exclude<t, undefined>

export type requireKeys<o, key extends keyof o> = o & {
    [requiredKey in key]-?: defined<o[requiredKey]>
}

export type optionalizeKeys<o, key extends keyof o> = Omit<o, key> & {
    [requiredKey in key]?: o[requiredKey]
}

export type requiredKeyOf<o> = {
    [k in keyof o]-?: o extends { [_ in k]-?: o[k] } ? k : never
}[keyof o]

export type optionalKeyOf<o> = Exclude<keyof o, requiredKeyOf<o>>

/** Type equivalent of ?? */
export type coalesce<t, fallback> = t extends {} ? t : fallback

export type error<message extends string = string> = `!${message}`

export type castOnError<t, to> = unknown extends t
    ? t
    : t extends never
    ? t
    : t extends error
    ? to
    : t

export type tryCatch<t, onValid> = isAny<t> extends true
    ? onValid
    : t extends never
    ? onValid
    : t extends error
    ? t
    : onValid

export type RegexLiteral<expression extends string = string> = `/${expression}/`

export type autocomplete<suggestions extends string> =
    | suggestions
    | (string & {})

export type tailOf<t extends List> = t extends readonly [unknown, ...infer tail]
    ? tail
    : []

export type headOf<t extends List> = t extends readonly [
    infer head,
    ...unknown[]
]
    ? head
    : never

export type tailOfString<S extends string> = S extends `${string}${infer Tail}`
    ? Tail
    : ""

export type headOfString<S extends string> = S extends `${infer Head}${string}`
    ? Head
    : ""

export type parametersOf<f> = f extends (...args: infer parameters) => unknown
    ? parameters
    : never

export type returnOf<f> = f extends (...args: never[]) => infer returns
    ? returns
    : never

export type Dict<k extends string = string, v = unknown> = {
    readonly [_ in k]: v
}

export type List<t = unknown> = readonly t[]

export type arraySubclassToReadonly<t extends unknown[]> =
    readonly t[number][] & {
        [k in Exclude<keyof t, keyof unknown[]>]: t[k]
    }

export type HomogenousTuple<
    item,
    length extends number,
    result extends item[] = []
> = result["length"] extends length
    ? result
    : HomogenousTuple<item, length, [...result, item]>

export const listFrom = <t>(data: t) =>
    (Array.isArray(data) ? data : [data]) as t extends List ? t : t[]

export type CollapsibleList<t> = t | t[]

/** Either:
 * A, with all properties of B undefined
 * OR
 * B, with all properties of A undefined
 **/
export type xor<a, b> =
    | evaluate<a & { [k in keyof b]?: undefined }>
    | evaluate<b & { [k in keyof a]?: undefined }>

export const intersectUniqueLists = <item>(
    l: readonly item[],
    r: readonly item[]
) => {
    const intersection = [...l]
    for (const item of r) {
        if (!l.includes(item)) {
            intersection.push(item)
        }
    }
    return intersection
}

export const CompiledFunction = class extends Function {
    constructor(...args: string[]) {
        try {
            super(...args)
        } catch (e) {
            return throwInternalError(
                `Encountered an unexpected error during validation:
                Message: ${e} 
                Source: (${args.slice(0, -1)}) => {
                    ${args.at(-1)}
                }`
            )
        }
    }
} as CompiledFunction

export type CompiledFunction = new <f extends (...args: any[]) => unknown>(
    ...args: ConstructorParameters<typeof Function>
) => f & {
    apply(thisArg: null, args: Parameters<f>): ReturnType<f>

    call(thisArg: null, ...args: Parameters<f>): ReturnType<f>
}
