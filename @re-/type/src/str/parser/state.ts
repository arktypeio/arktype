import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Node } from "../common.js"
import { Bound, Branches } from "../operator/index.js"
import { scanner } from "./scanner.js"
import { ErrorToken, SuffixToken } from "./tokens.js"

export class state<constraints extends Partial<left> = {}> {
    l: left<constraints>
    r: scanner

    constructor(def: string) {
        this.l = left.initial as left<constraints>
        this.r = new scanner(def)
    }

    static error(message: string): never {
        throw new Node.ParseError(message)
    }

    hasRoot = <NodeClass extends ClassOf<Node.Base> = ClassOf<Node.Base>>(
        ofClass?: NodeClass
    ): this is state<{ root: InstanceOf<NodeClass> }> =>
        ofClass ? this.l.root instanceof ofClass : this.l.root !== undefined

    isPrefixable() {
        return (
            isEmpty(this.l.bounds) &&
            isEmpty(this.l.branches) &&
            !this.l.groups.length
        )
    }

    isSuffixable(): this is state<left.suffixable> {
        return this.l.nextSuffix !== undefined
    }

    setNextSuffix(token: SuffixToken) {
        this.l.nextSuffix = token
        return this
    }
}

export type State<Constraints extends Partial<Left.Base> = {}> = {
    L: Left.Base & Constraints
    R: string
}

export namespace State {
    export type Base = {
        L: Left.Base
        R: string
    }

    export type New<Def extends string> = From<{
        L: Left.New
        R: Def
    }>

    export type Of<L extends Left.Base> = {
        L: L
        R: string
    }

    export type With<Constraints extends Partial<Left.Base>> = {
        L: Left.Base & Constraints
        R: string
    }

    export type From<S extends State> = S

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }
    export type Suffixable = {
        L: {
            nextSuffix: string
        }
    }
}

export type left<constraints extends Partial<left.base> = {}> = left.base &
    constraints

export namespace left {
    export type base = {
        bounds: Bound.Bounds
        groups: Branches.ValueState[]
        branches: Branches.ValueState
        root?: Node.Base
        nextSuffix?: SuffixToken
    }

    export const initial: left = {
        bounds: {},
        groups: [],
        branches: {}
    }

    export type withRoot<Root extends Node.Base = Node.Base> = {
        root: Root
    }

    export type suffixable = {
        root: Node.Base
        nextSuffix: SuffixToken
    }

    type baseSuffix = {
        bounds: Bound.Bounds
        root: Node.Base
        nextSuffix: SuffixToken
    }

    export type suffix<constraints extends Partial<baseSuffix> = {}> =
        baseSuffix & constraints
}

export type Left<Constraints extends Partial<Left.Base> = {}> = Left.Base &
    Constraints

export namespace Left {
    export type Base = {
        bounds: Bound.Bounds
        groups: Branches.TypeState[]
        branches: Branches.TypeState
        root: unknown
        nextSuffix?: SuffixToken
    }

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

    export type Suffix = With<SuffixInput>

    export type SuffixFrom<L extends SuffixInput> = Left.From<{
        bounds: L["bounds"]
        groups: never
        branches: never
        root: L["root"]
        nextSuffix: L["nextSuffix"]
    }>
}
