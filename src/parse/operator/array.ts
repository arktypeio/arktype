import type { Attributes } from "../state/attributes/attributes.js"
import type { Scanner } from "../state/scanner.js"
import type {
    DynamicWithRoot,
    setStateRoot,
    StaticWithRoot
} from "../state/static.js"
import { errorState } from "../state/static.js"

export const parseArray = (s: DynamicWithRoot) => {
    const next = s.scanner.shift()
    if (next !== "]") {
        return errorState(incompleteArrayTokenMessage)
    }
    s.root.reinitialize(arrayOf(s.root.eject()))
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
