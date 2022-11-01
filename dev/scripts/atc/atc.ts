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
import { shell } from "@arktype/runtime"
import type { VariableDeclaration } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import { addNumber } from "./atcEx.js"

const functionRegexMatcher = /addNumber(.+)/g

export const findArktypeReferenceCalls = (paths: string[]): string => {
    const project = new Project({})
    let f: VariableDeclaration[] = []
    for (const path of paths) {
        project.addSourceFileAtPathIfExists(path)
    }
    for (const file of project.getSourceFiles()) {
        f = file
            .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
            .filter(
                (dec) =>
                    dec.getDescendantsOfKind(SyntaxKind.ArrowFunction)
                        .length === 0
            )
    }

    for (const atc of f) {
        const callExpression = atc.getFirstDescendantByKindOrThrow(
            SyntaxKind.CallExpression
        )
        const functionName = callExpression.getFirstDescendantByKindOrThrow(
            SyntaxKind.Identifier
        )
        const parameters = callExpression.getDescendantsOfKind(
            SyntaxKind.NumericLiteral
        )

        // callExpression.getArguments

        //MAKE OP DESERIALIZER
        // const breakParamsDown = (param) => {
        //     //just eval and done?

        //     //object -> do this
        //     //function -> do that
        //     return JSON.parse(param.getText()) as [
        //         number,
        //         number
        //     ]
        // }
        if (functionName.getText() === "addNumber") {
            const res = addNumber(
                ...(parameters.map((param) => parseInt(param.getText())) as [
                    number,
                    number
                ])
            )
            //res is thing i want.
            //Json stringify output
            // callExpression.replaceWithText
            console.log(res)
        }

        // extract function

        // extract params
        // call and get result
        // write that result
    }
    return "[]"
}

const writeToTsFile = (data: string) => {
    const outputPath = "./atcOutput.ts"
    const atcImports = `import { space, type } from "../../src/api"`
    const contents = `${atcImports}\n${data}`
    if (existsSync(outputPath)) {
        rmSync(outputPath)
    }
    writeFileSync(outputPath, contents)
}

const runnerScript = () => {
    const data = findArktypeReferenceCalls(["./atcEx.ts"])
    // writeToTsFile(data)
}
runnerScript()
