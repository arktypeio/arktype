import moize from "moize"
import isDeepEqual from "fast-deep-equal"
import deepMerge from "deepmerge"
import { Number, Object as O } from "ts-toolbelt"

export const merge = deepMerge
export const memoize = moize as <F extends Function>(f: F) => F
export const deepEquals = isDeepEqual

export type Merge<
    A extends object,
    B extends object,
    C extends object = {},
    D extends object = {},
    E extends object = {},
    F extends object = {},
    G extends object = {}
> = O.Assign<A, [G, F, E, D, C, B]>

export type MapReturn<F, V> = F extends (value: V) => infer R ? R : any

export const isIn = (list: any[], value: any) => list.includes(value)

export type Class<T> = new (...args: any[]) => T

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends NonRecursible
        ? Required<T[P]>
        : DeepRequired<T[P]>
}

export const isEmpty = (value: object | any[]) =>
    deepEquals(value, {}) || deepEquals(value, [])

export type WithOptionalKeys<T extends object, Keys extends keyof T> = Omit<
    T,
    Keys
> &
    { [K in Keys]?: T[K] }

export type WithOptionalValues<
    T extends object,
    OptionalValueType,
    InvertExtendsCheck extends boolean = false
> = ExcludeByValue<T, OptionalValueType, InvertExtendsCheck> &
    Partial<FilterByValue<T, OptionalValueType, InvertExtendsCheck>>

export type WithRequiredKeys<T extends object, Keys extends keyof T> = Omit<
    T,
    Keys
> &
    { [K in Keys]-?: T[K] }

export type WithRequiredValues<
    T extends object,
    RequiredValueType,
    InvertExtendsCheck extends boolean = false
> = T &
    Required<
        FilterByValue<T, RequiredValueType | undefined, InvertExtendsCheck>
    >

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? T[P] : DeepPartial<T[P]>
}

export type Writeable<T> = { -readonly [P in keyof T]: T[P] }
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }

export type ValueOf<T> = T[keyof T]
export type EntryOf<T> = { [K in keyof T]: [K, T[K]] }[keyof T]
export type ValueFrom<T, K extends keyof T> = Pick<T, K>[K]

export type Primitive = string | number | boolean | symbol | bigint
export type NonObject = Primitive | null | undefined
export type NonRecursible = NonObject | Function
export type Unpromisified<T> = T extends Promise<infer U> ? U : never

export const isRecursible = (o: any) => o && typeof o === "object"

export const asserted = <T>(value: T, description?: string) => {
    if (!value) {
        throw Error(`'${value}' is not allowed as a ${description ?? "value"}.`)
    }
    return value as NonNullable<T>
}

export type DeepMapContext = {
    path: string[]
}

export type EntryChecker = (entry: Entry, context: DeepMapContext) => boolean

export type EntryMapper = (entry: Entry, context: DeepMapContext) => Entry

export type DeepMapOptions = {
    recurseWhen?: EntryChecker
    filterWhen?: EntryChecker
}

export const deepMap = <T>(
    from: T,
    map: EntryMapper,
    { recurseWhen, filterWhen }: DeepMapOptions = {}
): T => {
    const recurse = (currentFrom: any, { path }: DeepMapContext): any =>
        fromEntries(
            Object.entries(currentFrom).reduce((mappedEntries, [k, v]) => {
                const contextForKey = {
                    path: path.concat(k)
                }
                if (filterWhen && filterWhen([k, v], contextForKey)) {
                    return mappedEntries
                }
                const shouldRecurse =
                    isRecursible(v) &&
                    (!recurseWhen || recurseWhen([k, v], contextForKey))
                return [
                    ...mappedEntries,
                    map(
                        [k, shouldRecurse ? recurse(v, contextForKey) : v],
                        contextForKey
                    )
                ]
            }, [] as Entry[]),
            Array.isArray(currentFrom)
        )
    return recurse(from, { path: [] })
}

export type PathMap = { [key: string]: PathMap }

export const mapPaths = (paths: string[][]) => {
    const recurse = (fragment: PathMap, path: string[]): PathMap => {
        if (!path.length) {
            return fragment
        }
        const [segment, ...remainingPath] = path
        if (!fragment[segment]) {
            fragment[segment] = {}
        }
        return {
            ...fragment,
            [segment]: recurse(fragment[segment], remainingPath)
        }
    }
    return paths.reduce(
        (finalMap, path) => recurse(finalMap, path),
        {} as PathMap
    )
}

export const transform = <O extends object, MapReturnType extends Entry>(
    o: O,
    map: MapFunction<EntryOf<O>, MapReturnType>
) => {
    if (!o || typeof o !== "object") {
        throw new Error(`Can only transform objects. Received: ${o}.`)
    }
    return fromEntries(Object.entries(o).map(map as any)) as {
        [K in MapReturnType[0]]: MapReturnType[1]
    }
}

export type ItemOrList<T> = T | T[]
export type Unlisted<T> = T extends (infer V)[] ? V : T
export type FlatUnlisted<T> = T extends (infer V)[] ? FlatUnlisted<V> : T
export type DeepUnlisted<T> = T extends object
    ? { [K in keyof T]: DeepUnlisted<FlatUnlisted<T[K]>> }
    : T
export type AsListIf<T, Condition extends boolean> = Condition extends true
    ? T[]
    : T
export type IfList<T, IfList, IfNotList> = T extends any[] ? IfList : IfNotList
export type IsList<T> = IfList<T, true, false>

export type ExtendsCheck<
    A,
    B,
    Invert extends boolean = false,
    ValueIfTrue = true,
    ValueIfFalse = false
