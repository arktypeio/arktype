import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import { Terminal } from "../../terminal.js"

export class BigintNode extends Terminal.Node<"bigint"> {
    constructor() {
        super("bigint")
    }

    check(state: Check.State) {
        if (typeof state.data !== "bigint") {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be a bigint",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
