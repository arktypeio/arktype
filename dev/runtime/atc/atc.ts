/* eslint-disable max-lines-per-function */

import type { VariableStatement } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import ts from "typescript"
import { type } from "../../../src/type.js"

export const findArktypeReferenceCalls = (paths: string[]) => {
    const project = new Project({})
    for (const path of paths) {
        project.addSourceFileAtPathIfExists(path)
    }
    for (const file of project.getSourceFiles()) {
        const filteredStatements: VariableStatement[] = file
            .getDescendantsOfKind(SyntaxKind.VariableStatement)
            .filter(
                (dec) =>
                    dec.getDescendantsOfKind(SyntaxKind.ArrowFunction)
                        .length === 0
            )
        for (const filteredDeclaration of filteredStatements) {
            const callExpression =
                filteredDeclaration.getFirstDescendantByKindOrThrow(
                    SyntaxKind.CallExpression
                )
            const functionName = callExpression.getFirstDescendantByKindOrThrow(
                SyntaxKind.Identifier
            )
            if (functionName.getText() === "type") {
                // evalArg function plz

                const returnValue = type(
                    ...(callExpression.getArguments().map((arg) => {
                        return eval(ts.transpile(`(${arg.getText()})`))
                    }) as Parameters<typeof type>)
                )

                const stringifiedAttributes = JSON.stringify(
                    returnValue.attributes,
                    (key, val) =>
                        typeof val === "function" ? String(val) : val
                )
                callExpression.replaceWithText(stringifiedAttributes)
            }

            file.emitSync()
        }
    }
}

const runnerScript = () => {
    findArktypeReferenceCalls(["./atcTypeEx.ts"])
}

runnerScript()
