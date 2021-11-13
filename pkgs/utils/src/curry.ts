import { T } from "ts-toolbelt"
import {
    Iteration,
    Func,
    ElementOf,
    ReverseIteration,
    Evaluate,
    DeepEvaluate,
    ListPossibleTypes,
    Unlisted,
    PlusOne,
    MinusOne,
    Minus,
    ValueOf,
    Plus,
    List,
    Min,
    Max
} from "./common.js"
import { Union } from "ts-toolbelt"

export type Curryable<F extends Func> = F extends Func<infer Args>
    ? Args extends Iteration<unknown, unknown, unknown[]>
        ? F
        : Args extends []
        ? F
        : "Functions with rest parameters are not supported."
    : never

export type Uncurry<F extends Func> = F extends Func<
    infer Args,
    Func<infer NextArgs, infer NextReturn>
>
    ? Uncurry<Func<[...Args, ...NextArgs], NextReturn>>
    : F

export const curry = <F extends Func>(
    f: Curryable<F>,
    previousArgs: unknown[] = []
): Curry<F> => {
    const original = f as any as Function
    return ((...args: unknown[]) =>
        ((a: unknown[]) =>
            a.length === original.length ? original(...a) : curry(f, a))([
            ...previousArgs,
            ...args
        ])) as any
}

export const uncurry = <F extends Func>(f: F): Uncurry<F> => {
    return {} as any
}

export const partial = <
    ProvidedArgs extends unknown[],
    RemainingArgs extends unknown[],
    ReturnType
>(
    f: (...args: [...ProvidedArgs, ...RemainingArgs]) => ReturnType,
    ...providedArgs: ProvidedArgs
) => {
    return (...remainingArgs: RemainingArgs) =>
        f(...providedArgs, ...remainingArgs)
}

export type LengthOf<
    T extends unknown[],
    Result extends number = 0
> = T extends [infer Current, ...infer Remaining]
    ? Remaining extends []
        ? PlusOne<Result>
        : LengthOf<Remaining, PlusOne<Result>>
    : never

export type Between<
    First extends number,
    Last extends number,
    Inclusive extends boolean = true,
    Result extends number = never
> = First extends Last
    ? Result | (Inclusive extends true ? Last : never)
    : Between<PlusOne<First>, Last, Inclusive, Result | First>

type NumericCompositionsRecurse<
    N extends number,
    Result extends number[] = [],
    Sizes extends number = Between<1, N> & number
> = N extends 1
    ? [...Result, 1]
    : ValueOf<
          {
              [Size in Sizes]: Size extends N
                  ? [...Result, Size]
                  : NumericCompositionsRecurse<
                        Minus<N, Size>,
                        [...Result, Size]
                    >
          }
      >

export type NumericCompositions<N extends number> = N extends 0
    ? []
    : NumericCompositionsRecurse<N>

export type Compositions<
    T extends unknown[],
    Comps extends number[] = NumericCompositions<LengthOf<T>>
> = T extends [] ? T : SliceByLengths<T, Comps>

export type SliceByLengths<
    T extends unknown[],
    Lengths extends number[],
    CurrentIndex extends number = 0,
    Result extends unknown[] = []
> = Lengths extends Iteration<number, infer SliceLength, infer Remaining>
    ? Remaining extends []
        ? [...Result, Slice<T, 0, SliceLength>]
        : SliceByLengths<
              Slice<T, SliceLength>,
              Remaining,
              Plus<CurrentIndex, SliceLength>,
              [...Result, Slice<T, 0, SliceLength>]
          >
    : Result

export type Slice<
    T extends unknown[],
    First extends number,
    Last extends number = LengthOf<T>,
    FirstValid extends number = Min<First, LengthOf<T>>,
    LastValid extends number = Max<Last, FirstValid>
> = FilterByIndex<T, Between<FirstValid, LastValid, false>>

export type PreserveLabelOfFirstElement<T extends unknown[]> = T extends [
    unknown
]
    ? T
    : T extends [...first: infer First, last: infer Last]
    ? PreserveLabelOfFirstElement<First>
    : T

export type FilterByIndex<
    T extends unknown[],
    Include extends number,
    CurrentIndex extends number = 0,
    Result extends unknown[] = []
> = T extends [infer Current, ...infer Remaining]
    ? CurrentIndex extends Include
        ? FilterByIndex<
              Remaining,
              Include,
              PlusOne<CurrentIndex>,
              [...Result, ...PreserveLabelOfFirstElement<T>]
          >
        : FilterByIndex<Remaining, Include, PlusOne<CurrentIndex>, Result>
    : Result

export type Curry<
    F extends Func<Args, Return>,
    Args extends unknown[] = Parameters<F>,
    Return = ReturnType<F>,
    ValidCurryParameters extends unknown[][] = Compositions<Args>
> = Union.IntersectOf<UnpackCurryParameters<ValidCurryParameters, Return>>

export type UnpackCurryParameters<
    ArgSets extends unknown[][],
    Return
> = ArgSets extends Iteration<unknown[], infer Args, infer RemainingArgSets>
    ? RemainingArgSets extends []
        ? (...args: Args) => Return
        : (...args: Args) => UnpackCurryParameters<RemainingArgSets, Return>
    : ArgSets extends []
    ? () => Return
    : never
