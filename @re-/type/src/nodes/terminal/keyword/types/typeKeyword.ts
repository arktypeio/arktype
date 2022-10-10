import type { NormalizedJsTypeName } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import type { Terminal } from "../../terminal.js"
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
    export type Definition = keyof InferredAs

    export type Infer<Def extends Definition> = InferredAs[Def]

    export const nodes = {
        any: new AnyNode(),
        bigint: new BigintNode(),
        boolean: new BooleanNode(),
        never: new NeverNode(),
        null: new NullNode(),
        number: new NumberNode(),
        object: new ObjectNode(),
        string: new StringNode(),
        symbol: new SymbolNode(),
        undefined: new UndefinedNode(),
        unknown: new UnknownNode(),
        void: new VoidNode(),
        Function: new FunctionNode()
    }

    /** Check whether the keyword type allows state.data, appending new
     * diagnostics if needed and returning a boolean indicating whether or not
     * the data was allowed */
    export const allows = (keyword: Definition, state: Check.State) => {
        const priorErrorCount = state.errors.length
        nodes[keyword].check(state)
        return priorErrorCount === state.errors.length
    }

    export type InferredAs = {
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

    export type Diagnostic = Check.ConfigureDiagnostic<
        Terminal.Node<Definition>,
        { actual: NormalizedJsTypeName }
    >
}
