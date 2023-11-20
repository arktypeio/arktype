import type ts from "typescript"
import type { StringifiableType } from "./analysis.js"
import {
	checkDiagnosticMessages,
	compareTsTypes,
	extractArgumentTypesFromCall,
	getAssertCallLocation,
	type ArgumentTypes,
	type SerializedArgAssertion,
	type SerializedAssertionData
} from "./getAssertionsInFile.js"
import type { DiagnosticsByFile } from "./getDiagnosticsByFile.js"

export const analyzeAssertCall = (
	assertCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
): SerializedAssertionData => {
	const types = extractArgumentTypesFromCall(assertCall)
	const location = getAssertCallLocation(assertCall)
	const args = types.args.map((arg) => serializeArg(arg, types))
	const typeArgs = types.typeArgs.map((typeArg) => serializeArg(typeArg, types))
	const errors = checkDiagnosticMessages(assertCall, diagnosticsByFile)
	return {
		location,
		args,
		typeArgs,
		errors
	}
}

const serializeArg = (
	arg: StringifiableType,
	context: ArgumentTypes
): SerializedArgAssertion => ({
	type: arg.toString(),
	relationships: {
		args: context.args.map((other) => compareTsTypes(arg, other)),
		typeArgs: context.typeArgs.map((other) => compareTsTypes(arg, other))
	}
})
