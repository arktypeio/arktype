import { toString } from "./toString.js"

export const sleep = async (seconds: number) =>
    await new Promise<void>((resolve) =>
        setTimeout(() => resolve(), seconds * 1000)
    )

export type UntilOptions = {
    timeoutSeconds?: number
    intervalSeconds?: number
}

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

export type DeepEvaluate<T> = T extends NonRecursible
    ? T
    : {
          [K in keyof T]: DeepEvaluate<T[K]>
      } & unknown

/**
 * Note: Similarly to Narrow, trying to Evaluate 'unknown'
 * directly (i.e. not nested in an object) leads to the type '{}',
 * but I'm unsure how to fix this without breaking the types that rely on it.
 *
 */

export type Evaluate<T> = {
    [K in keyof T]: T[K]
} & unknown

export type EvaluateFunction<F> = F extends Function ? F : never

export type WithPropValue<Obj, Prop extends string | number, Value> = Evaluate<
    Omit<Obj, Prop> & { [K in Prop]: Value }
>

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends NonRecursible ? T[P] : DeepPartial<T[P]>
}

const typeOfResult = typeof ({} as unknown)

export type TypeOfResult = typeof typeOfResult

export type PropertyOf<T> = T[keyof T]
export type ElementOf<T extends List> = T extends List<infer Item>
    ? Item
    : never

export type ValueOf<T> = T extends List<infer Item> ? Item : T[keyof T]

export type Entry<K extends Key = Key, V = unknown> = [K, V]

export type Entries<K extends Key = Key, V = unknown> = Entry<K, V>[]

export type EntryOf<T> = { [K in keyof T]: [K, T[K]] }[T extends unknown[]
    ? keyof T & number
    : keyof T]

export type EntriesOf<T> = EntryOf<T>[]

export type Fn<Parameters extends any[] = any[], ReturnType = unknown> = (
    ...args: Parameters
) => ReturnType

export type Primitive = string | number | boolean | symbol | bigint
export type NonObject = Primitive | null | undefined | void
export type NonRecursible = NonObject | Fn

export const isRecursible = <O>(
    o: O
): o is Recursible<O> & (List | Record<Key, any>) =>
    !!o && typeof o === "object"

export const isEmpty = (value: object) => {
    if (!isRecursible(value)) {
        throw new Error(
            `isEmpty requires an object. Received ${toString(value)}`
        )
    }
    return isRecursible(value) ? !Object.keys(value).length : false
}

/** Either:
 * First, with all properties of Second as undefined
 * OR
 * Second, with all properties of First as undefined
 **/
export type MutuallyExclusiveProps<First, Second> =
    | (First & { [K in keyof Second]: undefined })
    | (Second & { [K in keyof First]: undefined })

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

export type FilterFunction<T> = (
    value: T,
    index: number,
    context: T[]
) => boolean

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
    : ValueOf<{
          [K in keyof Obj]: LeafOf<Obj[K], LeafType>
      }>

export type NeverEmptyObject<T> = {} extends T ? never : T

export type ExcludeNever<O> = Pick<
    O,
    { [K in keyof O]: O[K] extends never ? never : K }[keyof O]
>

export type Key = string | number | symbol

export type MapFunction<T, ReturnType> = (
    ..._: Parameters<Parameters<Array<T>["map"]>[0]>
) => ReturnType

export const fromEntries = (entries: Entry[], asArray = false) => {
    const obj: any = asArray ? [] : {}
    for (const [k, v] of entries) {
        obj[k] = v
    }
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

// @ts-ignore
export type Get<T, K> = T[K]

// @ts-ignore
export type GetAs<T, K, Cast> = T[K] & Cast

export type List<T = unknown> = T[] | readonly T[]

export type Recursible<T> = T extends NonRecursible ? never : T

export type GetRequiredKeys<O> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? never : K
}[keyof O]

export type GetOptionalKeys<O> = {
    [K in keyof O]-?: {} extends Pick<O, K> ? K : never
}[keyof O]

export type RequireKeys<O, KeysToMakeRequired extends keyof O> = O & {
    [K in KeysToMakeRequired]-?: Exclude<O[K], undefined>
}

export type OptionalizeKeys<O, KeysToMakeOptional extends keyof O> = Omit<
    O,
    KeysToMakeOptional
> & {
    [K in KeysToMakeOptional]-?: O[K]
}

type GetLastUnionMember<T> = IntersectOf<
    T extends unknown ? (x: T) => void : never
> extends (x: infer Last) => void
    ? Last
    : never

export type ListPossibleTypesRecurse<
    Union,
    Result extends unknown[] = [],
    Current = GetLastUnionMember<Union>
> = {
    0: ListPossibleTypesRecurse<Exclude<Union, Current>, [Current, ...Result]>
    1: Result
}[[Union] extends [never] ? 1 : 0]

export type ListPossibleTypes<Union> =
    ListPossibleTypesRecurse<Union> extends infer X ? Cast<X, Union[]> : never

export type Stringifiable =
    | string
    | number
    | bigint
    | boolean
    | null
    | undefined

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

export type TreeOf<T> = T | DeepTreeOf<T>

export type DeepTreeOf<T> =
    | {
          [K in string]: TreeOf<T>
      }
    | TreeOf<T>[]

export type IncludesSubstring<
    S extends string,
    Substring extends string
> = S extends `${string}${Substring}${string}` ? true : false
