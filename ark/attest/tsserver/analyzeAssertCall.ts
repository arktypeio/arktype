import { transform } from "@arktype/util"
import ts from "typescript"
import type { StringifiableType } from "./analysis.js"
import {
	checkDiagnosticMessages,
	compareTsTypes,
	extractArgumentTypesFromCall,
	getAssertCallLocation,
	getDescendants,
	type ArgumentTypes,
	type SerializedArgAssertion,
	type SerializedAssertionData
} from "./getAssertionsInFile.js"
import type { DiagnosticsByFile } from "./getDiagnosticsByFile.js"
import { TsServer } from "./tsserver.js"

export const analyzeAssertCall = (
	assertCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
): SerializedAssertionData => {
	const types = extractArgumentTypesFromCall(assertCall)
	const location = getAssertCallLocation(assertCall)
	const args = types.args.map((arg) => serializeArg(arg, types))
	const typeArgs = types.typeArgs.map((typeArg) => serializeArg(typeArg, types))
	const errors = checkDiagnosticMessages(assertCall, diagnosticsByFile)
	const completions = getCompletions(assertCall)
	return {
		location,
		args,
		typeArgs,
		errors,
		completions
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

export type Completions = Record<string, string[]> | string

const getCompletions = (attestCall: ts.CallExpression) => {
	const arg = attestCall.arguments[0]
	if (arg === undefined) {
		return {}
	}
	const descendants = getDescendants(arg)
	const file = attestCall.getSourceFile()
	const text = file.getFullText()
	const completions: Completions | string = {}

	for (const descendant of descendants) {
		if (ts.isStringLiteral(descendant) || ts.isTemplateLiteral(descendant)) {
			// descendant.pos tends to be an open quote while d.end tends to be right after the closing quote.
			// It seems to be more consistent using this to get the pos for the completion over descendant.pos
			const lastPositionOfInnerString =
				descendant.end - (/["'`]/.test(text[descendant.end - 1]) ? 1 : 2)
			const completionData =
				TsServer.instance.virtualEnv.languageService.getCompletionsAtPosition(
					file.fileName,
					lastPositionOfInnerString,
					undefined
				)
			const prefix =
				"text" in descendant ? descendant.text : descendant.getText()

			const entries = completionData?.entries ?? []

			if (prefix in completions) {
				return `Encountered multiple completion candidates for string(s) '${prefix}'. Assertions on the same prefix must be split into multiple attest calls so the results can be distinguished.`
			} else {
				completions[prefix] = []
				for (const entry of entries) {
					if (
						entry.name.startsWith(prefix) &&
						entry.name.length > prefix.length
					) {
						completions[prefix].push(entry.name)
					}
				}
			}
		}
	}

	return transform(completions, (prefix, entries) =>
		entries.length >= 1 ? [prefix, entries] : []
	)
}
