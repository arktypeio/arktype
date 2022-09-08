import { Base } from "../../nodes/base.js"
import { LowerBoundDefinition } from "../../nodes/constraints/bounds.js"
import type { Operator } from "../operator/index.js"
import { strNode, SuffixToken } from "./common.js"

type leftBase = {
    groups: Operator.branches[]
    branches: Operator.branches
    root?: strNode
    lowerBound?: LowerBoundDefinition
    nextSuffix?: SuffixToken
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    lowerBound: LowerBoundDefinition | undefined
    groups: Operator.Branches[]
    branches: Operator.Branches
    root: unknown
    nextSuffix?: SuffixToken
}

export type Left<Constraints extends Partial<LeftBase> = {}> = LeftBase &
    Constraints

export namespace left {
    export const initialize = (): left => ({
        groups: [],
        branches: {}
    })

    export type withRoot<Root extends strNode = strNode> = {
        root: Root
    }

    export type suffixable = {
        root: strNode
        nextSuffix: SuffixToken
    }

    type baseSuffix = {
        lowerBound?: LowerBoundDefinition
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

    export type IsPrefixable<L extends LeftBase> = From<{
        lowerBound: undefined
        groups: []
        branches: {}
        root: any
    }> extends L
        ? true
        : false
}

export namespace Left {
    export type With<Constraints extends Partial<LeftBase>> = LeftBase &
        Constraints

    export type From<L extends LeftBase> = L

    export type Error<Message extends string> = From<{
        lowerBound: undefined
        groups: []
        branches: {}
        root: Base.ParseError<Message>
        nextSuffix: "END"
    }>

    export type SetRoot<L extends LeftBase, Node> = From<{
        lowerBound: L["lowerBound"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type SetNextSuffix<
        L extends LeftBase,
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
        lowerBound: LowerBoundDefinition | undefined
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
