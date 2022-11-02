/* eslint-disable max-lines-per-function */
/**
 * Extract them via ts-morph in isolation of the rest of the code,
 * run them and get the results. If there is an error,
 * e.g. because they reference a variable that is defined outside the type
 * call or use another import, throw an error. type/space calls should be
 * self-contained to be precompilable.
 */
import type { VariableStatement } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import ts from "typescript"
import { addNumber } from "./atcAddNumberEx.js"

export const findArktypeReferenceCalls = (paths: string[]): string => {
    const project = new Project({})
    const output: string[] = []
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
            const args = callExpression.getDescendantsOfKind(
                SyntaxKind.NumericLiteral
            )

            if (functionName.getText() === "addNumber") {
                const returnValue = addNumber(
                    ...(args.map((param) =>
                        eval(ts.transpile(param.getText()))
                    ) as [number, number])
                )

                callExpression.replaceWithText(returnValue.toString())
            }
            file.emitSync()
        }
    }

    return output.join("\n")
}

const runnerScript = () => {
    findArktypeReferenceCalls(["./atcAddNumberEx.ts"])
}

runnerScript()
