import { isEmpty } from "@re-/tools"
import { Core } from "../../core/index.js"
import { Bound, Branches } from "../nonTerminal/index.js"
import { ErrorToken, SuffixToken } from "./tokens.js"

type ExpressionLeft = {
    bounds: Bound.State
    groups: Branches.ValueState[]
    branches: Branches.ValueState
    root: Core.Node | undefined
    nextSuffix: SuffixToken | undefined
}

export class Expression<
    Constraints extends Partial<ExpressionLeft> = {},
    L extends ExpressionLeft = ExpressionLeft & Constraints
> {
    bounds = {} as L["bounds"]
    groups = [] as L["groups"]
    branches = {} as L["branches"]
    root?: L["root"]
    nextSuffix?: L["nextSuffix"]

    isPrefixable() {
        return (
            isEmpty(this.bounds) &&
            isEmpty(this.branches) &&
            !this.groups.length
        )
    }

    isSuffixable() {
        return this.nextSuffix !== undefined
    }
}

export namespace Expression {
    export type T = {
        bounds: Bound.State
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

    export type With<Constraints extends Partial<T>> = T & Constraints
}
