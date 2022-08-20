import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Node } from "../common.js"
import { Bound, Branches } from "../operator/index.js"
import { Scanner } from "./scanner.js"
import { ErrorToken, SuffixToken } from "./tokens.js"

export class State<
    Constraints extends Partial<Left> = {},
    L extends Left = Left & Constraints
> {
    l: L
    r: Scanner

    constructor(def: string) {
        this.l = new Left() as L
        this.r = new Scanner(def)
    }

    error(message: string): never {
        throw new Node.ParseError(message)
    }

    hasRoot = <NodeClass extends ClassOf<Node.Base> = ClassOf<Node.Base>>(
        ofClass?: NodeClass
    ): this is State<{ root: InstanceOf<NodeClass> }> =>
        ofClass ? this.l.root instanceof ofClass : this.l.root !== undefined

    isPrefixable() {
        return this.l.isPrefixable()
    }

    isSuffixable(): this is State<Suffix> {
        return this.l.isSuffixable()
    }
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

    export type withRoot<Root extends Node.Base = Node.Base> = State<{
        root: Root
    }>

    export type From<S extends Base> = S

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }
}

export class Left {
    bounds = {} as Bound.Bounds
    groups = [] as Branches.ValueState[]
    branches = {} as Branches.ValueState
    root = undefined as Node.Base | undefined
    nextSuffix = undefined as SuffixToken | undefined

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

    export type IsSuffixable<L extends Base> = L["nextSuffix"] extends string
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

    export type WithRoot<Root> = With<{ root: Root }>
}

export type Suffix = {
    bounds: Bound.Bounds
    root: Node.Base
    nextSuffix: SuffixToken
}

export namespace Suffix {
    type Input = {
        bounds: Bound.Bounds
        root: unknown
        nextSuffix: SuffixToken
    }

    export type Base = Left.With<Input>

    export type From<L extends Input> = Left.From<{
        bounds: L["bounds"]
        groups: never
        branches: never
        root: L["root"]
        nextSuffix: L["nextSuffix"]
    }>
}