> = (Invert extends true ? B : A) extends (Invert extends true ? A : B)
    ? ValueIfTrue
    : ValueIfFalse

export type FilterByValue<
    T extends object,
    ValueType,
    InvertExtendsCheck extends boolean = false
> = Pick<
    T,
    {
        [K in keyof T]: ExtendsCheck<
            T[K],
            ValueType,
            InvertExtendsCheck,
            K,
            never
        >
    }[keyof T]
>
export type ExcludeByValue<
    T extends object,
    ValueType,
    InvertExtendsCheck extends boolean = false
> = Pick<
    T,
    {
        [K in keyof T]: ExtendsCheck<
            T[K],
            ValueType,
            InvertExtendsCheck,
            never,
            K
        >
    }[keyof T]
>

export type OptionalOnly<T extends object> = Pick<
    T,
    {
        [K in keyof T]: undefined extends T[K] ? K : never
    }[keyof T]
>

export type WithOptionalUndefineds<T extends object> = WithOptionalValues<
    T,
    undefined,
    true
>

export const listify = <T>(o: ItemOrList<T>) => ([] as T[]).concat(o)

export type Key = string | number | symbol
export type Entry = [Key, any]
export type MapFunction<T, ReturnType> = (
    ..._: Parameters<Parameters<Array<T>["map"]>[0]>
) => ReturnType

export const fromEntries = (entries: Entry[], asArray = false) => {
    const obj: any = asArray ? [] : {}
    entries.forEach(([k, v]) => (obj[k] = v))
    return obj
}

export type SplitResult<T> = [T[], T[]]

export const split = <T>(list: T[], by: (item: T) => boolean) =>
    list.reduce(
        (sorted, item) =>
            (by(item)
                ? [[...sorted[0], item], sorted[1]]
                : [sorted[0], [...sorted[1], item]]) as SplitResult<T>,
        [[], []] as SplitResult<T>
    )

export type FilterUp<T, UpfilteredKey> = {
    [K in keyof T]: T[K] extends NonRecursible
        ? T[K]
        : Array<any> extends T[K]
        ?
              | Array<
                    FilterUp<
                        UpfilteredKey extends keyof Exclude<
                            Unlisted<T[K]>,
                            NonRecursible
                        >
                            ? Exclude<
                                  Unlisted<T[K]>,
                                  NonRecursible
                              >[UpfilteredKey]
                            : Exclude<Unlisted<T[K]>, NonRecursible>,
                        UpfilteredKey
                    >
                >
              | Extract<T[K], NonRecursible>
        :
              | FilterUp<
                    UpfilteredKey extends keyof Exclude<T[K], NonRecursible>
                        ? Exclude<T[K], NonRecursible>[UpfilteredKey]
                        : Exclude<T[K], NonRecursible>,
                    UpfilteredKey
                >
              | Extract<T[K], NonRecursible>
}

export const withDefaults =
    <T extends Record<string, any>>(defaults: Required<OptionalOnly<T>>) =>
    (provided: T | undefined) => {
        return { ...defaults, ...provided }
    }

export type LimitDepth<
    O,
    MaxDepth extends number,
    OnMaxDepth = any
> = MaxDepth extends 0
    ? OnMaxDepth
    : {
          [K in keyof O]: O[K] extends NonRecursible
              ? O[K]
              : LimitDepth<
                    O[K],
                    O[K] extends any[] ? MaxDepth : MinusOne<MaxDepth>,
                    OnMaxDepth
                >
      }

export type AsListIfList<AsList, IfList> = IfList extends any[]
    ? AsList extends any[]
        ? AsList
        : AsList[]
    : AsList

export type NonCyclic<O, OnCycle = any, Seen = never> = O extends Seen
    ? OnCycle
    : {
          [K in keyof O]: O[K] extends NonRecursible
              ? O[K]
              : NonCyclic<O[K], OnCycle, Seen | O>
      }

export type MinusOne<N extends number> = Number.Sub<N, 1>

export type And<A extends boolean, B extends boolean> = {
    true: {
        true: true
        false: false
    }
    false: {
        true: false
        false: false
    }
}[`${A}`][`${B}`]

export type Or<A extends boolean, B extends boolean> = {
    true: {
        true: true
        false: true
    }
    false: {
        true: true
        false: false
    }
}[`${A}`][`${B}`]

export type Not<A extends boolean> = {
    true: false
    false: true
}[`${A}`]

export type If<
    Condition extends boolean,
    ValueIfTrue,
    ValueIfFalse
> = Condition extends true ? ValueIfTrue : ValueIfFalse

export type IfExtends<T, CheckIfExtended, ValueIfTrue, ValueIfFalse> =
    T extends CheckIfExtended ? ValueIfTrue : ValueIfFalse

export type Cast<A, B> = A extends B ? A : B

type NarrowRecurse<T> =
    | (T extends [] ? [] : never)
    | (T extends Narrowable ? T : never)
    | {
          [K in keyof T]: T[K] extends Function ? T[K] : Narrow<T[K]>
      }

type NarrowRoot<T, Narrowed = NarrowRecurse<T>> = Narrowed | Cast<T, Narrowed>

type Narrowable = string | number | bigint | boolean

export type Narrow<T> = NarrowRoot<T>

export type KeyValuate<T, K, Fallback = undefined> = K extends keyof T
    ? T[K]
    : Fallback

const TypeErrorTag: unique symbol = Symbol("TypeErrorTag")

export type TypeError<Message> = {
    [x in keyof Message | typeof TypeErrorTag]: x extends keyof Message
        ? Message[x & keyof Message]
        : { readonly [TypeErrorTag]: unique symbol }
}
