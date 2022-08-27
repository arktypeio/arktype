import type { Operator } from "../operator/index.js"
import { Node, strNode, SuffixToken } from "./common.js"

type base = {
    groups: Operator.branches[]
    branches: Operator.branches
    root?: strNode
    lowerBound?: Operator.Bound.LowerBoundDefinition
    nextSuffix?: SuffixToken
}

export type left<constraints extends Partial<base> = {}> = base & constraints

type Base = {
    lowerBound: Operator.Bound.LowerBoundDefinition | undefined
    groups: Operator.Branches[]
    branches: Operator.Branches
    root: unknown
    nextSuffix?: SuffixToken
}

export type Left<Constraints extends Partial<Base> = {}> = Base & Constraints

export namespace left {
    export const initial: left = {
        groups: [],
        branches: {}
    }

    export type withRoot<Root extends strNode = strNode> = {
        root: Root
    }

    export type suffixable = {
        root: strNode
        nextSuffix: SuffixToken
    }

    type baseSuffix = {
        lowerBound?: Operator.Bound.LowerBoundDefinition
        root: strNode
        nextSuffix: SuffixToken
    }

    export type suffix<constraints extends Partial<baseSuffix> = {}> =
        baseSuffix & constraints
}

export namespace Left {
    export type New = From<{
        lowerBound: undefined
        groups: []
        branches: {}
        root: undefined
    }>

    export type IsPrefixable<L extends Base> = From<{
        lowerBound: undefined
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
        lowerBound: undefined
        groups: []
        branches: {}
        root: Node.ParseError<Message>
        nextSuffix: "END"
    }>

    export type SetRoot<L extends Base, Node> = From<{
        lowerBound: L["lowerBound"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type SetNextSuffix<
        L extends Base,
        Token extends SuffixToken
    > = From<{
        lowerBound: L["lowerBound"]
        groups: L["groups"]
        branches: L["branches"]
        root: L["root"]
        nextSuffix: Token
    }>

    export type WithRoot<Root> = With<{ root: Root }>

    type SuffixInput = {
        lowerBound: Operator.Bound.LowerBoundDefinition | undefined
        root: unknown
        nextSuffix: SuffixToken
    }

    export type Suffixable = With<{ nextSuffix: SuffixToken }>

    export type Suffix<Constraints extends Partial<SuffixInput> = {}> = With<
        SuffixInput & Constraints
    >

    export type SuffixFrom<L extends SuffixInput> = Left.From<{
        lowerBound: L["lowerBound"]
        groups: never
        branches: never
        root: L["root"]
        nextSuffix: L["nextSuffix"]
    }>
}
