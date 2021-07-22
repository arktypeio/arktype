import {
    FlatUnlisted,
    isRecursible,
    MinusOne,
    NonRecursible,
    withDefaults
} from "./common.js"
import { String } from "ts-toolbelt"

export type ValueAtPath<
    O,
    Path extends Paths<
        O,
        { excludeArrayIndices: ExcludeArrayIndices },
        Delimiter
    >,
    Delimiter extends string = "/",
    ExcludeArrayIndices extends boolean = false
> = ValueAtPathList<O, String.Split<Path, Delimiter>, ExcludeArrayIndices>

export type ValueAtPathList<
    O,
    Segments extends Segment[],
    ExcludeArrayIndices extends boolean = false
> = Segments extends [infer Current, ...infer Remaining]
    ? Current extends keyof O
        ? ValueAtPathList<
              ExcludeArrayIndices extends true
                  ? FlatUnlisted<O[Current]>
                  : O[Current],
              Remaining extends Segment[] ? Remaining : never,
              ExcludeArrayIndices
          >
        : undefined
    : O

export type ValueAtPathOptions<
    Delimiter extends string,
    ExcludeArrayIndices extends boolean
> = {
    delimiter?: Delimiter
    excludeArrayIndices?: ExcludeArrayIndices
}

export const valueAtPath = <
    O,
    Path extends Paths<
        O,
        { excludeArrayIndices: ExcludeArrayIndices },
        Delimiter
    >,
    Delimiter extends string = "/",
    ExcludeArrayIndices extends boolean = false
>(
    o: O,
    path: Path,
    options: ValueAtPathOptions<Delimiter, ExcludeArrayIndices> = {}
): ValueAtPath<O, Path, Delimiter, ExcludeArrayIndices> => {
    const { delimiter, excludeArrayIndices } = withDefaults<
        ValueAtPathOptions<string, boolean>
    >({
        delimiter: "/",
        excludeArrayIndices: false
    })(options as any)
    if (Array.isArray(o) && excludeArrayIndices) {
        return o.map((_) =>
            // @ts-ignore
            valueAtPath(_, path, options)
        ) as any
    }
    if (path === "") {
        return o as any
    }
    const [segment, ...remaining] = path.split(delimiter)
    if (isRecursible(o) && segment in o) {
        // @ts-ignore
        return valueAtPath(
            (o as any)[segment],
            remaining.join(delimiter),
            options
        )
    } else {
        return undefined as any
    }
}

export type Fallback<Value, Default> = unknown extends Value ? Default : Value

export type Segment = string | number

export type DefaultDelimiter = "/"
export type DefaultDepthLimit = 10

export type PathConstraints = {
    filter?: any
    exclude?: any
    treatAsLeaf?: any
    excludeArrayIndices?: boolean
}

export type LeafLists<
    T,
    Constraints extends PathConstraints = {},
    Depth extends number = DefaultDepthLimit
> = Depth extends 0
    ? never
    : Extract<
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
                                Constraints["excludeArrayIndices"],
                                false
                            > extends true
                                ? FlatUnlisted<T[K]>
                                : T[K],
                            Constraints,
                            MinusOne<Depth>
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
          | (Segments extends [...infer Remaining, Segment]
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
