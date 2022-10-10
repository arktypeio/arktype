import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import { Terminal } from "../../terminal.js"

export class BooleanNode extends Terminal.Node<"boolean"> {
    constructor() {
        super("boolean")
    }

    allows(state: Check.State) {
        if (typeof state.data !== "boolean") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be boolean",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
