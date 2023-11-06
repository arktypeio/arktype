import type ts from "typescript"
import {
	type AssertionTypes,
	checkDiagnosticMessage,
	checkTypeAssertion,
	extractAssertionTypesFromCall,
	getAssertCallLocation
} from "./getAssertionsInFile.js"
import type { DiagnosticsByFile } from "./getDiagnosticsByFile.js"

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
