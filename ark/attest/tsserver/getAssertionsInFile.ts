import type { LinePosition } from "@arktype/fs"
import ts from "typescript"
import { getFileKey } from "../utils.ts"
import {
	getInternalTypeChecker,
	getStringifiableType,
	type StringifiableType
} from "./analysis.ts"
import { analyzeAssertCall } from "./analyzeAssertCall.ts"
import type { DiagnosticsByFile } from "./getDiagnosticsByFile.ts"

export type LinePositionRange = {
	start: LinePosition
	end: LinePosition
}

export type SerializedArgAssertion = {
	type: string
	relationships: {
		args: TypeRelationship[]
		typeArgs: TypeRelationship[]
	}
}

export type SerializedAssertionData = {
	location: LinePositionRange
	args: SerializedArgAssertion[]
	typeArgs: SerializedArgAssertion[]
	errors: string[]
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
): SerializedAssertionData[] => {
	const assertCalls = getExpressionsByName(file, attestAliases)
	return assertCalls.map((call) => analyzeAssertCall(call, diagnosticsByFile))
}

export type ArgumentTypes = {
	args: StringifiableType[]
	typeArgs: StringifiableType[]
}

export const extractArgumentTypesFromCall = (
	call: ts.CallExpression
): ArgumentTypes => ({
	args: call.arguments.map((arg) => getStringifiableType(arg)),
	typeArgs:
		call.typeArguments?.map((typeArg) => getStringifiableType(typeArg)) ?? []
})

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

export type TypeRelationship = "subtype" | "supertype" | "equality" | "none"

export const compareTsTypes = (
	l: StringifiableType,
	r: StringifiableType
): TypeRelationship => {
	const lString = l.toString()
	const rString = r.toString()
	if (l.isUnresolvable || r.isUnresolvable) {
		// Ensure two unresolvable types are not treated as equivalent
		return "none"
	} else if (lString === "any") {
		// Treat `any` as a supertype of every other type
		return rString === "any" ? "equality" : "supertype"
	} else if (rString === "any") {
		return "subtype"
	} else {
		// Otherwise, determine if the types are equivalent by checking mutual assignability
		const checker = getInternalTypeChecker()
		const isSubtype = checker.isTypeAssignableTo(l, r)
		const isSupertype = checker.isTypeAssignableTo(r, l)
		return isSubtype
			? isSupertype
				? "equality"
				: "subtype"
			: isSupertype
			? "supertype"
			: "none"
	}
}

export const checkDiagnosticMessages = (
	attestCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
): string[] => {
	const fileKey = getFileKey(attestCall.getSourceFile().fileName)
	const fileDiagnostics = diagnosticsByFile[fileKey]
	if (!fileDiagnostics) {
		return []
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
	return diagnosticMessagesInArgRange
}
