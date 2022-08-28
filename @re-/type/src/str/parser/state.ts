import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Node, strNode, SuffixToken } from "./common.js"
import { left, Left } from "./left.js"
import { scanner } from "./scanner.js"

export class state<constraints extends Partial<left> = {}> {
    l: left<constraints>
    r: scanner

    constructor(def: string) {
        this.l = left.initialize() as left<constraints>
        this.r = new scanner(def)
    }

    error(message: string): never {
        throw new Node.parseError(message)
    }

    hasRoot<NodeClass extends ClassOf<strNode> = ClassOf<strNode>>(
        ofClass?: NodeClass
    ): this is state<{ root: InstanceOf<NodeClass> }> {
        return ofClass ? this.l.root instanceof ofClass : !!this.l.root
    }

    isPrefixable() {
        return (
            !this.l.lowerBound &&
            isEmpty(this.l.branches) &&
            !this.l.groups.length
        )
    }

    isSuffixable(): this is state<left.suffixable> {
        return !!this.l.nextSuffix
    }

    suffixed(token: SuffixToken) {
        this.l.nextSuffix = token
        return this
    }

    shifted() {
        this.r.shift()
        return this
    }
}

export namespace state {
    export type suffix<Constraints extends Partial<left.suffix> = {}> = state<
        left.suffix<Constraints>
    >

    export type withRoot<Root extends strNode = strNode> = state<
        left.withRoot<Root>
    >
}

export type State<Constraints extends Partial<Left> = {}> = {
    L: Left & Constraints
    R: string
}

export namespace State {
    export type New<Def extends string> = From<{
        L: Left.New
        R: Def
    }>

    export type Of<L extends Left> = {
        L: L
        R: string
    }

    export type With<Constraints extends Partial<Left>> = {
        L: Left & Constraints
        R: string
    }

    export type From<S extends State> = S

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }

    export type Suffix = Of<Left.Suffix>

    export type WithRoot<Root> = Of<Left.WithRoot<Root>>

    export type Suffixable = {
        L: {
            nextSuffix: string
        }
    }
}
