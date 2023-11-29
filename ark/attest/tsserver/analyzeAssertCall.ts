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
	let completions: Completions | string = {}
	const duplicatedPrefixes: string[] = []

	for (const descendant of descendants) {
		if (ts.isStringLiteral(descendant)) {
			// descendant.pos tends to be an open quote while d.end tends to be right after the closing quote.
			// It seems to be more consistent using this to get the pos for the completion over descendant.pos
			const lastPositionOfInnerString =
				descendant.end - (/["']/.test(text[descendant.end - 1]) ? 1 : 2)

			const completionData =
				TsServer.instance.virtualEnv.languageService.getCompletionsAtPosition(
					file.fileName,
					lastPositionOfInnerString,
					undefined
				)

			const prefix = descendant.text
			const entries = completionData?.entries ?? []

			if (
				(entries.length === 1 && entries[0].name !== prefix) ||
				entries.length > 1
			) {
				if (prefix in completions) {
					duplicatedPrefixes.push(prefix)
				} else {
					for (const entry of entries) {
						if (
							entry.name.startsWith(prefix) &&
							entry.name.length > prefix.length
						) {
							completions[prefix] ??= []
							completions[prefix].push(entry.name)
						}
					}
				}
			}
		}
	}

	if (duplicatedPrefixes.length) {
		completions = `Encountered multiple completion candidates for string(s) '${duplicatedPrefixes.join(
			", "
		)}'. Assertions on the same prefix must be split int multip le attest calls so the results can be distinguished.`
	}

	return completions
}
