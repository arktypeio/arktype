import {
    FlatUnlisted,
    isRecursible,
    MinusOne,
    NonCyclic,
    NonRecursible,
    withDefaults
} from "./common.js"
import { String } from "ts-toolbelt"

export type ValueAtPath<
    O,
    P extends PathOf<
        O,
        { excludeArrayIndices: ExcludeArrayIndices; delimiter: Delimiter }
    >,
    Delimiter extends string = "/",
    ExcludeArrayIndices extends boolean = false
> = ValueAtPathList<O, String.Split<P, Delimiter>, ExcludeArrayIndices>

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
    P extends PathOf<
        O,
        { excludeArrayIndices: ExcludeArrayIndices; delimiter: Delimiter }
    >,
    Delimiter extends string = "/",
    ExcludeArrayIndices extends boolean = false
>(
    o: O,
    path: P,
    options: ValueAtPathOptions<Delimiter, ExcludeArrayIndices> = {}
): ValueAtPath<O, P, Delimiter, ExcludeArrayIndices> => {
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
    // @ts-ignore
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
export type EnsureValue<Value, Default> = NonNullable<Fallback<Value, Default>>

export type Segment = string | number

export type DefaultDelimiter = "/"

export type PathConstraints = {
    filter?: any
    exclude?: any
    treatAsLeaf?: any
    excludeArrayIndices?: boolean
    maxDepth?: number
}

export type StringPathConstraints = PathConstraints & {
    delimiter?: string
}

export type LeafListOf<
    T,
    Constraints extends PathConstraints = {}
> = LeafListOfRecurse<
    T,
    Constraints,
    EnsureValue<Constraints["maxDepth"], 10>,
    never
>

type LeafListOfRecurse<
    T,
    Constraints extends PathConstraints,
    DepthRemaining extends number,
    Seen
> = DepthRemaining extends 0
    ? never
    : T extends Seen
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
                        ...LeafListOfRecurse<
                            Fallback<
                                Constraints["excludeArrayIndices"],
                                false
                            > extends true
                                ? FlatUnlisted<T[K]>
                                : T[K],
                            Constraints,
                            MinusOne<DepthRemaining>,
                            Seen | (T extends any[] ? never : T)
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
    : never

export type LeafOf<T, Constraints extends StringPathConstraints = {}> = Join<
    LeafListOf<T, Constraints>,
    EnsureValue<Constraints["delimiter"], DefaultDelimiter>
>

type PathListFromLeafList<Segments extends Segment[]> = Segments extends []
    ? never
    :
          | Segments
          | (Segments extends [...infer Remaining, Segment]
                ? PathListFromLeafList<
                      Remaining extends Segment[] ? Remaining : never
                  >
                : never)

export type PathListOf<
    T,
    Constraints extends PathConstraints = {}
> = PathListFromLeafList<LeafListOf<T, Constraints>>

export type PathOf<T, Constraints extends StringPathConstraints = {}> = Join<
    PathListOf<T, Constraints>,
    EnsureValue<Constraints["delimiter"], DefaultDelimiter>
>

export type PathTo<
    T,
    To,
    Constraints extends Omit<
        StringPathConstraints,
        "filter" | "treatAsLeaf"
    > = {}
> = LeafOf<T, { filter: To; treatAsLeaf: To } & Constraints>
