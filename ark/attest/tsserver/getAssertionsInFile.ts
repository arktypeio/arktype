import type { LinePosition } from "@arktype/fs"
import ts from "typescript"
import { type AttestConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import { getInternalTypeChecker, getTypeFromNode } from "./analysis.js"
import { analyzeAssertCall } from "./analyzeAssertCall.js"
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
	names: string[],
	isSnapCall = false
): ts.CallExpression[] => {
	/*
	 * We get might get some extraneous calls to other "attest" functions,
	 * but they won't be referenced at runtime so shouldn't matter.
	 */
	const calls: ts.CallExpression[] = []
	const visit = (node: ts.Node) => {
		if (ts.isCallExpression(node)) {
			if (names.includes(node.expression.getText())) {
				calls.push(node)
			}
		} else if (isSnapCall) {
			if (ts.isIdentifier(node)) {
				if (names.includes(node.getText())) {
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
	diagnosticsByFile: DiagnosticsByFile,
	attestAliases: string[]
): AssertionData[] => {
	const assertCalls = getExpressionsByName(file, attestAliases)
	return assertCalls.map((call) => analyzeAssertCall(call, diagnosticsByFile))
}

export type AssertionTypes = {
	actual: {
		node: ts.Type
		string: string
	}
	expected?: {
		node: ts.Type
		string: string
	}
}

export const extractAssertionTypesFromCall = (
	assertCall: ts.CallExpression
): AssertionTypes => {
	const actualValueArg = assertCall.arguments[0]
	const expectedTypeArg = assertCall.typeArguments?.[0]
	const actualTypeArg = assertCall.typeArguments?.[1]

	const types: AssertionTypes = {
		actual: getTypeFromNode(actualValueArg ?? actualTypeArg)
	}

	if (expectedTypeArg) {
		types.expected = getTypeFromNode(expectedTypeArg)
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
			const possibleExpected = getPossibleExpectedType(propName, ancestor)
			if (possibleExpected) {
				types.expected = getTypeFromNode(possibleExpected)
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

const getPossibleExpectedType = (propName: string, ancestor: ts.Node) => {
	if (propName === "typed") {
		if (ts.isAsExpression(ancestor.parent)) {
			return ancestor.parent
		}
	}
}

export const getAssertCallLocation = (assertCall: ts.CallExpression) => {
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

export const checkTypeAssertion = (
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

export const checkDiagnosticMessage = (
	attestCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
) => {
	const fileKey = getFileKey(attestCall.getSourceFile().fileName)
	const fileDiagnostics = diagnosticsByFile[fileKey]
	if (!fileDiagnostics) {
		return ""
	}
	const diagnosticMessagesInArgRange: string[] = []
	for (const diagnostic of fileDiagnostics) {
		if (
			diagnostic.start >= attestCall.getStart() &&
			diagnostic.end <= attestCall.getEnd()
		) {
			diagnosticMessagesInArgRange.push(diagnostic.message)
		}
	}
	return diagnosticMessagesInArgRange.join("\n")
}
