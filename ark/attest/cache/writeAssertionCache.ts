import type { LinePosition } from "@arktype/fs"
import { flatMorph } from "@arktype/util"
import ts from "typescript"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import {
	TsServer,
	extractArgumentTypesFromCall,
	getDescendants,
	getInternalTypeChecker,
	type ArgumentTypes,
	type StringifiableType
} from "./ts.js"

export type AssertionsByFile = Record<string, TypeAssertionData[]>

export const analyzeProjectAssertions = (): AssertionsByFile => {
	const config = getConfig()
	const instance = TsServer.instance
	const filePaths = instance.rootFiles
	const diagnosticsByFile = getDiagnosticsByFile()
	const assertionsByFile: AssertionsByFile = {}
	for (const path of filePaths) {
		const file = instance.getSourceFileOrThrow(path)
		const assertionsInFile = getAssertionsInFile(
			file,
			diagnosticsByFile,
			config.attestAliases
		)
		if (assertionsInFile.length)
			assertionsByFile[getFileKey(file.fileName)] = assertionsInFile
	}
	return assertionsByFile
}

export const getAssertionsInFile = (
	file: ts.SourceFile,
	diagnosticsByFile: DiagnosticsByFile,
	attestAliases: string[]
): TypeAssertionData[] => {
	const assertCalls = getExpressionsByName(file, attestAliases)
	return assertCalls.map(call => analyzeAssertCall(call, diagnosticsByFile))
}

export const getAssertCallLocation = (
	assertCall: ts.CallExpression
): LinePositionRange => {
	const start = ts.getLineAndCharacterOfPosition(
		assertCall.getSourceFile(),
		assertCall.getStart()
	)
	const end = ts.getLineAndCharacterOfPosition(
		assertCall.getSourceFile(),
		assertCall.getEnd()
	)
	// Add 1 to everything, since trace positions are 1-based and TS positions are 0-based.
	return {
		start: {
			line: start.line + 1,
			char: start.character + 1
		},
		end: {
			line: end.line + 1,
			char: end.character + 1
		}
	}
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
			if (names.includes(node.expression.getText())) calls.push(node)
		} else if (isSnapCall) {
			if (ts.isIdentifier(node)) {
				if (names.includes(node.getText()))
					calls.push(node as any as ts.CallExpression)
			}
		}
		ts.forEachChild(node, visit)
	}
	visit(startNode)
	return calls
}

export const analyzeAssertCall = (
	assertCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
): TypeAssertionData => {
	const types = extractArgumentTypesFromCall(assertCall)
	const location = getAssertCallLocation(assertCall)
	const args = types.args.map(arg => serializeArg(arg, types))
	const typeArgs = types.typeArgs.map(typeArg => serializeArg(typeArg, types))
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
): ArgAssertionData => ({
	type: arg.toString(),
	relationships: {
		args: context.args.map(other => compareTsTypes(arg, other)),
		typeArgs: context.typeArgs.map(other => compareTsTypes(arg, other))
	}
})

export type Completions = Record<string, string[]> | string

const getCompletions = (attestCall: ts.CallExpression) => {
	const arg = attestCall.arguments[0]
	if (arg === undefined) return {}

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

			if (prefix in completions)
				return `Encountered multiple completion candidates for string(s) '${prefix}'. Assertions on the same prefix must be split into multiple attest calls so the results can be distinguished.`

			completions[prefix] = []
			for (const entry of entries) {
				if (entry.name.startsWith(prefix) && entry.name.length > prefix.length)
					completions[prefix].push(entry.name)
			}
		}
	}

	return flatMorph(completions, (prefix, entries) =>
		entries.length >= 1 ? [prefix, entries] : []
	)
}

export type DiagnosticData = {
	start: number
	end: number
	message: string
}

export type DiagnosticsByFile = Record<string, DiagnosticData[]>

export const getDiagnosticsByFile = (): DiagnosticsByFile => {
	const diagnosticsByFile: DiagnosticsByFile = {}
	const diagnostics: ts.Diagnostic[] = getInternalTypeChecker().getDiagnostics()
	for (const diagnostic of diagnostics)
		addDiagnosticDataFrom(diagnostic, diagnosticsByFile)

	return diagnosticsByFile
}

const addDiagnosticDataFrom = (
	diagnostic: ts.Diagnostic,
	diagnosticsByFile: DiagnosticsByFile
) => {
	const filePath = diagnostic.file?.fileName
	if (!filePath) return

	const fileKey = getFileKey(filePath)
	const start = diagnostic.start ?? -1
	const end = start + (diagnostic.length ?? 0)
	let message = diagnostic.messageText
	if (typeof message === "object") message = concatenateChainedErrors([message])

	const data: DiagnosticData = {
		start,
		end,
		message
	}
	if (diagnosticsByFile[fileKey]) diagnosticsByFile[fileKey].push(data)
	else diagnosticsByFile[fileKey] = [data]
}

const concatenateChainedErrors = (
	diagnostics: ts.DiagnosticMessageChain[]
): string =>
	diagnostics
		.map(
			msg =>
				`${msg.messageText}${
					msg.next ? concatenateChainedErrors(msg.next) : ""
				}`
		)
		.join("\n")

export type LinePositionRange = {
	start: LinePosition
	end: LinePosition
}

export type ArgAssertionData = {
	type: string
	relationships: {
		args: TypeRelationship[]
		typeArgs: TypeRelationship[]
	}
}
export type TypeAssertionData = {
	location: LinePositionRange
	args: ArgAssertionData[]
	typeArgs: ArgAssertionData[]
	errors: string[]
	completions: Completions
}

export type TypeRelationship = "subtype" | "supertype" | "equality" | "none"

export const compareTsTypes = (
	l: StringifiableType,
	r: StringifiableType
): TypeRelationship => {
	const lString = l.toString()
	const rString = r.toString()
	// Ensure two unresolvable types are not treated as equivalent
	if (l.isUnresolvable || r.isUnresolvable) return "none"
	// Treat `any` as a supertype of every other type
	if (lString === "any") return rString === "any" ? "equality" : "supertype"
	if (rString === "any") return "subtype"
	// Otherwise, determine if the types are equivalent by checking mutual assignability
	const checker = getInternalTypeChecker()
	const isSubtype = checker.isTypeAssignableTo(l, r)
	const isSupertype = checker.isTypeAssignableTo(r, l)
	return (
		isSubtype ?
			isSupertype ? "equality"
			:	"subtype"
		: isSupertype ? "supertype"
		: "none"
	)
}

export const checkDiagnosticMessages = (
	attestCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
): string[] => {
	const fileKey = getFileKey(attestCall.getSourceFile().fileName)
	const fileDiagnostics = diagnosticsByFile[fileKey]
	if (!fileDiagnostics) return []

	const diagnosticMessagesInArgRange: string[] = []
	for (const diagnostic of fileDiagnostics) {
		if (
			diagnostic.start >= attestCall.getStart() &&
			diagnostic.end <= attestCall.getEnd()
		)
			diagnosticMessagesInArgRange.push(diagnostic.message)
	}
	return diagnosticMessagesInArgRange
}
