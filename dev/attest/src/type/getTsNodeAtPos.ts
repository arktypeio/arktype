import type { Project } from "ts-morph"
import { ts } from "ts-morph"
import type { SourcePosition } from "../utils.js"
import { positionToString } from "../utils.js"

export const getTsNodeAtPosition = (
	project: Project,
	position: SourcePosition
) => {
	const sourceFile = project.getSourceFileOrThrow(position.file)
	const node = sourceFile.getDescendantAtPos(
		ts.getPositionOfLineAndCharacter(
			sourceFile.compilerNode,
			// TS uses 0-based line and char #s
			position.line - 1,
			position.char - 1
		)
	)
	if (!node) {
		throw new Error(
			`Expected node at ${positionToString(position)} did not exist.`
		)
	}
	return node
}
