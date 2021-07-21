import { FlatUnlisted, NonRecursible } from "./common.js"
import { Object, String, List } from "ts-toolbelt"
import { AutoPath } from "./AutoPath.js"

export type ValueAtPath<
    O extends object,
    P extends string,
    Delimiter extends string = "/"
> = Object.Path<O, String.Split<P, Delimiter>>

export function valueAtPath<O extends object, P extends string>(
    obj: O,
    path: AutoPath<O, P, "/">
): ValueAtPath<O, P> {
    const segments = path.split("/")
    let value = obj
    for (let segment of segments) {
        if (typeof value === "object" && segment in value) {
            value = (value as any)[segment]
        } else {
            // This should never happen if the provided types are accurate
            return undefined as any
        }
    }
    return value as any
}

export type Fallback<Value, Default> = unknown extends Value ? Default : Value

type Prev = [
    never,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    ...0[]
]

export type Segment = string | number

export type DefaultDelimiter = "/"
export type DefaultDepthLimit = 10

export type PathConstraints = {
    filter?: any
    exclude?: any
    treatAsLeaf?: any
    includeArrayIndices?: boolean
}

export type LeafLists<
    T,
    Constraints extends PathConstraints = {},
    Depth extends number = DefaultDepthLimit
> = Extract<
    {
        [K in keyof T]-?: T[K] extends
            | NonRecursible
            | Fallback<Constraints["treatAsLeaf"], never>
            ? T[K] extends Fallback<Constraints["exclude"], never>
                ? never
                : T[K] extends Fallback<Constraints["filter"], any>
                ? [K]
                : never
            : [
                  K,
                  ...LeafLists<
                      Fallback<
                          Constraints["includeArrayIndices"],
                          true
                      > extends true
                          ? T[K]
                          : FlatUnlisted<T[K]>,
                      Constraints,
                      Prev[Depth]
                  >
              ]
    }[keyof T],
    Segment[]
>

export type Join<
    Segments extends Segment[],
    Delimiter extends string = DefaultDelimiter
> = Segments extends []
    ? ""
    : Segments extends [Segment]
    ? `${Segments[0]}`
    : Segments extends [Segment, ...infer Remaining]
    ? `${Segments[0]}${Delimiter}${Join<
          Remaining extends Segment[] ? Remaining : never,
          Delimiter
      >}`
    : string

export type Leaves<
    T,
    Constraints extends PathConstraints = {},
    Delimiter extends string = DefaultDelimiter,
    Depth extends number = DefaultDepthLimit
> = Join<LeafLists<T, Constraints, Depth>, Delimiter>

type PathListsFromLeafLists<Segments extends Segment[]> = Segments extends []
    ? never
    :
          | Segments
          | (Segments extends [Segment, ...infer Remaining]
                ? PathListsFromLeafLists<
                      Remaining extends Segment[] ? Remaining : never
                  >
                : never)

export type PathLists<
    T,
    Constraints extends PathConstraints = {},
    Depth extends number = DefaultDepthLimit
> = PathListsFromLeafLists<LeafLists<T, Constraints, Depth>>

export type Paths<
    T,
    Constraints extends PathConstraints = {},
    Delimiter extends string = DefaultDelimiter,
    Depth extends number = DefaultDepthLimit
> = Join<PathLists<T, Constraints, Depth>, Delimiter>

// export const x = <
//     T extends object,
//     SomePaths extends Paths<T, { filter: boolean }>
// >(
//     o: T,
//     f: SomePaths
// ) => "" as any

// x({ a: { b: "", c: true } }, "a/c")
