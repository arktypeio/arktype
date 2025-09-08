import type { LinePosition } from "@ark/fs"
import { flatMorph } from "@ark/util"
import ts from "typescript"

import { getConfig } from "../config.ts"
import { getFileKey } from "../utils.ts"
import {
	TsServer,
	extractArgumentTypesFromCall,
	getDescendants,
	getInternalTypeChecker,
	type ArgumentTypes,
	type StringifiableType
} from "./ts.ts"
import {
	gatherInlineInstantiationData,
	getCallExpressionsByName,
	getCallLocationFromCallExpression
} from "./utils.ts"

export type AssertionsByFile = Record<string, TypeAssertionData[]>

export const analyzeProjectAssertions = (): AssertionsByFile => {
	const config = getConfig()
	const instance = TsServer.instance
	const filePaths = instance.rootFiles
	const diagnosticsByFile = getDiagnosticsByFile()
	const assertionsByFile: AssertionsByFile = {}
	const attestAliasInstantiationMethodCalls = config.attestAliases.map(
		alias => `${alias}.instantiations`
	)
	for (const path of filePaths) {
		const file = instance.getSourceFileOrThrow(path)
		const assertionsInFile = getAssertionsInFile(
			file,
			diagnosticsByFile,
			config.attestAliases
		)
		if (assertionsInFile.length)
			assertionsByFile[getFileKey(file.fileName)] = assertionsInFile
		if (!config.skipInlineInstantiations) {
			gatherInlineInstantiationData(
				file,
				assertionsByFile,
				attestAliasInstantiationMethodCalls
			)
		}
	}
	return assertionsByFile
}

export const getAssertionsInFile = (
	file: ts.SourceFile,
	diagnosticsByFile: DiagnosticsByFile,
	attestAliases: string[]
): TypeAssertionData[] => {
	const assertCalls = getCallExpressionsByName(file, attestAliases)
	return assertCalls.map(call => analyzeAssertCall(call, diagnosticsByFile))
}

export const analyzeAssertCall = (
	assertCall: ts.CallExpression,
	diagnosticsByFile: DiagnosticsByFile
): TypeAssertionData => {
	const types = extractArgumentTypesFromCall(assertCall)
	const location = getCallLocationFromCallExpression(assertCall)
	const args = types.args.map(arg => serializeArg(arg, types))
	const typeArgs = types.typeArgs.map(typeArg => serializeArg(typeArg, types))
	const errors = checkDiagnosticMessages(assertCall, diagnosticsByFile)
	const completions = getCompletions(assertCall)

	// Extract JSDoc comment for first argument if available
	const jsdoc = extractJSDocFromArgument(assertCall)

	const result: TypeAssertionData = {
		location,
		args,
		typeArgs,
		errors,
		completions
	}

	if (jsdoc) result.jsdoc = jsdoc

	return result
}

/**
 * Extract JSDoc comments associated with the first argument of a call expression
 */
const extractJSDocFromArgument = (
	callExpr: ts.CallExpression
): string | undefined => {
	// We're only interested in the first argument
	const firstArg = callExpr.arguments[0]
	if (!firstArg) return undefined

	const checker = getInternalTypeChecker()

	// If the argument is a property access expression (e.g., out.foo)
	if (ts.isPropertyAccessExpression(firstArg)) {
		// Try to find the symbol for the property
		const propSymbol = checker.getSymbolAtLocation(firstArg)
		if (propSymbol) {
			// Get JSDoc from property declarations
			return getJSDocFromSymbol(propSymbol)
		}
	}
	// If argument is an identifier, try to find its declaration's JSDoc
	else if (ts.isIdentifier(firstArg)) {
		const symbol = checker.getSymbolAtLocation(firstArg)
		if (symbol) return getJSDocFromSymbol(symbol)
	}

	return undefined
}

/**
 * Extract JSDoc comments from a symbol's declarations
 */
const getJSDocFromSymbol = (symbol: ts.Symbol): string | undefined => {
	// Get JSDoc directly from the symbol if possible
	const symbolDocumentation = ts.displayPartsToString(
		symbol.getDocumentationComment(getInternalTypeChecker())
	)
	if (symbolDocumentation) return symbolDocumentation.trim()

	// If no symbol documentation, try to get JSDoc from declarations
	const declarations = symbol.getDeclarations() || []
	for (const declaration of declarations) {
		// For property declarations in object literals, get the JSDoc comment
		if (
			ts.isPropertyAssignment(declaration) ||
			ts.isShorthandPropertyAssignment(declaration) ||
			ts.isPropertyDeclaration(declaration)
		) {
			const jsDocTags = ts.getJSDocTags(declaration)
			if (jsDocTags.length > 0) {
				return jsDocTags
					.map(tag => {
						const comment = tag.comment?.toString() || ""
						return tag.tagName.text + (comment ? ` ${comment}` : "")
					})
					.join("\n")
			}

			// Try to get JSDoc comment before the property
			const jsDocComments = ts.getJSDocCommentsAndTags(declaration)
			if (jsDocComments && jsDocComments.length > 0) {
				return jsDocComments
					.map(doc => {
						if (ts.isJSDoc(doc)) return doc.comment || ""

						return ""
					})
					.filter(Boolean)
					.join("\n")
					.trim()
			}
		}
	}

	return undefined
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
		entries.length >= 1 ? [prefix, entries.sort()] : []
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

export type ArgAssertionData = {
	type: string
	relationships: {
		args: TypeRelationship[]
		typeArgs: TypeRelationship[]
	}
}

export type TypeRelationshipAssertionData = {
	location: LinePositionRange
	args: ArgAssertionData[]
	typeArgs: ArgAssertionData[]
	errors: string[]
	completions: Completions
	/** JSDoc comment for the first argument, if any */
	jsdoc?: string
}

export type TypeBenchmarkingAssertionData = {
	location: LinePositionRange
	count: number
}

export type TypeAssertionKind = "bench" | "type"

export type TypeAssertionData<
	kind extends TypeAssertionKind = TypeAssertionKind
> =
	kind extends "bench" ? TypeBenchmarkingAssertionData
	:	TypeRelationshipAssertionData

export type LinePositionRange = {
	start: LinePosition
	end: LinePosition
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
