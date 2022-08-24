// TODO: Remove imports like this
import { Bound, Branches } from "../operator/index.js"
import { Node } from "./common.js"
import { ErrorToken, SuffixToken } from "./tokens.js"

type base = {
    bounds: Bound.Bounds
    groups: Branches.ValueState[]
    branches: Branches.ValueState
    root?: Node.base
    nextSuffix?: SuffixToken
}

export type left<constraints extends Partial<base> = {}> = base & constraints

export namespace left {
    export const initial: left = {
        bounds: {},
        groups: [],
        branches: {}
    }

    export type withRoot<Root extends Node.base = Node.base> = {
        root: Root
    }

    export type suffixable = {
        root: Node.base
        nextSuffix: SuffixToken
    }

    type baseSuffix = {
        bounds: Bound.Bounds
        root: Node.base
        nextSuffix: SuffixToken
    }

    export type suffix<constraints extends Partial<baseSuffix> = {}> =
        baseSuffix & constraints
}

type Base = {
    bounds: Bound.Bounds
    groups: Branches.TypeState[]
    branches: Branches.TypeState
    root: unknown
    nextSuffix?: SuffixToken
}

export type Left<Constraints extends Partial<Base> = {}> = Base & Constraints

export namespace Left {
    export type New = From<{
        bounds: {}
        groups: []
        branches: {}
        root: undefined
    }>

    export type IsPrefixable<L extends Base> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: any
    }> extends L
        ? true
        : false
}

export namespace Left {
    export type With<Constraints extends Partial<Base>> = Base & Constraints

    export type From<L extends Base> = L

    export type Error<Message extends string> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: ErrorToken<Message>
        nextSuffix: "END"
    }>

    export type SetRoot<L extends Base, Node> = From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type SetNextSuffix<
        L extends Base,
        Token extends SuffixToken
    > = From<{
        bounds: L["bounds"]
        groups: L["groups"]
        branches: L["branches"]
        root: L["root"]
        nextSuffix: Token
    }>

    export type WithRoot<Root> = With<{ root: Root }>

    type SuffixInput = {
        bounds: Bound.Bounds
        root: unknown
        nextSuffix: SuffixToken
    }

    export type Suffixable = With<{ nextSuffix: SuffixToken }>

    export type Suffix<Constraints extends Partial<SuffixInput> = {}> = With<
        SuffixInput & Constraints
    >

    export type SuffixFrom<L extends SuffixInput> = Left.From<{
        bounds: L["bounds"]
        groups: never
        branches: never
        root: L["root"]
        nextSuffix: L["nextSuffix"]
    }>
}
