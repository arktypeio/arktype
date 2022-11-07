/* eslint-disable max-lines-per-function */
/**
 * Extract them via ts-morph in isolation of the rest of the code,
 * run them and get the results. If there is an error,
 * e.g. because they reference a variable that is defined outside the type
 * call or use another import, throw an error. type/space calls should be
 * self-contained to be precompilable.
 *
 * Write the result to a generated dir like .temp.prearktype,
 * then build the rest of the package,
 * then replace the built version of the original dir with the generated one
 *
 * STORE IN A FILE -> make TS
 *
 */

import type { CallExpression, SourceFile, VariableStatement } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import ts from "typescript"
import { space } from "../../../src/space.js"
import { type } from "../../../src/type.js"

export const findArktypeReferenceCalls = (paths: string[]) => {
    const project = new Project({})
    for (const path of paths) {
        project.addSourceFileAtPathIfExists(path)
    }
    for (const file of project.getSourceFiles()) {
        const filteredStatements = getStatements(file)
        for (const filteredDeclaration of filteredStatements) {
            const callExpression =
                filteredDeclaration.getFirstDescendantByKindOrThrow(
                    SyntaxKind.CallExpression
                )
            const functionName = callExpression.getFirstDescendantByKindOrThrow(
                SyntaxKind.Identifier
            )
            const stringifiedAttributes = getStringifiedAttributes({
                functionName: functionName.getText(),
                callExpression
            })
            callExpression.replaceWithText(stringifiedAttributes)
            // file.emitSync()
            // ts => let them decide what to do
            // getFileText() and put into ts
        }
    }
}
type DeclarationDetails = {
    functionName: string
    callExpression: CallExpression
}
const getStringifiedAttributes = ({
    functionName,
    callExpression
}: DeclarationDetails) => {
    if (functionName === "type") {
        const returnValue = type(
            ...(callExpression.getArguments().map((arg) => {
                return eval(ts.transpile(`(${arg.getText()})`))
            }) as Parameters<typeof type>)
        )

        return JSON.stringify(returnValue.attributes, (key, val) =>
            typeof val === "function" ? String(val) : val
        )
    } else if (functionName === "space") {
        const returnValue = type(
            ...(callExpression.getArguments().map((arg) => {
                return eval(ts.transpile(`(${arg.getText()})`))
            }) as Parameters<typeof space>)
        )

        return JSON.stringify(returnValue.attributes, (key, val) =>
            typeof val === "function" ? String(val) : val
        )
    }
}
const getStatements = (file: SourceFile) =>
    file
        .getDescendantsOfKind(SyntaxKind.VariableStatement)
        .filter(
            (dec) =>
                dec.getDescendantsOfKind(SyntaxKind.ArrowFunction).length === 0
        )

const runnerScript = () => {
    findArktypeReferenceCalls(["./atcTypeEx.ts"])
}

runnerScript()
