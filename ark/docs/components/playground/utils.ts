import type * as Monaco from "monaco-editor"

export const defaultPlaygroundCode = `import { type } from "arktype"

export const MyType = type({
    name: "string",
    age: "number"
})

export const out = MyType({
    name: "Anders Hejlsberg",
    age: null
})
`

export const editorFileUri = "file:///main.ts"

type RequestMap = Map<string, number>

const duplicateThresholdMs = 50

const recentRequests: RequestMap = new Map()

export const createPositionHash = (
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
): string => `${model.uri}:${position.lineNumber}:${position.column}`

export const isDuplicateRequest = (positionHash: string): boolean => {
	const now = Date.now()
	const lastRequest = recentRequests.get(positionHash)

	if (lastRequest && now - lastRequest < duplicateThresholdMs) return true

	recentRequests.set(positionHash, now)
	return false
}
