import {
    FlatUnlisted,
    IsList,
    isRecursible,
    MinusOne,
    TransformCyclic,
    NonRecursible,
    And,
    Segment,
    Join,
    DefaultDelimiter,
    Cast,
    Split,
    ListPossibleTypes,
    ElementOf,
    PropertyOf,
    Evaluate,
    Stringifiable,
    ValueOf,
    Iteration
} from "./common.js"
import { WithDefaults, withDefaults } from "./merge.js"
import { Narrow } from "./Narrow.js"
import { InvalidPropertyError } from "./Exact.js"

export type ValueAtPath<
    O,
    P extends string,
    Options extends ValueAtPathOptions = {}
> = ValueAtPathList<
    O,
    Split<P, EnsureValue<Options["delimiter"], "/">>,
    EnsureValue<Options["excludeArrayIndices"], false>
>

export type ValueAtPathList<
    O,
    Segments extends Segment[],
    ExcludeArrayIndices extends boolean = false
> = And<ExcludeArrayIndices, IsList<O>> extends true
    ? ValueAtPathList<FlatUnlisted<O>, Segments, ExcludeArrayIndices>[]
    : Segments extends [infer Current, ...infer Remaining]
    ? Current extends keyof O
        ? ValueAtPathList<
              O[Current],
              Remaining extends string[] ? Remaining : never,
              ExcludeArrayIndices
          >
        : undefined
    : O

export type ValueAtPathOptions = {
    delimiter?: string
    excludeArrayIndices?: boolean
}

export const defaultValueAtPathOptions = {
    delimiter: "/",
    excludeArrayIndices: false
} as const

export type DefaultValueAtPathOptions = typeof defaultValueAtPathOptions

const withDefaultValueAtPathOptions = withDefaults<ValueAtPathOptions>(
    defaultValueAtPathOptions
)

export const valueAtPath = <
    O,
    P extends PathOf<O, Options>,
    ProvidedOptions extends ValueAtPathOptions = {},
    Options extends Required<ValueAtPathOptions> = WithDefaults<
        ValueAtPathOptions,
        ProvidedOptions,
        DefaultValueAtPathOptions
    >
>(
    o: O,
    path: P,
    options?: ProvidedOptions
): ValueAtPath<O, P, Options> => {
    const optionsWithDefaults = withDefaultValueAtPathOptions(options)
    return valueAtPathList(
        o,
        (path as string).split(optionsWithDefaults.delimiter) as Split<
            P,
            Options["delimiter"]
        >,
        withDefaultValueAtPathOptions(optionsWithDefaults) as Options
    )
}

export const valueAtPathList = <
    O,
    P extends Segment[],
    ProvidedOptions extends ValueAtPathOptions = {},
    Options extends Required<ValueAtPathOptions> = WithDefaults<
        ValueAtPathOptions,
        ProvidedOptions,
        DefaultValueAtPathOptions
    >
>(
    o: O,
    segments: ValidatePathListOf<O, Narrow<P>>,
    options?: ProvidedOptions
): ValueAtPathList<O, P, Options["excludeArrayIndices"]> => {
    const { excludeArrayIndices } = withDefaultValueAtPathOptions(options)
    const recurse = (value: any, segments: Segment[]): any => {
        if (Array.isArray(value) && excludeArrayIndices) {
            return value.map((_) => recurse(_, segments))
        }
        if (!segments.length) {
            return value
        }
        const [segment, ...remaining] = segments
        if (isRecursible(value) && segment in value) {
            return recurse(value[segment], remaining)
        } else {
            return undefined
        }
    }
    return recurse(o, segments)
}

const obj = {
    a: {
        b: {
            c: 31
        }
    },
    d: [{ e: true }, "redo"] as const,
    f: [255],
    g: [{ a: true }, { a: false }]
}

export type Fallback<Value, Default> = unknown extends Value ? Default : Value
export type EnsureValue<Value, Default> = NonNullable<Fallback<Value, Default>>

export type PathConstraintOptions = {
    leavesOnly?: boolean
    filter?: any
    exclude?: any
    treatAsLeaf?: any
    excludeArrayIndices?: boolean
    maxDepth?: number
}

export type PathConstraints = Required<PathConstraintOptions>

export type DefaultPathConstraints = {
    leavesOnly: false
    filter: any
    exclude: never
    treatAsLeaf: never
    excludeArrayIndices: false
    maxDepth: 10
}

