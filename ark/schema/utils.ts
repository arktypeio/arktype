import { type BasisKind } from "./bases/basis.ts"
import { type Node } from "./nodes.ts"

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export type ParseContext = {
	basis: Node<BasisKind> | undefined
}

export const createParseContext = (): ParseContext => ({
	basis: undefined
})
