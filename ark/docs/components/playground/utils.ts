import type * as Monaco from "monaco-editor"
import type { CSSProperties } from "react"

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

export const successBg = "#081617cc"
export const failureBg = "#170808cc"

export const editorStyles: CSSProperties = {
	borderRadius: "16px",
	boxShadow:
		"0 10px 15px 0 rgba(0, 0, 0, 0.3), 0 15px 30px 0 rgba(0, 0, 0, 0.22)",
	transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
	backdropFilter: "blur(16px)",
	paddingTop: "16px"
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
