import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../traverse/check/check.js"
import { Terminal } from "../terminal.js"

export class ObjectNode extends Terminal.Node<"object"> {
    constructor() {
        super("object")
    }

    check(state: Check.State) {
        if (typeof state.data !== "object" || state.data === null) {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be an object",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
