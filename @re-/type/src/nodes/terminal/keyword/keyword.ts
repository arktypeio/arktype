import { AnyNode } from "./any.js"
import { BigintNode } from "./bigint.js"
import { BooleanNode } from "./boolean.js"
import { FunctionNode } from "./function.js"
import { NeverNode } from "./never.js"
import { NullNode } from "./null.js"
import { NumberNode } from "./number.js"
import { ObjectNode } from "./object.js"
import { StringNode } from "./string.js"
import { SymbolNode } from "./symbol.js"
import { UndefinedNode } from "./undefined.js"
import { UnknownNode } from "./unknown.js"
import { VoidNode } from "./void.js"

export namespace Keyword {
    const nodes = {
        any: new AnyNode(),
        bigint: new BigintNode(),
        boolean: new BooleanNode(),
        function: new FunctionNode(),
        never: new NeverNode(),
        null: new NullNode(),
        number: new NumberNode(),
        object: new ObjectNode(),
        string: new StringNode(),
        symbol: new SymbolNode(),
        undefined: new UndefinedNode(),
        unknown: new UnknownNode(),
        void: new VoidNode()
    }

    type NodeTypes = typeof nodes

    export type Definition = keyof NodeTypes

    export type Infer<Def extends Definition> = ReturnType<
        NodeTypes[Def]["generate"]
    >

    export const matches = (def: string): def is Definition => def in nodes

    export const getNode = (def: Definition) => nodes[def]
}
