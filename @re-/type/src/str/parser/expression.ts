import { Node } from "../common.js"
import { Bound, Branches } from "../operator/index.js"
import { ErrorToken, SuffixToken } from "./tokens.js"

type ExpressionValue = {
    bounds: Bound.Bounds
    groups: Branches.ValueState[]
    branches: Branches.ValueState
    root: Node.Base | undefined
    nextSuffix: SuffixToken | undefined
}

export class Expression<
    Constraints extends Partial<ExpressionValue> = {},
    L extends ExpressionValue = ExpressionValue & Constraints
> {
    bounds = {} as L["bounds"]
    groups = [] as L["groups"]
    branches = {} as L["branches"]
    root = undefined as L["root"]
    nextSuffix = undefined as L["nextSuffix"]
}

export type ExpressionWithRoot<Root extends Node.Base = Node.Base> =
    Expression<{ root: Root }>

export namespace Expression {
    export type T = {
        bounds: Bound.Bounds
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
        nextSuffix?: SuffixToken
    }

    export type From<L extends T> = L

    export type Initial = From<{
        bounds: {}
        groups: []
        branches: {}
        root: undefined
    }>

    export type IsPrefixable<L extends T> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: any
    }> extends L
        ? true
        : false

    export type IsSuffixable<L extends T> = L["nextSuffix"] extends string
        ? true
        : false

    export type Error<Message extends string> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: ErrorToken<Message>
        nextSuffix: "END"
    }>

    export type SetRoot<L extends T, Node> = From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type WithRoot<Root> = With<{ root: Root }>

    export type With<Constraints extends Partial<T>> = T & Constraints

    type SuffixInput = {
        bounds: Bound.Bounds
        root: unknown
        nextSuffix: SuffixToken
    }

    export type Suffix = With<SuffixInput>

    export type SuffixFrom<L extends SuffixInput> = From<{
        bounds: L["bounds"]
        groups: never
        branches: never
        root: L["root"]
        nextSuffix: L["nextSuffix"]
    }>
}

type SuffixValue = {
    bounds: Bound.Bounds
    root: Node.Base
    nextSuffix: SuffixToken
}

export class Suffix extends Expression<SuffixValue> {}
