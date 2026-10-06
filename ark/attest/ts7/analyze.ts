import { flatMorph, throwInternalError } from "@ark/util"
import type {
	ArgAssertionData,
	AssertionsByFile,
	Completions,
	TypeAssertionData,
	TypeRelationship
} from "../cache/getCachedAssertions.ts"
import { getConfig } from "../config.ts"
import { getFileKey } from "../utils.ts"
import { getInstantiationsContributedByNodes } from "./instantiations.ts"
import {
	TsgoServer,
	ast,
	getAncestors,
	getCallExpressionsByName,
	getCallLocation,
	getDescendants,
	getFirstFunctionDescendant,
	type CallExpression,
	type Node,
	type SourceFile,
	type Type
} from "./server.ts"

export const analyzeProjectAssertions = (): AssertionsByFile => {
	const config = getConfig()
	const server = TsgoServer.instance
	const assertionsByFile: AssertionsByFile = {}
	for (const path of server.rootFiles) {
		const file = server.getSourceFileOrThrow(path)
		const assertions: TypeAssertionData[] = getCallExpressionsByName(
			file,
			config.attestAliases
		).map(call => analyzeAssertCall(call, file))
		if (!config.skipInlineInstantiations) {
			assertions.push(
				...getInlineInstantiationData(
					file,
					config.attestAliases.map(alias => `${alias}.instantiations`)
				)
			)
		}
		if (assertions.length) assertionsByFile[getFileKey(path)] = assertions
	}
	return assertionsByFile
}

type StringifiedType = {
	type: Type
	string: string
	isUnresolvable: boolean
}

const analyzeAssertCall = (
	call: CallExpression,
	file: SourceFile
): TypeAssertionData<"type"> => {
	const args = call.arguments.map(stringifyTypeAtLocation)
	const typeArgs = call.typeArguments?.map(stringifyTypeAtLocation) ?? []
	const serializeArg = (arg: StringifiedType): ArgAssertionData => ({
		type: arg.string,
		relationships: {
			args: args.map(other => compareTypes(arg, other)),
			typeArgs: typeArgs.map(other => compareTypes(arg, other))
		}
	})
	const result: TypeAssertionData<"type"> = {
		location: getCallLocation(call),
		args: args.map(serializeArg),
		typeArgs: typeArgs.map(serializeArg),
		errors: getErrorsInCall(call, file),
		completions: getCompletions(call, file)
	}
	const jsdoc = getJsdoc(call)
	if (jsdoc) result.jsdoc = jsdoc
	return result
}

// TypeFormatFlags.NoTruncation, which tsgo's API doesn't export
const noTruncation = 1

export const stringifyTypeAtLocation = (node: Node): StringifiedType => {
	const checker = TsgoServer.instance.project.checker
	const type =
		checker.getTypeAtLocation(node) ??
		throwInternalError(`Unable to get type of ${node.getText()}`)
	let string = checker.typeToString(type)
	if (string.includes("...")) {
		const nonTruncated = checker.typeToString(type, undefined, noTruncation)
		string =
			nonTruncated.includes(" any") && !string.includes(" any") ?
				nonTruncated.replace(/ any/g, " cyclic")
			:	nonTruncated
	}
	return {
		type,
		string,
		isUnresolvable:
			(type as { intrinsicName?: string }).intrinsicName === "error"
	}
}

const compareTypes = (
	l: StringifiedType,
	r: StringifiedType
): TypeRelationship => {
	// ensure two unresolvable types are not treated as equivalent
	if (l.isUnresolvable || r.isUnresolvable) return "none"
	// treat `any` as a supertype of every other type
	if (l.string === "any") return r.string === "any" ? "equality" : "supertype"
	if (r.string === "any") return "subtype"
	const checker = TsgoServer.instance.project.checker
	const isSubtype = checker.isTypeAssignableTo(l.type, r.type)
	const isSupertype = checker.isTypeAssignableTo(r.type, l.type)
	return (
		isSubtype ?
			isSupertype ? "equality"
			:	"subtype"
		: isSupertype ? "supertype"
		: "none"
	)
}

type DiagnosticData = {
	pos: number
	end: number
	message: string
}

const diagnosticsByFile = new Map<SourceFile, DiagnosticData[]>()

type Diagnostic = {
	text: string
	messageChain?: readonly Diagnostic[] | undefined
}

const concatenateChainedErrors = (diagnostics: readonly Diagnostic[]): string =>
	diagnostics
		.map(
			d =>
				`${d.text}${d.messageChain ? concatenateChainedErrors(d.messageChain) : ""}`
		)
		.join("\n")

