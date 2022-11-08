import { writeFileSync } from "node:fs"
import { join } from "node:path"
import type { CallExpression, SourceFile } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import ts from "typescript"
import { type } from "../../src/type.js"
import { fromHere } from "./src/fs.js"

export const findArktypeReferenceCalls = (paths: string[]) => {
    const precompiledDir = fromHere(".temp.prearktype")
    const project = new Project({})
    for (const path of paths) {
        project.addSourceFileAtPathIfExists(path)
    }
    for (const file of project.getSourceFiles()) {
        const filteredStatements = getStatements(file)
        for (const statement of filteredStatements) {
            const callExpression = statement.getFirstDescendantByKindOrThrow(
                SyntaxKind.CallExpression
            )
            const functionName = callExpression.getFirstDescendantByKindOrThrow(
                SyntaxKind.Identifier
            )
            const stringifiedAttributes = getStringifiedAttributes({
                functionName: functionName.getText(),
                callExpression
            })
            callExpression
                .replaceWithText(stringifiedAttributes)
                .formatText({ placeOpenBraceOnNewLineForControlBlocks: true })
        }
        const outputFile = join(precompiledDir, file.getBaseName())
        writeFileSync(outputFile, file.getFullText())
    }
}

const evalArgs = (functionToCall: Function, callExpression: CallExpression) =>
    functionToCall(
        ...callExpression.getArguments().map((arg) => {
            return eval(ts.transpile(`(${arg.getText()})`))
        })
    )

type DeclarationDetails = {
    functionName: string
    callExpression: CallExpression
}

const getStringifiedAttributes = ({
    functionName,
    callExpression
}: DeclarationDetails) => {
    let evalResult
    if (functionName === "type") {
        evalResult = evalArgs(type, callExpression).attributes
    }
    return JSON.stringify(evalResult, (key, val) =>
        typeof val === "function" ? String(val) : val
    )
}

const getStatements = (file: SourceFile) =>
    file
        .getDescendantsOfKind(SyntaxKind.VariableStatement)
        .filter(
            (dec) =>
                dec.getDescendantsOfKind(SyntaxKind.ArrowFunction).length === 0
        )
