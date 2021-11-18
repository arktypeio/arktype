import moize from "moize"
import {
    Number as NumberToolbelt,
    Union as ToolbeltUnion,
    List as ToolbeltList
} from "ts-toolbelt"
import { WithDefaults } from "./merge.js"

export const memoize = moize

export type StringReplace<
    Original extends string,
    Find extends string,
    ReplaceWith extends string
> = Original extends `${infer Left}${Find}${infer Right}`
    ? StringReplace<`${Left}${ReplaceWith}${Right}`, Find, ReplaceWith>
    : Original

export type Split<
    S extends string,
    Delimiter extends string,
    Result extends string[] = []
> = S extends `${infer Left}${Delimiter}${infer Right}`
    ? Split<Right, Delimiter, [...Result, Left]>
    : [...Result, S]

export type Join<
    Segments extends Stringifiable[],
    Delimiter extends string = DefaultDelimiter,
    Result extends string = ""
> = Segments extends Iteration<Stringifiable, infer Segment, infer Remaining>
    ? Join<
          Remaining,
          Delimiter,
          `${Result}${Result extends "" ? "" : Delimiter}${Segment}`
      >
    : Result

export type RemoveSpaces<FromString extends string> = StringReplace<
    FromString,
    " ",
    ""
>

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

export type DeepEvaluate<T, Depth extends number = -1> = T extends NonRecursible
    ? T
    : Depth extends 0
    ? T
    : {
          [K in keyof T]: DeepEvaluate<T[K], MinusOne<Depth>>
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
> = ExcludeByValue<
    T,
    OptionalValueType,
    { invertExtendsCheck: InvertExtendsCheck }
> &
    Partial<
        FilterByValue<
            T,
            OptionalValueType,
            { invertExtendsCheck: InvertExtendsCheck }
        >
    >

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
        FilterByValue<
            T,
            RequiredValueType | undefined,
            { invertExtendsCheck: InvertExtendsCheck }
        >
    >

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? T[P] : DeepPartial<T[P]>
}

export type Writeable<T> = { -readonly [P in keyof T]: T[P] }
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }

export type WithReadonlyKeys<Obj, Keys extends keyof Obj> = Omit<Obj, Keys> &
    {
        readonly [K in Keys]: Obj[K]
    }

export type WithWriteableKeys<Obj, Keys extends keyof Obj> = Omit<Obj, Keys> &
    {
        -readonly [K in Keys]: Obj[K]
    }

export type PropertyOf<T> = T[keyof T]
export type ElementOf<T extends List> = T[number]
export type ValueOf<T> = T extends NonRecursible
    ? never
    : T extends any[]
    ? T[number]
    : T[keyof T]

export type EntryOf<T> = { [K in keyof T]: [K, T[K]] }[T extends any[]
    ? keyof T & number
    : keyof T]

export type Func<Parameters extends any[] = any[], ReturnType = any> = (
    ...args: Parameters
) => ReturnType

export type Primitive = string | number | boolean | symbol | bigint
export type NonObject = Primitive | null | undefined | void

export type NonRecursible = NonObject | Func
export type Unpromisified<T> = T extends Promise<infer U> ? U : never

export const isRecursible = <O>(
    o: O
): o is Recursible<O> & (List | Record<Key, any>) =>
    !!o && typeof o === "object"

export const isEmpty = (value: object | any[]) => {
    if (!isRecursible(value)) {
        throw new Error(`isEmpty required an object. Received ${String(value)}`)
    }
    return isRecursible(value) ? !Object.keys(value).length : false
}

export const asserted = <T>(value: T, description?: string) => {
    if (!value) {
        throw Error(`'${value}' is not allowed as a ${description ?? "value"}.`)
    }
    return value as NonNullable<T>
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
export type IfList<T, IfList, IfNotList> = T extends List ? IfList : IfNotList
export type IsList<T> = IfList<T, true, false>

export type GetRequiredKeys<O extends object> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? never : K
}[keyof O]

export type ExtendsCheck<
    A,
    B,
    Invert extends boolean = false,
    ValueIfTrue = true,
    ValueIfFalse = false,
    ReferenceType = Invert extends true ? A : B,
    TypeToCheck = Invert extends true ? B : A
> = TypeToCheck extends ReferenceType ? ValueIfTrue : ValueIfFalse

export type ExcludeByValueOptions = {
    deep?: boolean
    invertExtendsCheck?: boolean
}

export type FilterByValueOptions = ExcludeByValueOptions & {
    replaceWith?: any
}

type FilterRecurseOptions = FilterByValueOptions & {
    invertResult?: boolean
}

