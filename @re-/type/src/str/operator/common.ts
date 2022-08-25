export * from "../common.js"
export * as Parser from "../parser/index.js"
import { Node } from "../common.js"
import * as Parser from "../parser/index.js"

export namespace Operator {
    export type state = Parser.state<Parser.left.withRoot>
}

export abstract class operator<
    Children extends Node.parseChildren = Node.base
> extends Node.nonTerminal<Children> {
    abstract get tree(): Node.ParseTree[]

    toString() {
        return this.tree.flatMap((_) => _).join("")
    }
}
