import type { Attributes } from "../state/attributes.js"
import type { Scanner } from "../state/scanner.js"
import type { State } from "../state/state.js"

export const parseArray = (s: State.DynamicWithRoot) => {
    const next = s.scanner.shift()
    if (next !== "]") {
        throw new Error(incompleteArrayTokenMessage)
    }
    s.root = arrayOf(s.root)
    return s
}

export type parseArray<
    s extends State.StaticWithRoot,
    unscanned extends string
> = unscanned extends Scanner.shift<"]", infer remaining>
    ? State.setRoot<s, [s["root"], "[]"], remaining>
    : State.error<incompleteArrayTokenMessage>

export const arrayOf = (elementAttributes: Attributes): Attributes => ({
    type: "array",
    props: {
        "*": elementAttributes
    }
})

export const incompleteArrayTokenMessage = `Missing expected ']'`

type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage
