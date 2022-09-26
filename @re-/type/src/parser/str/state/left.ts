import type { Base } from "../../../nodes/base.js"
import type { Bounds } from "../../../nodes/constraints/bounds.js"
import type { ParseError } from "../../common.js"
import type { UnclosedGroupMessage } from "../operand/groupOpen.js"
import type {
    Branches,
    branches,
    MergeBranches
} from "../operator/binary/branch.js"
import type { UnpairedLeftBoundMessage } from "../operator/unary/bound/right.js"
import type { Scanner } from "./scanner.js"

type leftBase = {
    groups: branches[]
    branches: branches
    root?: Base.node
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

    export type withRoot<Root extends Base.node = Base.node> = {
        root: Root
    }

    export type suffixable = {
        root: Base.node
        nextSuffix: Scanner.Suffix
    }

    type baseSuffix = {
        lowerBound?: Bounds.Lower
        root: Base.node
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

    export type WithRoot<Root> = With<{ root: Root }>

    export type Finalize<L extends Left> = L["groups"] extends []
        ? L["lowerBound"] extends undefined
            ? Left.From<{
                  lowerBound: undefined
                  groups: []
                  branches: {}
                  root: MergeBranches<L["branches"], L["root"]>
              }>
            : Left.Error<UnpairedLeftBoundMessage>
        : Left.Error<UnclosedGroupMessage>
}
