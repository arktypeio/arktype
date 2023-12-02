import type {
    CallExpression,
    Node,
    Project,
    Signature,
    SourceFile,
    Type
} from "ts-morph"
import { SyntaxKind, ts } from "ts-morph"
import type { LinePositionRange } from "../../utils.js"
import { getFileKey } from "../../utils.js"
import type { DiagnosticsByFile } from "./getDiagnosticsByFile.js"

export type AssertionData = {
    location: LinePositionRange
    type: {
        actual: string
        expected?: string
        equivalent?: boolean
    }
    errors: string
}

export const getAssertionsInFile = (
    file: SourceFile,
    diagnosticsByFile: DiagnosticsByFile
): AssertionData[] => {
    const assertCalls = getAttestCalls(file)
    return assertCalls.map((call) => analyzeAssertCall(call, diagnosticsByFile))
}

export const getAttestCalls = (file: SourceFile): CallExpression[] => {
    const assertCalls = file
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(
            (callExpression) =>
                /*
                 * We get might get some extraneous calls to other "attest" functions,
                 * but they won't be referenced at runtime so shouldn't matter.
                 */
                callExpression.getFirstChild()?.getText() === "attest"
        )
    return assertCalls
}

const analyzeAssertCall = (
    assertCall: CallExpression,
    diagnosticsByFile: DiagnosticsByFile
): AssertionData => {
    const assertionTypes = extractAssertionTypesFromCall(assertCall)
    const location = getAssertCallLocation(assertCall)
    const errors = checkDiagnosticMessage(assertCall, diagnosticsByFile)
    const type = assertionTypes.expected
        ? checkTypeAssertion(
              assertionTypes as Required<AssertionTypes>,
              assertCall.getProject()
          )
        : { actual: typeToString(assertionTypes.actual) }
    return {
        location,
        type,
        errors
    }
}

type AssertionTypes = {
    actual: Type
    expected?: Type
}

const extractAssertionTypesFromCall = (
    assertCall: CallExpression
): AssertionTypes => {
    const assertArg = assertCall.getArguments()[0]
    const types: AssertionTypes = {
        actual: assertArg.getType()
    }
    for (const ancestor of assertCall.getAncestors()) {
        const kind = ancestor.getKind()
        if (kind === SyntaxKind.ExpressionStatement) {
            return types
        }
        if (kind === SyntaxKind.PropertyAccessExpression) {
            const propName = ancestor.getLastChild()?.getText()
            if (propName === undefined) {
                continue
            } else if (propName === "returns") {
                types.actual = getReturnType(types.actual)
            } else {
                const possibleExpected = getPossibleExpectedType(
                    propName,
                    ancestor
                )
                if (possibleExpected) {
                    types.expected = possibleExpected
                }
            }
        }
    }
    return types
}

const getPossibleExpectedType = (propName: string, ancestor: Node<ts.Node>) => {
    if (propName === "typedValue") {
        const typedValueCall = ancestor.getParentIfKind(
            SyntaxKind.CallExpression
        )
        if (typedValueCall) {
            return typedValueCall.getArguments()[0].getType()
        }
    } else if (propName === "typed") {
        const typedAsExpression = ancestor.getParentIfKind(
            SyntaxKind.AsExpression
        )
        if (typedAsExpression) {
            return typedAsExpression.getType()
        }
    }
}

const getReturnType = (actual: Type) => {
    const signatureSources = actual.isUnion()
        ? actual.getUnionTypes()
        : actual.isIntersection()
        ? actual.getIntersectionTypes()
        : [actual]
    const signatures: Signature[] = []
    for (const signatureSource of signatureSources) {
        signatures.push(...signatureSource.getCallSignatures())
    }
    if (!signatures.length) {
        throw new Error(`Unable to extract the return type.`)
    } else if (signatures.length > 1) {
        throw new Error(
            `Unable to extract the return of a function with multiple signatures.`
        )
    }
    return signatures[0].getReturnType()
}

const getAssertCallLocation = (assertCall: CallExpression) => {
    const start = ts.getLineAndCharacterOfPosition(
        assertCall.getSourceFile().compilerNode,
        assertCall.getStart()
    )
    const end = ts.getLineAndCharacterOfPosition(
        assertCall.getSourceFile().compilerNode,
        assertCall.getEnd()
    )
    // Add 1 to everything, since trace positions are 1-based and TS positions are 0-based.
    const location: LinePositionRange = {
        start: {
            line: start.line + 1,
            char: start.character + 1
        },
        end: {
            line: end.line + 1,
            char: end.character + 1
        }
    }
    return location
}

const checkDiagnosticMessage = (
    assertCall: CallExpression,
    diagnosticsByFile: DiagnosticsByFile
) => {
    const assertedArg = assertCall.getArguments()[0]
    const fileKey = getFileKey(assertedArg.getSourceFile().getFilePath())
    const fileDiagnostics = diagnosticsByFile[fileKey]
    if (!fileDiagnostics) {
        return ""
    }
    const diagnosticMessagesInArgRange: string[] = []
    for (const diagnostic of fileDiagnostics) {
        if (
            diagnostic.start >= assertedArg.getStart() &&
            diagnostic.end <= assertedArg.getEnd()
        ) {
            diagnosticMessagesInArgRange.push(diagnostic.message)
        }
    }
    return diagnosticMessagesInArgRange.join("\n")
}

const typeToString = (type: Type) =>
    (type.compilerType as any).intrinsicName === "error"
        ? `Unable to resolve type of '${type.getText()}'.`
        : type.getText()

const checkTypeAssertion = (
    assertionTypes: Required<AssertionTypes>,
    project: Project
): Required<AssertionData["type"]> => {
    const assertionData: Omit<Required<AssertionData["type"]>, "equivalent"> = {
        actual: typeToString(assertionTypes.actual),
        expected: typeToString(assertionTypes.expected)
    }
    if (
        assertionData.expected.startsWith("Unable to resolve") ||
        assertionData.actual.startsWith("Unable to resolve")
    ) {
        // If either type was unresolvable, treat the comparison as an error
        return { ...assertionData, equivalent: false }
    } else if (
        assertionData.expected === "any" ||
        assertionData.actual === "any"
    ) {
        // If either type is any, just compare the type strings directly
        return {
            ...assertionData,
            equivalent: assertionTypes.actual === assertionTypes.expected
        }
    } else {
        // Otherwise, determine if the types are equivalent by checking mutual assignability
        return {
            ...assertionData,
            equivalent: checkMutualAssignability(assertionTypes, project)
        }
    }
}

// Using any as isTypeAssignableTo is not publicly exposed
const getInternalTypeChecker = (project: Project) =>
    project.getTypeChecker().compilerObject as ts.TypeChecker & {
        isTypeAssignableTo: (first: ts.Type, second: ts.Type) => boolean
    }

const checkMutualAssignability = (
    assertionTypes: Required<AssertionTypes>,
    project: Project
) => {
    const checker = getInternalTypeChecker(project)
    const isActualAssignableToExpected = checker.isTypeAssignableTo(
        assertionTypes.actual.compilerType,
        assertionTypes.expected.compilerType
    )
    const isExpectedAssignableToActual = checker.isTypeAssignableTo(
        assertionTypes.expected.compilerType,
        assertionTypes.actual.compilerType
    )
    return isActualAssignableToExpected && isExpectedAssignableToActual
}
