import { ts } from "ts-morph"
import { positionToString, SourcePosition } from "../common.js"
import { getDefaultTsMorphProject } from "./getTsMorphProject.js"

export const getTsNodeAtPosition = (position: SourcePosition) => {
    const project = getDefaultTsMorphProject()
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
