import type { NormalizedJsTypeName } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import type { Terminal } from "../terminal.js"
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

export namespace TypeKeyword {
    const nodes: Record<Definition, Terminal.Node<Definition>> = {
        any: new AnyNode(),
        bigint: new BigintNode(),
        boolean: new BooleanNode(),
        Function: new FunctionNode(),
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

    type Types = {
        any: any
        bigint: bigint
        boolean: boolean
        never: never
        null: null
        number: number
        object: object
        string: string
        symbol: symbol
        undefined: undefined
        unknown: unknown
        void: void
        Function: Function
    }

    export type Definition = keyof Types

    export type Infer<Def extends Definition> = Types[Def]

    export const matches = (def: string): def is Definition => def in nodes

    export const getNode = (def: Definition) => nodes[def]

    export type Diagnostic = Check.ConfigureDiagnostic<
        Terminal.Node<Definition>,
        { actual: NormalizedJsTypeName }
    >
}
