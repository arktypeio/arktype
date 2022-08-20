import { ClassOf, InstanceOf, isEmpty } from "@re-/tools"
import { Node } from "../common.js"
import { Expression, Suffix } from "./expression.js"
import { Scanner } from "./scanner.js"

export class State<L extends Expression = Expression> {
    l: L
    r: Scanner

    constructor(def: string, initial: L) {
        this.l = initial
        this.r = new Scanner(def)
    }

    error(message: string): never {
        throw new Node.ParseError(message)
    }

    hasRoot = <NodeClass extends ClassOf<Node.Base> = ClassOf<Node.Base>>(
        ofClass?: NodeClass
    ): this is State<Expression & { root: InstanceOf<NodeClass> }> =>
        ofClass ? this.l.root instanceof ofClass : this.l.root !== undefined

    isPrefixable() {
        return (
            isEmpty(this.l.bounds) &&
            isEmpty(this.l.branches) &&
            !this.l.groups.length
        )
    }

    isSuffixable(): this is State<Suffix> {
        return this.l.nextSuffix !== undefined
    }
}

export namespace State {
    export type T = {
        L: Expression.T
        R: string
    }

    export type Of<L extends Expression.T> = {
        L: L
        R: string
    }

    export type From<L extends Expression.T, R extends string> = {
        L: L
        R: R
    }

    export type Error<Message extends string> = {
        L: Expression.Error<Message>
        R: ""
    }
}
