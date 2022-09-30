import type { Conform, ElementOf, Merge, UnionToTuple } from "@re-/tools"
import type { RootNode } from "../../common.js"
import type { Infix } from "../../nonTerminal/infix/infix.js"
import type { Unary } from "../../nonTerminal/unary/unary.js"

export type ReferencesOf<
    Ast,
    Filter extends string = string
> = FilterReferences<References<Ast>, Filter, []>

// For extracting references, we only care about the node at index 0
type UnaryReferenceToken = Unary.Token | Infix.ConstrainingToken

type References<Ast> = Ast extends string
    ? [Ast]
    : Ast extends readonly unknown[]
    ? Ast[1] extends UnaryReferenceToken
        ? References<Ast[0]>
        : Ast[1] extends Infix.BranchingToken
        ? [...References<Ast[0]>, ...References<Ast[2]>]
        : StructuralReferences<Ast>
    : StructuralReferences<Ast>

type StructuralReferences<Ast> = CollectReferences<
    Ast extends readonly unknown[] ? Ast : UnionToTuple<Ast[keyof Ast]>,
    []
>

type CollectReferences<
    Children extends readonly unknown[],
    Result extends readonly unknown[]
> = Children extends [infer Head, ...infer Tail]
    ? CollectReferences<Tail, [...Result, ...RootNode.References<Head>]>
    : Result

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
