// TODO: Remove this once file is refactored
/* eslint-disable max-lines */
import { NumberLiteralDefinition } from "./terminal/index.js"

export type Left = {
    openGroups: BranchState[]
    branch: BranchState
    expression: unknown
    bounds: Bounds
}

export type DefaultLeft = {
    openGroups: []
    branch: DefaultBranchState
    expression: []
    bounds: {}
}

export type BranchState = {
    union: CurrentBranch
    intersection: CurrentBranch
}

export type DefaultBranchState = {
    union: []
    intersection: []
}

export type CurrentBranch = [] | [unknown, string]

type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="

export type Bounds = {
    left?: [NumberLiteralDefinition, ComparatorToken]
    right?: [ComparatorToken, NumberLiteralDefinition]
}

export namespace Reduce {
    type LeftFrom<L extends Left> = L

    export type OpenGroup<L extends Left> = LeftFrom<{
        openGroups: [...L["openGroups"], L["branch"]]
        branch: DefaultBranchState
        expression: []
        bounds: L["bounds"]
    }>

    type PopGroup<Stack extends BranchState[], Top extends BranchState> = [
        ...Stack,
        Top
    ]

    export type SetExpression<L extends Left, Token extends string> = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: Token
        bounds: L["bounds"]
    }>

    type Error<L extends Left, Message extends string> = SetExpression<
        L,
        ErrorToken<Message>
    >

    export type CloseGroup<L extends Left> = L["openGroups"] extends PopGroup<
        infer Stack,
        infer Top
    >
        ? LeftFrom<{
              openGroups: Stack
              branch: Top
              expression: MergeBranches<L["branch"], L["expression"]>
              bounds: L["bounds"]
          }>
        : Error<L, `Unexpected ).`>

    export type SuffixStart<L extends Left> = LeftFrom<{
        openGroups: L["openGroups"]
        branch: DefaultBranchState
        expression: MergeBranches<L["branch"], L["expression"]>
        bounds: L["bounds"]
    }>

    export type UpdateBounds<
        L extends Left,
        Updates extends Partial<Bounds>
    > = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: L["expression"]
        bounds: L["bounds"] & Updates
    }>

    export type List<L extends Left> = LeftFrom<{
        openGroups: L["openGroups"]
        branch: L["branch"]
        expression: [L["expression"], "[]"]
        bounds: L["bounds"]
    }>

    export type Branch<
        L extends Left,
        Token extends BranchingOperatorToken
    > = LeftFrom<{
        openGroups: L["openGroups"]
        branch: Token extends "|"
            ? Union<L["branch"], L["expression"]>
            : Intersection<L["branch"], L["expression"]>
        expression: []
        bounds: L["bounds"]
    }>

    type Union<B extends BranchState, Expression> = {
        union: [
            B["union"] extends []
                ? MergeExpression<B["intersection"], Expression>
                : [
                      ...B["union"],
                      MergeExpression<B["intersection"], Expression>
                  ],
            "|"
        ]
        intersection: []
    }

    type Intersection<B extends BranchState, Expression> = {
        union: B["union"]
        intersection: [
            B["intersection"] extends []
                ? Expression
                : [...B["intersection"], Expression],
            "&"
        ]
    }

    type ExtractIfSingleton<T> = T extends [infer Element] ? Element : T

    type MergeExpression<
        Branch extends CurrentBranch,
        Expression
    > = ExtractIfSingleton<[...Branch, Expression]>

    type MergeBranches<B extends BranchState, Expression> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Expression>
    >
}

type ComparatorStartChar = "<" | ">" | "="

type BaseTerminatingChar =
    | ModifyingOperatorStartChar
    | BranchTerminatingChar
    | " "

type BranchTerminatingChar = BranchingOperatorToken | ")" | SuffixToken | "="

type SuffixToken = "END" | "?" | ComparatorToken

type BranchingOperatorToken = "|" | "&"

type ModifyingOperatorStartChar = "["

type LiteralEnclosingChar = `'` | `"` | `/`

type ErrorToken<Message extends string> = `!${Message}`
