import type { Base } from "../../../nodes/base.js"
import type { Bound } from "../../../nodes/nonTerminal/infix/bound.js"
import type { ParseError } from "../../common.js"
import type { Branches, branches } from "../operator/binary/branch.js"

type leftBase = {
    groups: branches[]
    branches: branches
    root?: Base.node
    lowerBound?: Bound.Ast.Lower
    done?: true
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    lowerBound: Bound.Ast.Lower | null
    groups: Branches[]
    branches: Branches
    root: unknown
    done?: true
}

export type Left<Constraints extends Partial<LeftBase> = {}> = LeftBase &
    Constraints

export namespace left {
    export const initialize = (): left => ({
        groups: [],
        branches: {}
    })
}

export namespace Left {
    export type New = From<{
        lowerBound: null
        groups: []
        branches: {}
        root: undefined
    }>

    export type IsPrefixable<L extends LeftBase> = From<{
        lowerBound: null
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
        lowerBound: null
        groups: []
        branches: {}
        root: ParseError<Message>
        done: true
    }>

    export type SetRoot<L extends LeftBase, Node> = From<{
        lowerBound: L["lowerBound"]
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type WithRoot<Root> = With<{ root: Root }>
}
