import type { Base } from "../../../nodes/base.js"
import type { Bounds } from "../../../nodes/constraints/bounds.js"
import type { ParseError } from "../../common.js"
import type { Branches, branches } from "../operator/binary/branch.js"

type leftBase = {
    groups: branches[]
    branches: branches
    root?: Base.node
    lowerBound?: Bounds.Lower
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    lowerBound: Bounds.Lower | undefined
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

    export type withRoot<Root extends Base.node = Base.node> = {
        root: Root
    }
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
