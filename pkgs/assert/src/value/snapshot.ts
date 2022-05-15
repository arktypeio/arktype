import { join, dirname } from "@deno/path"
import { SourcePosition, LinePosition } from "../positions.js"
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

export const getDefaultSnapshotPath = (testFile: string) =>
    join(dirname(testFile), "assert.snapshots.json")

export const updateExternalSnapshot = ({
    value,
    position,
    name,
    path
}: ExternalSnapshotArgs) => {
    const snapshotPath = path ?? getDefaultSnapshotPath(position.file)
    const snapshotData = getSnapshots(snapshotPath)
    snapshotData[position.file] = {
        ...snapshotData[position.file],
        [name]: value
    }
    Deno.writeTextFileSync(snapshotPath, JSON.stringify(snapshotData, null, 4))
}

export interface GetSnapshotsOptions {
    path?: string
}

export const getSnapshots = (path: string) => {
    try {
        return JSON.parse(Deno.readTextFileSync(path))
    } catch {
        return {}
    }
}

export const getSnapshotByName = (
    file: string,
    name: string,
    { path }: GetSnapshotsOptions
) => getSnapshots(path ?? getDefaultSnapshotPath(file))[file]?.[name]
