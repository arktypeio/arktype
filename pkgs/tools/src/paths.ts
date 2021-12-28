import {
    FlatUnlisted,
    IsList,
    isRecursible,
    And,
    Segment,
    List,
    Recursible,
    PlusOne,
    MinusOne,
    Split
} from "./common.js"
import { WithDefaults, withDefaults } from "./merge.js"
import { narrow } from "./narrow.js"
import { NumericString } from "./stringUtils.js"

export type PathOptions = {
    delimiter?: string
    excludeArrayIndices?: boolean
}

export const defaultPathOptions = narrow({
    delimiter: "/",
    excludeArrayIndices: false
})

export type DefaultPathOptions = typeof defaultPathOptions

const withDefaultValueAtPathOptions =
    withDefaults<PathOptions>(defaultPathOptions)

export const valueAtPath = <
    Obj,
    Path extends string,
    ProvidedOptions extends PathOptions = {},
    Options extends Required<PathOptions> = WithDefaults<
        PathOptions,
        ProvidedOptions,
        DefaultPathOptions
    >
>(
    obj: Obj,
    path: PathOf<Obj, Path, Options>,
    options?: ProvidedOptions
): ValueAtPath<Obj, Path, Options> => {
    const { excludeArrayIndices, delimiter } =
        withDefaultValueAtPathOptions(options)
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
    return recurse(obj, (path as any).split(delimiter) as any)
}

export type Fallback<Value, Default> = unknown extends Value ? Default : Value
export type EnsureValue<Value, Default> = NonNullable<Fallback<Value, Default>>

type CountNestedLists<T, Count extends number = 0> = T extends List<infer Item>
    ? CountNestedLists<Item, PlusOne<Count>>
    : Count

type NestInLists<T, Count extends number> = Count extends 0
    ? T
    : NestInLists<[T], MinusOne<Count>>

export type ValueAtPathRecurse<
    Obj,
    RemainingPath extends string,
    PossiblyUndefined extends boolean,
    ProvidedOptions extends PathOptions,
    SkippedListCount extends number,
    O = Recursible<Obj>,
    Options extends Required<PathOptions> = WithDefaults<
        PathOptions,
        ProvidedOptions,
        DefaultPathOptions
    >,
    KeyOfO extends keyof O = RecursibleKeyOf<O>,
    NextPossiblyUndefined extends boolean = undefined extends Obj
        ? true
        : PossiblyUndefined,
    CurrentKey extends keyof O = GetRecursibleKey<
        O,
        Split<RemainingPath, Options["delimiter"]>[0]
    >
> = RemainingPath extends `${infer Current}${Options["delimiter"]}${infer Remaining}`
    ? CurrentKey extends never
        ? undefined
        : ValueAtPathRecurse<
              And<
                  IsList<O[CurrentKey]>,
                  Options["excludeArrayIndices"]
              > extends true
                  ? FlatUnlisted<O[CurrentKey]>
                  : O[CurrentKey],
              Remaining,
              NextPossiblyUndefined,
              Options,
              Options["excludeArrayIndices"] extends true
                  ? CountNestedLists<O[CurrentKey], SkippedListCount>
                  : 0
          >
    : StringOrNumericKey<RemainingPath> extends KeyOfO
    ? NestInLists<
          | O[StringOrNumericKey<RemainingPath>]
          | (NextPossiblyUndefined extends true ? undefined : never),
          SkippedListCount
      >
    : undefined

export type ValueAtPath<
    Obj,
    Path extends string,
    ProvidedOptions extends PathOptions = {},
    Options extends Required<PathOptions> = WithDefaults<
        PathOptions,
        ProvidedOptions,
        DefaultPathOptions
    >
> = ValueAtPathRecurse<Obj, Path, false, Options, 0>

type RecursibleKeyOf<Obj, O = Recursible<Obj>> = O extends any[]
    ? keyof O & number
    : O extends readonly any[]
    ? keyof O & NumericString
    : keyof O & string

type StringOrNumericKey<K extends string> = K extends NumericString<infer Value>
    ? Value
    : K

type GetRecursibleKey<Obj, K extends string> = keyof Obj &
    (Obj extends any[]
        ? K extends NumericString<infer Value>
            ? Value
            : never
        : K)

export type PathOfRecurse<
    Obj,
    RemainingPath extends string,
    ValidatedPath extends string,
    ProvidedOptions extends PathOptions,
    O = Recursible<Obj>,
    Options extends Required<PathOptions> = WithDefaults<
        PathOptions,
        ProvidedOptions,
        DefaultPathOptions
    >,
    KeyOfO extends keyof O & Segment = RecursibleKeyOf<O>,
    PathSuggestions extends string = KeyOfO extends number
        ? `${ValidatedPath}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
        : `${ValidatedPath}${KeyOfO}`,
    CurrentKey extends keyof O = GetRecursibleKey<
        O,
        Split<RemainingPath, Options["delimiter"]>[0]
    >
> = RemainingPath extends `${infer Current}${Options["delimiter"]}${infer Remaining}`
    ? CurrentKey extends never
        ? PathSuggestions
        : PathOfRecurse<
              And<
                  IsList<O[CurrentKey]>,
                  Options["excludeArrayIndices"]
              > extends true
                  ? FlatUnlisted<O[CurrentKey]>
                  : O[CurrentKey],
              Remaining,
              `${ValidatedPath}${Current}${Options["delimiter"]}`,
              Options
          >
    : StringOrNumericKey<RemainingPath> extends KeyOfO
    ? `${ValidatedPath}${RemainingPath | KeyOfO}`
    : PathSuggestions

export type PathOf<
    Obj,
    Path extends string,
    ProvidedOptions extends PathOptions = {},
    Options extends Required<PathOptions> = WithDefaults<
        PathOptions,
        ProvidedOptions,
        DefaultPathOptions
    >
> = PathOfRecurse<Obj, Path, "", Options>