export type IntersectOf<U> = (
    U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never

export type IntersectProps<O> = IntersectOf<O[keyof O]>

export type LeafOf<Obj, LeafType = NonRecursible> = Obj extends LeafType
    ? Obj
    : Obj extends NonRecursible
    ? never
    : {
          [K in keyof Obj]: LeafOf<Obj[K], LeafType>
      }[keyof Obj]

export type NeverEmptyObject<T> = {} extends T ? never : T

export type ExcludeNever<O> = Pick<
    O,
    { [K in keyof O]: O[K] extends never ? never : K }[keyof O]
>

export type FilterObjectByValue<
    T,
    ValueType,
    Options extends Required<FilterRecurseOptions>
> = ExcludeNever<
    {
        [K in keyof T]: NeverEmptyObject<
            FilterPropertyByValue<T[K], ValueType, Options>
        >
    }
>

export type FilterPropertyByValue<
    T,
    ValueType,
    Options extends Required<FilterRecurseOptions>,
    ReturnOnMatch = Options["replaceWith"] extends never
        ? T
        : Options["replaceWith"]
> = ExtendsCheck<T, ValueType, Options["invertExtendsCheck"]> extends true
    ? Options["invertResult"] extends true
        ? never
        : ReturnOnMatch
    : And<
          Options["deep"],
          Not<T extends NonRecursible ? true : false>
      > extends true
    ? FilterObjectByValue<T, ValueType, Options>
    : Options["invertResult"] extends true
    ? ReturnOnMatch
    : never

export type FilterByValue<
    T,
    ValueType,
    ProvidedOptions extends FilterByValueOptions = {},
    Options extends Required<FilterRecurseOptions> = WithDefaults<
        FilterRecurseOptions,
        ProvidedOptions,
        {
            deep: false
            invertExtendsCheck: false
            invertResult: false
            replaceWith: never
        }
    >
> = FilterObjectByValue<T, ValueType, Options>

export type ExcludeByValue<
    T,
    ValueType,
    ProvidedOptions extends ExcludeByValueOptions = {},
    Options extends Required<FilterRecurseOptions> = {
        deep: ProvidedOptions["deep"] extends true ? true : false
        invertExtendsCheck: ProvidedOptions["invertExtendsCheck"] extends true
            ? true
            : false
        replaceWith: never
        invertResult: true
    }
> = FilterObjectByValue<T, ValueType, Options>

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
        : ExcludeCyclic<O[K] & object, Seen | Unlisted<O[K]> | Unlisted<O[K]>[]>
}

export type Minus<X extends number, Y extends number> = NumberToolbelt.Sub<
    X,
    Y
> &
    number

export type MinusOne<N extends number> = Minus<N, 1> & number

export type Plus<X extends number, Y extends number> = NumberToolbelt.Add<
    X,
    Y
> &
    number

export type PlusOne<N extends number> = Plus<N, 1> & number

export type Max<X extends number, Y extends number> = NumberToolbelt.GreaterEq<
    X,
    Y
> extends 1
    ? X
    : Y

export type Min<X extends number, Y extends number> = Max<X, Y> extends X
    ? Y
    : X

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

export type AnyIsAny<T> = (T extends {} ? true : false) extends false
    ? false
    : true

export type AnyIsUnknown<T> = (T extends {} ? true : false) extends false
    ? true
    : false

export type KeyValuate<T, K, Fallback = undefined> = K extends keyof T
    ? T[K]
    : Fallback

export type TypeError<Description extends string> = Description

export type Entry<K extends Key = Key, V = any> = [K, V]

export type List<T = any> = T[] | readonly T[]

export type Recursible<T> = T extends NonRecursible ? never : T

export type RequiredKeys<O> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? never : K
}[keyof O]

export type OptionalKeys<O> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? K : never
}[keyof O]

export type ListPossibleTypesRecurse<
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

export type Segment = string | number

export type DefaultDelimiter = "/"

export type Stringifiable =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

export type ExtractFunction<T> = Extract<T, Func>

export type Iteration<T, Current extends T, Remaining extends T[]> = [
    Current,
    ...Remaining
]

export type ReverseIteration<T, Remaining extends T[], Current extends T> = [
    ...Remaining,
    Current
]

export type CastWithExclusion<T, CastTo, Excluded> = T extends Excluded
    ? T
    : CastTo

export type TreeOf<T, AllowLists extends boolean = false> =
    | T
    | DeepTreeOf<T, AllowLists>

export type DeepTreeOf<T, AllowLists extends boolean = false> =
    | {
          [K in string]: TreeOf<T, AllowLists>
      }
    | (AllowLists extends true ? TreeOf<T, AllowLists>[] : never)
