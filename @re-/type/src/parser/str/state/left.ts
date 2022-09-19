import type { strNode } from "../../../nodes/common.js"
import type { Bounds } from "../../../nodes/constraints/bounds.js"
import type { ParseError } from "../../common.js"
import type { Branches, branches } from "../operator/branch/branch.js"
import type { Scanner } from "./scanner.js"

type leftBase = {
    groups: branches[]
    branches: branches
    root?: strNode
    lowerBound?: Bounds.Lower
    nextSuffix?: Scanner.Suffix
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    lowerBound: Bounds.Lower | undefined
    groups: Branches[]
    branches: Branches
    root: unknown
    nextSuffix?: Scanner.Suffix
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
        nextSuffix: Scanner.Suffix
    }

    type baseSuffix = {
        lowerBound?: Bounds.Lower
        root: strNode
        nextSuffix: Scanner.Suffix
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
        root: ParseError<Message>
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
        Token extends Scanner.Suffix
    > = From<{
        lowerBound: L["lowerBound"]
        groups: L["groups"]
        branches: L["branches"]
        root: L["root"]
        nextSuffix: Token
    }>

    export type WithRoot<Root> = With<{ root: Root }>

    type SuffixInput = {
        lowerBound: Bounds.Lower | undefined
        root: unknown
        nextSuffix: Scanner.Suffix
    }

    export type Suffixable = With<{ nextSuffix: Scanner.Suffix }>

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
