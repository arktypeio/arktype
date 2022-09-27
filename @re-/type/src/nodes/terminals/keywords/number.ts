import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NumberNode extends TerminalNode<
    NumberTypedKeyword,
    { bound: true; regex: true }
> {
    typecheck(state: Check.CheckState) {
        if (!state.dataIsOfType("number")) {
            if (this.typeDef === "number") {
                addTypeKeywordDiagnostic(state, "number", "Must be a number")
            } else {
                addTypeKeywordDiagnostic(
                    state,
                    "integer",
                    "Must be a number",
                    "number"
                )
            }
            return
        }
        if (this.typeDef === "integer" && !Number.isInteger(state.data)) {
            state.errors.add(
                "numberSubtype",
                { reason: "Must be an integer", state: state },
                {
                    definition: "integer",
                    actual: state.data
                }
            )
        }
    }

    generate() {
        return 0
    }
}

export const numberTypedKeywords = {
    number: NumberNode,
    integer: NumberNode
}

export type NumberTypedKeyword = keyof typeof numberTypedKeywords

export type NumberSubtypeKeyword = Exclude<NumberTypedKeyword, "number">

export type NumberSubtypeDiagnostic = Check.DiagnosticConfig<{
    definition: NumberSubtypeKeyword
    actual: number
}>
