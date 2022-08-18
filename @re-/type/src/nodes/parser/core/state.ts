import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Base } from "../../index.js"
import { Bound, Branches } from "../../nonTerminal/index.js"
import { Scanner } from "./scanner.js"
import { ErrorToken, SuffixToken } from "./tokens.js"

export class State<Phase extends Expression | Suffix> {
    l: Phase
    r: Scanner

    constructor(def: string) {
        this.l = new Expression() as any
        this.r = new Scanner(def)
    }

    error(message: string) {
        throw new Base.Parsing.ParseError(message)
    }

    isSuffixable() {
        return this.l.nextSuffix !== undefined
    }

    rootIs = <NodeClass extends ClassOf<Base.Node>>(
        nodeClass: NodeClass
    ): this is State<Phase & { root: InstanceOf<NodeClass> }> =>
        this.l.root instanceof nodeClass
}

export namespace State {
    export type Base = {
        L: Expression.Base
        R: string
    }

    export type From<S extends Base> = S

    export type New<Def extends string> = From<{
        L: {
            bounds: {}
            groups: []
            branches: {}
            root: undefined
        }
        R: Def
    }>

    export type Error<Message extends string> = {
        L: Expression.Error<Message>
        R: ""
    }

    export type IsSuffixable<S extends Base> =
        S["L"]["nextSuffix"] extends string ? true : false
}

export class Expression {
    bounds = {} as Bound.State
    groups = [] as Branches.ValueState[]
    branches = {} as Branches.ValueState
    root?: Base.Node | undefined
    nextSuffix?: string

    isPrefixable() {
        return (
            isEmpty(this.bounds) &&
            isEmpty(this.branches) &&
            !this.groups.length
        )
    }
}

export namespace Expression {
    export type Base = {
        bounds: Bound.State
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
        nextSuffix?: SuffixToken
    }

    export type From<L extends Base> = L

    export type IsPrefixable<L extends Base> = From<{
        bounds: {}
        groups: []
        branches: {}
        root: any
    }> extends L
        ? true
        : false

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

    export type With<Constraints extends Partial<Base>> = Base & Constraints
}

type SuffixLeft = {
    root: Base.Node
    bounds: Bound.State
    nextSuffix: SuffixToken
}

export class Suffix<
    Constraints extends Partial<SuffixLeft> = {},
    L extends SuffixLeft = SuffixLeft & Constraints
> {
    constructor(
        public root: L["root"],
        public bounds: L["bounds"],
        public nextSuffix: L["nextSuffix"]
    ) {}
}

export namespace Suffix {
    export type Base = {
        bounds: Bound.State
        root: unknown
        nextSuffix: SuffixToken
    }

    export type From<S extends Base> = S
}
