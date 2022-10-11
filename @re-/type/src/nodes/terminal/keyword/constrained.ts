import type { Base } from "../../common.js"
import { Divisibility } from "../../expression/divisibility.js"
import { PrimitiveLiteral } from "../primitiveLiteral.js"
import { Terminal } from "../terminal.js"
import { TypeKeyword } from "./types/typeKeyword.js"

export namespace ConstrainedKeyword {
    export type Definition = "integer"

    export class IntegerNode extends Terminal.Node<Definition> {
        constructor() {
            super("integer")
        }

        get description() {
            return this.description
        }

        allows(state: Check.State<string>) {
            if (
                TypeKeyword.allows("number", state.data) &&
                !Number.isInteger(state.data)
            ) {
                state.addError("keyword", {
                    type: this,
                    message: this.description
                })
            }
        }
    }

    export const nodes: Record<Definition, Base.Node> = {
        integer: new Divisibility.Node(
            TypeKeyword.nodes["number"],
            "%",
            new PrimitiveLiteral.Node("1" as const, 1)
        )
    }
}
