import moize from "moize"
import {
    Number as NumberToolbelt,
    Union as ToolbeltUnion,
    List as ToolbeltList,
    String as ToolbeltString
} from "ts-toolbelt"
import { Merge } from "./merge.js"
import { transform } from "./transform.js"

export const memoize = moize as <F extends SimpleFunction>(f: F) => F

export type StringReplace<
    Original extends string,
    Find extends string,
    ReplaceWith extends string
> = ToolbeltString.Replace<Original, Find, ReplaceWith>

export type RemoveSpaces<FromString extends string> = StringReplace<
    FromString,
    " ",
    ""
>

export type StringifyOptions = {
    indent?: number
}

export const stringify = (value: any) => {
    const recurse = (value: any, seen: any[]): string => {
        if (!isRecursible(value)) {
            return String(value)
        }
        if (seen.includes(value)) {
            return "(cyclic value)"
        }
        if (Array.isArray(value)) {
            return `[${value
                .map((v) => recurse(v, [...seen, value]))
                .join(", ")}]`
        }
        return `{${Object.entries(value)
            .map(([k, v]) => `${k}: ${recurse(v, [...seen, value])}`)
            .join(", ")}}`
    }
    return recurse(value, [])
}

export type UntilOptions = {
    timeoutSeconds?: number
    intervalSeconds?: number
}

export const sleep = async (seconds: number) =>
    new Promise<void>((resolve) => setTimeout(() => resolve(), seconds * 1000))

export const until = async (
    condition: () => boolean,
    { timeoutSeconds = 10, intervalSeconds = 0.1 }: UntilOptions = {}
) => {
    const timesOutAt = Date.now() + timeoutSeconds * 1000
    while (!condition()) {
        if (Date.now() >= timesOutAt) {
            throw new Error(
                `Timed out waiting for condition after ${timeoutSeconds} seconds.`
            )
        }
        await sleep(intervalSeconds)
    }
    return
}

export type Evaluate<T> = T extends NonRecursible
    ? T
    : {
          [K in keyof T]: T[K]
      }

export type MapReturn<F, V> = F extends (value: V) => infer R ? R : any

export const isIn = (list: any[], value: any) => list.includes(value)

export type Class<T> = new (...args: any[]) => T

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends NonRecursible
        ? Required<T[P]>
        : DeepRequired<T[P]>
}

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
    {
        [K in Keys]-?: T[K]
    }

export type WithRequiredKeysIfPresent<T, K> = WithRequiredKeys<
    T & object,
    K & keyof T
>

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

export type PropertyOf<T> = T[keyof T]
export type ElementOf<T extends any[]> = T[number]

export type EntryOf<T> = { [K in keyof T]: [K, T[K]] }[T extends any[]
    ? keyof T & number
    : keyof T]

export type SimpleFunction = (...args: any[]) => any
export type Primitive = string | number | boolean | symbol | bigint
export type NonObject = Primitive | null | undefined | void

export type NonRecursible = NonObject | SimpleFunction
export type Unpromisified<T> = T extends Promise<infer U> ? U : never

export const isRecursible = (o: any) => o && typeof o === "object"

export const isEmpty = (value: object | any[]) => {
    if (!isRecursible(value)) {
        throw new Error(
            `isEmpty required an object. Received ${stringify(value)}`
        )
    }
    return isRecursible(value) ? !Object.keys(value).length : false
}

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

export type GetRequiredKeys<O extends object> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? never : K
}[keyof O]

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

export type TransformCyclic<
    O,
    ValueOnCycle = any,
    Seen = never
> = O extends Seen
    ? ValueOnCycle
    : {
          [K in keyof O]: O[K] extends NonRecursible
              ? O[K]
              : TransformCyclic<O[K], ValueOnCycle, Seen | O>
      }

export type ExcludeCyclic<
    O extends object,
    Seen = Unlisted<O> | Unlisted<O>[]
