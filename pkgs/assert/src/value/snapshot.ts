import { resolve } from "@deno/path"
import { SourcePosition, LinePosition } from "../positions.ts"
import { Project, ts, SyntaxKind, CallExpression } from "ts-morph"

export type SnapshotUpdateArgs = {
    position: SourcePosition
    value: string
    project?: Project
}

const linePositionToKey = (position: LinePosition) =>
    `${position.line}:${position.char}`

export const expectedSnapshotsPath = resolve("assert.snapshots.json")

export const updateInlineSnapshot = ({
    position,
    value,
    project
}: SnapshotUpdateArgs) => {
    if (project) {
        const file = project.getSourceFile(position.file)
        if (!file) {
            throw new Error(`Unknown file ${file}.`)
        }
        const assertIdentifier = file.getDescendantAtPos(
            ts.getPositionOfLineAndCharacter(
                file.compilerNode,
                // TS uses 0-based line and char #s
                position.line - 1,
                position.char - 1
            )
        )
        if (
            assertIdentifier?.getKind() !== SyntaxKind.Identifier ||
            assertIdentifier.getText() !== "assert"
        ) {
            throw new Error(`Unable to update your snapshot.`)
        }
        const snapCall = assertIdentifier
            .getAncestors()
            .find(
                (ancestor) =>
                    ancestor.getKind() === SyntaxKind.CallExpression &&
                    ancestor.getText().replace(" ", "").endsWith("snap()")
            ) as CallExpression
        snapCall.addArgument("`" + value + "`")
        file.saveSync()
    }
}

export const updateExternalSnapshot = ({
    position,
    value
}: SnapshotUpdateArgs) => {
    const snapshotData = getSnapshots()
    snapshotData[position.file] = {
        ...snapshotData[position.file],
        [linePositionToKey(position)]: value
    }
    Deno.writeTextFileSync(
        expectedSnapshotsPath,
        JSON.stringify(snapshotData, null, 4)
    )
}

export const getSnapshots = () => {
    try {
        return JSON.parse(Deno.readTextFileSync(expectedSnapshotsPath))
    } catch {
        return {}
    }
}

export const getSnapshotByPosition = (position: SourcePosition) =>
    getSnapshots()[position.file]?.[linePositionToKey(position)]