const getErrorsInCall = (call: CallExpression, file: SourceFile): string[] => {
	let diagnostics = diagnosticsByFile.get(file)
	if (!diagnostics) {
		diagnostics = TsgoServer.instance.project.program
			.getSemanticDiagnostics(file.fileName)
			.map(d => ({
				pos: d.pos,
				end: d.end,
				message: concatenateChainedErrors([d])
			}))
		diagnosticsByFile.set(file, diagnostics)
	}
	const start = call.getStart()
	const end = call.getEnd()
	return diagnostics
		.filter(d => d.pos >= start && d.end <= end)
		.map(d => d.message)
}

const getCompletions = (
	call: CallExpression,
	file: SourceFile
): Completions => {
	const arg = call.arguments[0]
	if (arg === undefined) return {}

	const text = file.getFullText()
	// null prototype so inherited names like "constructor" aren't seen as duplicates
	const completions: Record<string, string[]> = Object.create(null)

	for (const descendant of getDescendants(arg)) {
		if (!ast.isStringLiteral(descendant) && !ast.isTemplateLiteral(descendant))
			continue
		// end is right after the closing quote, so step inside the string
		const position =
			descendant.end - (/["'`]/.test(text[descendant.end - 1]) ? 1 : 2)
		const prefix =
			ast.isTemplateExpression(descendant) ?
				descendant.getText()
			:	descendant.text

		if (prefix in completions)
			return `Encountered multiple completion candidates for string(s) '${prefix}'. Assertions on the same prefix must be split into multiple attest calls so the results can be distinguished.`

		const entries =
			TsgoServer.instance.project.checker.getCompletionsAtPosition(
				file.fileName,
				position
			)?.entries ?? []

		completions[prefix] = entries
			// names of optional properties are suffixed with "?"
			.map(entry => entry.filterText ?? entry.name)
			.filter(name => name.startsWith(prefix) && name.length > prefix.length)
	}

	return flatMorph(completions, (prefix, entries) =>
		entries.length >= 1 ? [prefix, entries.sort()] : []
	)
}

const getJsdoc = (call: CallExpression): string | undefined => {
	const arg = call.arguments[0]
	if (!arg || !(ast.isPropertyAccessExpression(arg) || ast.isIdentifier(arg)))
		return

	const checker = TsgoServer.instance.project.checker
	const symbol = checker.getSymbolAtLocation(arg)
	if (!symbol) return

	const declarations = symbol.declarations.flatMap(
		declaration => declaration.resolve() ?? []
	)

	// read from the AST where possible since tsgo's documentation flattens links
	const documentation = (
		declarations.map(getDocumentationComment).filter(Boolean).join("\n") ||
		symbol.getDocumentationComment(checker)
	).trim()
	if (documentation) return documentation

	for (const declaration of declarations) {
		if (
			ast.isPropertyAssignment(declaration) ||
			ast.isShorthandPropertyAssignment(declaration) ||
			ast.isPropertyDeclaration(declaration)
		) {
			const tags = ast.getJSDocTags(declaration)
			if (tags.length) {
				return tags
					.map(tag => {
						const comment = ast.getTextOfJSDocComment(tag.comment)
						return tag.tagName.text + (comment ? ` ${comment}` : "")
					})
					.join("\n")
			}
		}
	}
}

const getDocumentationComment = (declaration: Node): string => {
	// JSDoc for a variable is attached to its statement
	const host =
		ast.isVariableDeclaration(declaration) ?
			declaration.parent.parent
		:	declaration
	return (host.jsDoc ?? [])
		.map(
			doc => (ast.isJSDoc(doc) && ast.getTextOfJSDocComment(doc.comment)) || ""
		)
		.filter(Boolean)
		.join("\n")
}

const getInlineInstantiationData = (
	file: SourceFile,
	instantiationMethodCalls: string[]
): TypeAssertionData<"bench">[] => {
	const calls = getCallExpressionsByName(file, instantiationMethodCalls)
	const blocks = calls.map(call => {
		// the test containing the statement that calls attest.instantiations
		const testStatement = getAncestors(call).filter(ancestor =>
			ast.isExpressionStatement(ancestor)
		)[1]
		return (
			(testStatement && getFirstFunctionDescendant(testStatement)) ??
			throwInternalError(
				`Unable to resolve test associated with ${call.getText()}`
			)
		)
	})
	const counts = getInstantiationsContributedByNodes(file, blocks)
	return calls.map((call, i) => ({
		location: getCallLocation(call),
		count: counts[i]
	}))
}