> = {
    [K in keyof ExcludeByValue<O, Seen>]: O[K] extends NonRecursible
        ? O[K]
        : ExcludeCyclic<O[K], Seen | Unlisted<O[K]> | Unlisted<O[K]>[]>
}

export type MinusOne<N extends number> = NumberToolbelt.Sub<N, 1>

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

export type IsAnyOrUnknown<T> = (any extends T ? true : false) extends true
    ? true
    : false

export type IsAny<T> = (any extends T ? AnyIsAny<T> : false) extends true
    ? true
    : false

export type IsUnknown<T> = (
    any extends T ? AnyIsUnknown<T> : false
) extends true
    ? true
    : false

type AnyIsAny<T> = (T extends {} ? true : false) extends false ? false : true

type AnyIsUnknown<T> = (T extends {} ? true : false) extends false
    ? true
    : false

export type KeyValuate<T, K, Fallback = undefined> = K extends keyof T
    ? T[K]
    : Fallback

export type TypeError<Description extends string> = Description

export type Entry<K extends Key = Key, V = any> = [K, V]

export type Recursible<T> = T extends NonRecursible ? never : T

type ListPossibleTypesRecurse<
    U,
    LN extends any[] = [],
    LastU = ToolbeltUnion.Last<U>
> = {
    0: ListPossibleTypesRecurse<
        Exclude<U, LastU>,
        ToolbeltList.Prepend<LN, LastU>
    >
    1: LN
}[[U] extends [never] ? 1 : 0]

export type ListPossibleTypes<U> = ListPossibleTypesRecurse<U> extends infer X
    ? Cast<X, any[]>
    : never

export type StringifyPossibleTypes<U extends Stringifiable> = Join<
    ListPossibleTypes<U>,
    ", "
>

export type Join<
    Segments extends Stringifiable[],
    Delimiter extends string = DefaultDelimiter
> = Segments extends []
    ? ""
    : Segments extends [Stringifiable]
    ? `${Segments[0]}`
    : Segments extends [Stringifiable, ...infer Remaining]
    ? `${Segments[0]}${Delimiter}${Join<
          Remaining extends Stringifiable[] ? Remaining : never,
          Delimiter
      >}`
    : never

export type Segment = string | number

export type DefaultDelimiter = "/"

export type StringifyKeys<O> = StringifyPossibleTypes<
    O extends any[] ? keyof O & number : keyof O & string
>

export type Stringifiable =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

export type ExtractFunction<T> = Extract<T, SimpleFunction>

export type ExactFunction<T, ExpectedType> = T extends ExpectedType
    ? ExtractFunction<T> extends (...args: infer Args) => infer Return
        ? ExtractFunction<ExpectedType> extends (
              ...args: infer ExpectedArgs
          ) => infer ExpectedReturn
            ? (
                  ...args: Exact<Args, ExpectedArgs>
              ) => Exact<Return, ExpectedReturn>
            : ExpectedType
        : ExpectedType
    : ExpectedType

export type Exact<T, ExpectedType> = IsAnyOrUnknown<T> extends true
    ? ExpectedType
    : T extends ExpectedType
    ? T extends NonObject
        ? T
        : {
              [K in keyof T]: K extends keyof Recursible<ExpectedType>
                  ? Exact<T[K], Recursible<ExpectedType>[K]>
                  : TypeError<`Invalid property '${Extract<
                        K,
                        string | number
                    >}'. Valid properties are: ${StringifyKeys<ExpectedType>}`>
          }
    : ExpectedType

export type Iteration<T, Current extends T, Remaining extends T[]> = [
    Current,
    ...Remaining
]

export type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends Iteration<Entry, infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

export type CastWithExclusion<T, CastTo, Excluded> = T extends Excluded
    ? T
    : CastTo

export type TreeOf<T, KeyType extends Key = string> =
    | T
    | {
          [K in KeyType]: TreeOf<T, KeyType>
      }

export type DeepTreeOf<T, KeyType extends Key = string> = {
    [K in KeyType]: TreeOf<T, KeyType>
}
