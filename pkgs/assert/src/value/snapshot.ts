import { join, dirname, relative, isAbsolute } from "deno/std/path/mod.ts"
import { readJsonSync, SourcePosition, writeJsonSync } from "src/common.ts"
import { Project, ts, SyntaxKind, CallExpression } from "ts-morph"

export interface BaseSnapShotArgs {
    position: SourcePosition
    value: string
}

export interface InlineSnapshotArgs extends BaseSnapShotArgs {
    project: Project
}

export interface ExternalSnapshotArgs extends BaseSnapShotArgs {
    name: string
    path?: string
}

export const updateInlineSnapshot = ({
    position,
    value,
    project
}: InlineSnapshotArgs) => {
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

export const resolveSnapshotPath = (
    testFile: string,
    customPath: string | undefined
) => {
    if (customPath && isAbsolute(customPath)) {
        return customPath
    }
    return join(dirname(testFile), customPath ?? "assert.snapshots.json")
}

export const updateExternalSnapshot = ({
    value,
    position,
    name,
    path
}: ExternalSnapshotArgs) => {
    const snapshotPath = resolveSnapshotPath(position.file, path)
    const snapshotData = readJsonSync(snapshotPath) ?? {}
    snapshotData[position.file] = {
        ...snapshotData[position.file],
        [name]: value
    }
    writeJsonSync(snapshotPath, snapshotData)
}

export const getSnapshotByName = (
    file: string,
    name: string,
    customPath: string | undefined
) => {
    const snapshotPath = resolveSnapshotPath(file, customPath)
    return readJsonSync(snapshotPath)?.[file]?.[name]
}
