import type { Attributes } from "../state/attributes/attributes.js"
import type { Scanner } from "../state/scanner.js"
import type {
    DynamicWithRoot,
    setStateRoot,
    StaticWithRoot
} from "../state/state.js"
import { errorState } from "../state/state.js"

export const parseArray = (s: DynamicWithRoot) => {
    const next = s.scanner.shift()
    if (next !== "]") {
        return errorState(incompleteArrayTokenMessage)
    }
    s.root = arrayOf(s.root)
    return s
}

export type parseArray<
    s extends StaticWithRoot,
    unscanned extends string
> = unscanned extends Scanner.shift<"]", infer remaining>
    ? setStateRoot<s, [s["root"], "[]"], remaining>
    : errorState<incompleteArrayTokenMessage>

export const arrayOf = (elementAttributes: Attributes): Attributes => ({
    type: "array",
    props: {
        "*": elementAttributes
    }
})

export const incompleteArrayTokenMessage = `Missing expected ']'`

type incompleteArrayTokenMessage = typeof incompleteArrayTokenMessage
