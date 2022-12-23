import { ts } from "ts-morph"

import type { SourcePosition } from "../utils.ts"
import { positionToString } from "../utils.ts"
import { getVirtualTsMorphProject } from "./getTsMorphProject.ts"

export const getTsNodeAtPosition = (position: SourcePosition) => {
    const project = getVirtualTsMorphProject()
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
