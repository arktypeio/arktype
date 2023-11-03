import type { LinePosition } from "@arktype/fs"
import ts from "typescript"
import { getFileKey } from "../utils.js"
import { getInternalTypeChecker, getTypeFromExpression } from "./analysis.js"
import type { DiagnosticsByFile } from "./getDiagnosticsByFile.js"

export type LinePositionRange = {
	start: LinePosition
	end: LinePosition
}

export type AssertionData = {
	location: LinePositionRange
	type: {
		actual: string
		expected?: string
		equivalent?: boolean
	}
	errors: string
}

export const getExpressionsByName = (
	startNode: ts.Node,
	nodeExpressionName: string,
	isSnapCall = false
): ts.CallExpression[] => {
	/*
	 * We get might get some extraneous calls to other "attest" functions,
	 * but they won't be referenced at runtime so shouldn't matter.
	 */
	const calls: ts.CallExpression[] = []
	const visit = (node: ts.Node) => {
		if (ts.isCallExpression(node)) {
			if (node.expression.getText() === nodeExpressionName) {
				calls.push(node)
			}
		} else if (isSnapCall) {
			if (ts.isIdentifier(node)) {
				if (node.getText() === nodeExpressionName) {
					calls.push(node as any as ts.CallExpression)
				}
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(startNode)
	return calls
}

export const getAssertionsInFile = (
	file: ts.SourceFile,
	diagnosticsByFile: DiagnosticsByFile
): AssertionData[] => {
	const assertCalls = getExpressionsByName(file, "attest")
	return assertCalls.map((call) => analyzeAssertCall(call, diagnosticsByFile))
}

export const analyzeAssertCall = (
	assertCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
) => {
	const assertionTypes = extractAssertionTypesFromCall(assertCall)
	const location = getAssertCallLocation(assertCall)
	const errors = checkDiagnosticMessage(assertCall, diagnosticsByFile)
	const type = assertionTypes.expected
		? checkTypeAssertion(assertionTypes as Required<AssertionTypes>)
		: { actual: assertionTypes.actual.string }

	return {
		location,
		type,
		errors
	}
}

type AssertionTypes = {
	actual: {
		node: ts.Type
		string: string
	}
	expected?: {
		node: ts.Type
		string: string
	}
}

const extractAssertionTypesFromCall = (
	assertCall: ts.CallExpression
): AssertionTypes => {
	const assertArg = assertCall.arguments[0]

	const types: AssertionTypes = {
		actual: getTypeFromExpression(assertArg)
	}

	for (const ancestor of getAncestors(assertCall)) {
		const kind = ancestor.kind
		if (kind === ts.SyntaxKind.ExpressionStatement) {
			return types
		}
		if (kind === ts.SyntaxKind.PropertyAccessExpression) {
			const propName = ancestor
				.getChildAt(ancestor.getChildCount() - 1)
				.getText()
			if (propName === undefined) {
				continue
			} else if (propName === "returns") {
				types.actual.node = getReturnType(types.actual.node)
			} else {
				const possibleExpected = getPossibleExpectedType(propName, ancestor)
				if (possibleExpected) {
					types.expected = getTypeFromExpression(possibleExpected)
				}
			}
		}
	}
	return types
}

export const getDescendants = (node: ts.Node): ts.Node[] =>
	getDescendantsRecurse(node)

const getDescendantsRecurse = (node: ts.Node): ts.Node[] => [
	node,
	...node.getChildren().flatMap((child) => getDescendantsRecurse(child))
]

export const getAncestors = (node: ts.Node) => {
	const ancestors: ts.Node[] = []
	while (node.parent) {
		ancestors.push(node)
		node = node.parent
	}
	return ancestors
}

const getReturnType = (actual: ts.Type) => {
	const signatureSources = actual.isUnionOrIntersection()
		? actual.types
		: [actual]
	const signatures: ts.Signature[] = []
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

const getPossibleExpectedType = (propName: string, ancestor: ts.Node) => {
	if (propName === "typedValue") {
		if (ts.isCallExpression(ancestor.parent)) {
			return ancestor.parent.arguments[0]
		}
	} else if (propName === "typed") {
		if (ts.isAsExpression(ancestor.parent)) {
			return ancestor.parent
		}
	}
}

const getAssertCallLocation = (assertCall: ts.CallExpression) => {
	const start = ts.getLineAndCharacterOfPosition(
		assertCall.getSourceFile(),
		assertCall.getStart()
	)
	const end = ts.getLineAndCharacterOfPosition(
		assertCall.getSourceFile(),
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

const checkTypeAssertion = (
	assertionTypes: Required<AssertionTypes>
): Required<AssertionData["type"]> => {
	const assertionData: Omit<Required<AssertionData["type"]>, "equivalent"> = {
		actual: assertionTypes.actual.string,
		expected: assertionTypes.expected.string
	}
	if (
		assertionData.expected.startsWith("NonExistent") ||
		assertionData.actual.startsWith("NonExistent")
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
			equivalent: checkMutualAssignability(assertionTypes)
		}
	}
}

const checkMutualAssignability = (assertionTypes: Required<AssertionTypes>) => {
	const checker = getInternalTypeChecker()
	const isActualAssignableToExpected = checker.isTypeAssignableTo(
		assertionTypes.actual.node,
		assertionTypes.expected.node
	)
	const isExpectedAssignableToActual = checker.isTypeAssignableTo(
		assertionTypes.expected.node,
		assertionTypes.actual.node
	)
	return isActualAssignableToExpected && isExpectedAssignableToActual
}

const checkDiagnosticMessage = (
	assertCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
) => {
	const assertedArg = assertCall.arguments[0]
	const fileKey = getFileKey(assertedArg.getSourceFile().fileName)
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
