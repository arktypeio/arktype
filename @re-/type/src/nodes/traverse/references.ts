import type { Conform, ElementOf, Merge } from "@re-/tools"
import type { RootNode } from "../common.js"

export type ReferencesOf<
    Ast,
    Filter extends string = string
> = FilterReferences<RootNode.References<Ast>, Filter, []>

export type ReferenceTypeOptions<Filter extends string = string> = {
    filter?: Filter
}

export type ReferencesOptions<Filter extends string = string> = {
    filter?: FilterFn<Filter>
}

export type FilterFn<Filter extends string> =
    | ((reference: string) => reference is Filter)
    | ((reference: string) => boolean)

export type ReferencesFn<Ast> = <Options extends ReferencesOptions = {}>(
    options?: Options
) => ElementOf<
    ReferencesOf<
        Ast,
        Options["filter"] extends FilterFn<infer Filter> ? Filter : string
    >
>[]

type FilterReferences<
    References extends unknown[],
    Filter extends string,
    Result extends string[]
> = References extends [infer Head, ...infer Tail]
    ? FilterReferences<
          Tail,
          Filter,
          Head extends Filter
              ? Head extends ElementOf<Result>
                  ? Result
                  : [...Result, Head]
              : Result
      >
    : Result
