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
import { existsSync, rmSync, writeFileSync } from "node:fs"
import type { VariableDeclaration, VariableStatement } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import ts from "typescript"
import { addNumber } from "./atcAddNumberEx.js"

const functionRegexMatcher = /addNumber(.+)/g

export const findArktypeReferenceCalls = (paths: string[]): string => {
    const project = new Project({})
    let filteredDeclarations: VariableStatement[] = []
    const output: string[] = []
    for (const path of paths) {
        project.addSourceFileAtPathIfExists(path)
    }
    for (const file of project.getSourceFiles()) {
        filteredDeclarations = file
            .getDescendantsOfKind(SyntaxKind.VariableStatement)
            .filter(
                (dec) =>
                    dec.getDescendantsOfKind(SyntaxKind.ArrowFunction)
                        .length === 0
            )
    }

    for (const filteredDeclaration of filteredDeclarations) {
        const callExpression =
            filteredDeclaration.getFirstDescendantByKindOrThrow(
                SyntaxKind.CallExpression
            )
        const functionName = callExpression.getFirstDescendantByKindOrThrow(
            SyntaxKind.Identifier
        )
        const parameters = callExpression.getDescendantsOfKind(
            SyntaxKind.NumericLiteral
        )

        if (functionName.getText() === "addNumber") {
            const returnValue = addNumber(
                ...(parameters.map((param) =>
                    eval(ts.transpile(param.getText()))
                ) as [number, number])
            )

            callExpression.replaceWithText(returnValue.toString())
        }
        //sourceFile.emit() should do this
        output.push(`${filteredDeclaration.getText()}`)
    }
    return output.join("\n")
}

const writeToTsFile = (data: string) => {
    const outputPath = "./atcOutput.ts"
    const contents = `${data}`
    if (existsSync(outputPath)) {
        rmSync(outputPath)
    }
    writeFileSync(outputPath, contents)
}

const runnerScript = () => {
    const precompiledData = findArktypeReferenceCalls(["./atcAddNumberEx.ts"])
    writeToTsFile(precompiledData)
}
runnerScript()
