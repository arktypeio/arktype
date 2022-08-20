import { ClassOf, InstanceOf } from "@re-/tools"
import { Node } from "../common.js"
import { Expression } from "./expression.js"
import { Scanner } from "./scanner.js"

export class State<L extends Expression = Expression> {
    l: L
    r: Scanner

    constructor(def: string, initial: L) {
        this.l = initial
        this.r = new Scanner(def)
    }

    error(message: string) {
        throw new Node.ParseError(message)
    }

    rootIs = <NodeClass extends ClassOf<Node.Base>>(
        nodeClass: NodeClass
    ): this is State<Expression & { root: InstanceOf<NodeClass> }> =>
        this.l.root instanceof nodeClass
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
