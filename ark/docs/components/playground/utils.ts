import type * as Monaco from "monaco-editor"

export const defaultPlaygroundCode = `import { type } from "arktype"

const MyType = type({
    name: "string",
    age: "number"
})

const out = MyType({
    name: "Anders Hejlsberg",
    age: null
})
`

export const editorFileUri = "file:///main.ts"

export type ResultKind = "failure" | "success" | "none"

export const backgroundsByResultKind: Record<ResultKind, string> = {
	failure: "#17080888",
	success: "#08161788",
	none: "#080d17"
}

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
