import { Project, SyntaxKind, VariableStatement } from "ts-morph"
import { fromHere, shell } from "@re-/node"

type ExpectedValueMap = Record<string, string>
const defineExpectedValues = <ExpectedValues extends ExpectedValueMap>(
    expectedValues: ExpectedValues
) => expectedValues

const snapValuesInitiallyEmptyExpected = defineExpectedValues({
    errorCheck: `Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'.`,
    5: "5",
    type: `{ re: string; }`,
    object: "{re: `do`}",
    multiline: `firstLine
secondLine`
})

const pulled = (whichTests: string, varStatements: VariableStatement[]) =>
    varStatements
        .find((statement) => statement.getText().includes(whichTests))
        ?.getDescendantsOfKind(SyntaxKind.ExpressionStatement)

export const getStuff = (whichTests: string) => {
    const p = new Project()
    const sourceFile = p.addSourceFileAtPath(fromHere("emptySnaps.ts"))
    const varStatements = sourceFile.getVariableStatements()
    const fullText = sourceFile.getFullText()

    //This doesn't work
    const nodeExecutable = process.execPath
    shell(
        `${nodeExecutable}  --loader ts-node/esm ${fromHere("emptySnaps.ts")}`
    )

    sourceFile.replaceWithText(fullText)
    sourceFile.save()
    switch (whichTests) {
        case "emptySnaps":
            const statements = pulled(whichTests, varStatements)
            return {
                statements: statements || [],
                expected: snapValuesInitiallyEmptyExpected,
                fullText
            }
        default:
            return {
                statements: [],
                expected: {},
                fullText
            }
    }
}
getStuff("emptySnaps")
