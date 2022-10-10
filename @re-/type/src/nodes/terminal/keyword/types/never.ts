import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import { Terminal } from "../../terminal.js"
export class NeverNode extends Terminal.Node<"never"> {
    constructor() {
        super("never")
    }

    allows(state: Check.State) {
        state.addError("typeKeyword", {
            type: this,
            message: "Never allowed",
            actual: jsTypeOf(state.data)
        })
    }
}
