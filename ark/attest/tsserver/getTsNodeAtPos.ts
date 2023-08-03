import { positionToString } from "@arktype/fs"
import type { SourcePosition } from "@arktype/fs"
import type { Project } from "ts-morph"
import { ts } from "ts-morph"

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