export type StringPathConstraintOptions = PathConstraintOptions & {
    delimiter?: string
}

export type PathListOf<
    T,
    ProvidedConstraints extends PathConstraintOptions = {},
    Constraints extends PathConstraints = WithDefaults<
        PathConstraintOptions,
        ProvidedConstraints,
        DefaultPathConstraints
    >
> = Cast<
    PathListOfRecurse<
        T,
        Constraints,
        EnsureValue<
            Constraints["maxDepth"],
            DefaultPathConstraints["maxDepth"]
        >,
        never,
        [],
        never
    >,
    Segment[]
>

type PathListOfRecurse<
    T,
    Constraints extends Required<PathConstraintOptions>,
    DepthRemaining extends number,
    Seen,
    Path extends Segment[],
    Paths extends Segment[]
> = DepthRemaining extends 0
    ? never
    : T extends NonRecursible | Constraints["treatAsLeaf"]
    ? T extends Constraints["exclude"]
        ? never
        : T extends Constraints["filter"]
        ? Constraints["leavesOnly"] extends true
            ? Path
            : Paths
        : never
    : And<IsList<T>, Constraints["excludeArrayIndices"]> extends true
    ? PathListOfRecurse<
          FlatUnlisted<T>,
          Constraints,
          MinusOne<DepthRemaining>,
          Seen,
          Path,
          Paths
      >
    : T extends Seen
    ? never
    : ValueOf<
          {
              [K in keyof T]: PathListOfRecurse<
                  T[K],
                  Constraints,
                  MinusOne<DepthRemaining>,
                  Seen | T,
                  [...Path, K & Segment],
                  Paths | [...Path, K & Segment]
              >
          }
      >

export type ValidatePathListOf<
    T,
    P extends Segment[],
    ProvidedConstraints extends PathConstraintOptions = {},
    Constraints extends PathConstraints = WithDefaults<
        PathConstraintOptions,
        ProvidedConstraints,
        DefaultPathConstraints
    >
> = ValidatePathListOfRecurse<T, P, Constraints, []>

type ValidatePathListOfRecurse<
    T,
    PathRemaining extends Segment[],
    Constraints extends Required<PathConstraintOptions>,
    PathSoFar extends Segment[]
> = PathRemaining extends Iteration<Segment, infer Current, infer Remaining>
    ? Current extends keyof T
        ? ValidatePathListOfRecurse<
              And<IsList<T>, Constraints["excludeArrayIndices"]> extends true
                  ? FlatUnlisted<T[Current]>
                  : T[Current],
              Remaining,
              Constraints,
              [...PathSoFar, Current]
          >
        : [...PathSoFar, InvalidPropertyError<T, Current>]
    : T extends Constraints["exclude"]
    ? [
          ...PathSoFar,
          `The value at path '${Join<
              PathSoFar,
              DefaultDelimiter
          >}' is of an excluded type.`
      ]
    : T extends Constraints["filter"]
    ? [...PathSoFar, ...PathRemaining]
    : [
          ...PathSoFar,
          `The value at path '${Join<
              PathSoFar,
              DefaultDelimiter
          >}' is not of a filtered type.`
      ]

export type PathOf<
    T,
    Constraints extends StringPathConstraintOptions = {}
> = Join<
    PathListOf<T, Constraints>,
    EnsureValue<Constraints["delimiter"], DefaultDelimiter>
>

export type PathListTo<
    T,
    To,
    Constraints extends Omit<
        PathConstraintOptions,
        "filter" | "treatAsLeaf" | "leavesOnly"
    > = {}
> = PathListOf<T, { filter: To; treatAsLeaf: To } & Constraints>

export type PathTo<
    T,
    To,
    Constraints extends Omit<
        StringPathConstraintOptions,
        "filter" | "treatAsLeaf" | "leavesOnly"
    > = {}
> = PathOf<T, { filter: To; treatAsLeaf: To; leavesOnly: true } & Constraints>

export type CyclicPathList<
    T,
    Constraints extends Omit<
        PathConstraintOptions,
        "filter" | "treatAsLeaf" | "leavesOnly"
    > = {}
> = PathListTo<TransformCyclic<T, "__cycle__">, "__cycle__", Constraints>

export type CyclicPath<
    T,
    Constraints extends Omit<
        StringPathConstraintOptions,
        "filter" | "treatAsLeaf" | "leavesOnly"
    > = {}
> = PathTo<TransformCyclic<T, "__cycle__">, "__cycle__", Constraints>
