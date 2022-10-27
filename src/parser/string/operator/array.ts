import { Attributes } from "../../../attributes/attributes.js"
import type { Scanner } from "../state/scanner.js"
import type { DynamicState, StaticState } from "../state/state.js"

export namespace ArrayOperator {
    export const parse = (s: DynamicState.WithRoot) => {
        const next = s.scanner.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.root = arrayOf(s.root)
        return s
    }

    export type parse<
        s extends StaticState.WithRoot,
        unscanned extends string
    > = unscanned extends Scanner.shift<"]", infer remaining>
        ? StaticState.setRoot<s, [s["root"], "[]"], remaining>
        : StaticState.error<incompleteTokenMessage>

    export const arrayOf = (elementAttributes: Attributes) =>
        Attributes.reduce(
            "prop",
            Attributes.init("type", "array"),
            true,
            elementAttributes
        )

    export const incompleteTokenMessage = `Missing expected ']'.`

    type incompleteTokenMessage = typeof incompleteTokenMessage
}
