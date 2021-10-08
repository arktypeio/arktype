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
    Iteration,
    List,
    Recursible
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
    P extends string,
    ProvidedOptions extends ValueAtPathOptions = {},
    Options extends Required<ValueAtPathOptions> = WithDefaults<
        ValueAtPathOptions,
        ProvidedOptions,
        DefaultValueAtPathOptions
    >
>(
    o: O,
    path: PathOf<P, O>,
    options?: ProvidedOptions
): ValueAtPath<O, P, Options> => {
    const optionsWithDefaults = withDefaultValueAtPathOptions(options)
    return valueAtPathList(
        o as any,
        (path as string).split(optionsWithDefaults.delimiter) as any,
        withDefaultValueAtPathOptions(optionsWithDefaults) as any
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
    segments: PathListOf<Narrow<P>, O>,
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

const x = valueAtPath(obj, "a")

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
export type DefaultStringPathConstraints = DefaultPathConstraints & {
    delimiter: "/"
}

export type PathListOf<
    P extends Segment[],
    T,
    ProvidedConstraints extends PathConstraintOptions = {},
    Constraints extends PathConstraints = WithDefaults<
        PathConstraintOptions,
        ProvidedConstraints,
        DefaultPathConstraints
    >
> = Cast<PathListOfRecurse<T, P, Constraints, []>, Segment[]>

type PathListOfRecurse<
    T,
    PathRemaining extends Segment[],
    Constraints extends Required<PathConstraintOptions>,
    PathSoFar extends Segment[]
> = PathRemaining extends Iteration<Segment, infer Current, infer Remaining>
    ? Current extends keyof T
        ? PathListOfRecurse<
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

// type PathOfRecurse<
//     T,
//     PathRemaining extends string,
//     Constraints extends Required<StringPathConstraintOptions>,
//     PathSoFar extends string
// > = PathRemaining extends `${infer Current}${Constraints["delimiter"]}${infer Remaining}`
//     ? Current extends keyof T
//         ? PathOfRecurse<
//               And<IsList<T>, Constraints["excludeArrayIndices"]> extends true
//                   ? FlatUnlisted<T[Current]>
//                   : T[Current],
//               Remaining,
//               Constraints,
//               `${PathSoFar}${Current}${Constraints["delimiter"]}`
//           >
//         : `${PathSoFar}${InvalidPropertyError<T, Current>}`
//     : PathRemaining extends keyof T
//     ? `${PathSoFar}${PathRemaining}`
//     : `${PathSoFar}${InvalidPropertyError<T, PathRemaining>}`

type PathOfRecurse<
    O,
    RemainingPath extends string,
    Constraints extends Required<StringPathConstraintOptions>,
    ValidatedPath extends string,
    T = Recursible<O>,
    KeyOfT extends keyof T & string = `${keyof T &
        (T extends List ? number : string)}` &
        keyof T,
    PathSuggestions extends string = `${ValidatedPath}${KeyOfT}`
> = RemainingPath extends `${infer Current}${Constraints["delimiter"]}${infer Remaining}`
    ? Current extends KeyOfT
        ? PathOfRecurse<
              And<
                  IsList<T[Current]>,
                  Constraints["excludeArrayIndices"]
              > extends true
                  ? FlatUnlisted<T[Current]>
                  : T[Current],
              Remaining,
              Constraints,
              `${ValidatedPath}${Current}${Constraints["delimiter"]}`
          >
        : PathSuggestions
    : RemainingPath extends keyof T
    ? `${ValidatedPath}${RemainingPath | KeyOfT}`
    : PathSuggestions

export type PathOf<
    P extends string,
    T,
    ProvidedConstraints extends StringPathConstraintOptions = {},
    Constraints extends Required<StringPathConstraintOptions> = WithDefaults<
        StringPathConstraintOptions,
        ProvidedConstraints,
        DefaultStringPathConstraints
    >
> = PathOfRecurse<T, P, Constraints, "">

type Obj = typeof obj
type XM = Obj["d"] extends any[] ? true : false

type Z = PathOf<"a/x", typeof obj, {}>

type FFDS = {
    a?: {
        b?: [""]
    }
}

const zf = valueAtPath({} as FFDS, "a/b/0")

export type PathTo<
    P extends string,
    T,
    To,
    Constraints extends Omit<
        StringPathConstraintOptions,
        "filter" | "treatAsLeaf" | "leavesOnly"
    > = {}
> = PathOf<
    P,
    T,
    { filter: To; treatAsLeaf: To; leavesOnly: true } & Constraints
>
