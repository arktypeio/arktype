import type { CallExpression } from "ts-morph"
import { Project, SyntaxKind } from "ts-morph"
import { type } from "../../src/main.js"

const arktypeFunctions = {
    type
}

export const precompileArktypeCalls = (paths: string[]) => {
    const project = new Project({})
    for (const path of paths) {
        project.addSourceFileAtPathIfExists(path)
    }
    for (const file of project.getSourceFiles()) {
        const callExpressions = file.getDescendantsOfKind(
            SyntaxKind.CallExpression
        )
        for (const callExpression of callExpressions) {
            const firstChild = callExpression.getFirstChildOrThrow()
            const functionName = firstChild.isKind(SyntaxKind.Identifier)
                ? firstChild.getText()
                : firstChild
                      .getDescendantsOfKind(SyntaxKind.Identifier)
                      .slice(-1)[0]
                      ?.getText()

            if (!functionName || !(functionName in arktypeFunctions)) {
                continue
            }
            const stringifiedAttributes = getStringifiedAttributes({
                functionName,
                callExpression
            })
            callExpression.replaceWithText(stringifiedAttributes)
        }
        file.saveSync()
    }
}

const evalArgs = (functionToCall: Function, callExpression: CallExpression) =>
    functionToCall(
        ...callExpression.getArguments().map((arg) => {
            return eval(`(${arg.getText()})`)
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

precompileArktypeCalls(["./test/test.ts"])
