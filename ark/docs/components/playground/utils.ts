import * as Monaco from "monaco-editor"

export const recentRequests: Map<string, number> = new Map()

export const createPositionHash = (
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
): string => `${model.uri}:${position.lineNumber}:${position.column}`

export const isDuplicateRequest = (
	positionHash: string,
	duplicateThresholdMs = 50
): boolean => {
	const now = Date.now()
	const lastRequest = recentRequests.get(positionHash)

	if (lastRequest && now - lastRequest < duplicateThresholdMs) return true

	recentRequests.set(positionHash, now)
	return false
}

export const findNearestTokenBoundary = (
	model: Monaco.editor.ITextModel,
	position: Monaco.Position
): Monaco.Position => {
	const lineContent = model.getLineContent(position.lineNumber)

	if (position.column > lineContent.length) return position

	let column = position.column
	const char = lineContent[column - 1]

	if (/\s/.test(char)) {
		while (column <= lineContent.length && /\s/.test(lineContent[column - 1]))
			column++

		if (column > lineContent.length)
			return new Monaco.Position(position.lineNumber, lineContent.length + 1)

		return new Monaco.Position(position.lineNumber, column)
	}

	const token = model.getWordAtPosition(position)
	if (token) return new Monaco.Position(position.lineNumber, token.endColumn)

	return position
}
