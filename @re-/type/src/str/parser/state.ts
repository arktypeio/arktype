import { ClassOf, InstanceOf } from "@re-/tools"
import { Base } from "../../base/index.js"
import { Scanner } from "./scanner.js"
import { SuffixToken } from "./tokens.js"

type BaseLeft = {
    root?: Base.Node
    nextSuffix?: SuffixToken
}

export class State<Left extends BaseLeft> {
    l: Left
    r: Scanner

    constructor(def: string, initial: Left) {
        this.l = initial
        this.r = new Scanner(def)
    }

    error(message: string) {
        throw new Base.Parse.ParseError(message)
    }

    rootIs = <NodeClass extends ClassOf<Base.Node>>(
        nodeClass: NodeClass
    ): this is State<Left & { root: InstanceOf<NodeClass> }> =>
        this.l.root instanceof nodeClass
}

export namespace State {
    export type Of<Left> = {
        L: Left
        R: string
    }

    export type From<L, R extends string> = {
        L: L
        R: R
    }

    export type Error<Message extends string> = {
        L: Expression.Error<Message>
        R: ""
    }
}
