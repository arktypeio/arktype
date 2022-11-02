import type { Attributes } from "../../attributes/shared.js"
import type { Scanner } from "../state/scanner.js"
import type { State } from "../state/state.js"

export namespace ArrayOperator {
    export const parse = (s: State.DynamicWithRoot) => {
        const next = s.scanner.shift()
        if (next !== "]") {
            throw new Error(incompleteTokenMessage)
        }
        s.root = arrayOf(s.root)
        return s
    }

    export type parse<
        s extends State.StaticWithRoot,
        unscanned extends string
    > = unscanned extends Scanner.shift<"]", infer remaining>
        ? State.setRoot<s, [s["root"], "[]"], remaining>
        : State.error<incompleteTokenMessage>

    export const arrayOf = (elementAttributes: Attributes): Attributes => ({
        type: "array",
        baseProp: elementAttributes
    })

    export const incompleteTokenMessage = `Missing expected ']'`

    type incompleteTokenMessage = typeof incompleteTokenMessage
}
