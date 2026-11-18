import { InternalArktypeError } from "@ark/util"
import type { Node, Span } from "oxc-parser"
import { chainOf, DynamicValue } from "./dynamic.ts"
import { contains, memberNameOf, type FunctionNode } from "./graph.ts"
import { inferredNameOf } from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import { operatorOf, unwrapChain, type Binding } from "./scope.ts"
export type Rule =
	| "R1"
	| "R2"
	| "R3"
	| "R4"
	| "parse"
	| "syntax"
	| "unsupported"
	| "copies"

export interface Diagnostic {
	severity: "error" | "warning"
	rule: Rule
	file: string
	start: number
	end: number
	line: number
	column: number
	message: string
	reasons: string[]
	hint: string | undefined
}

export const renderDiagnostic = (diagnostic: Diagnostic): string =>
	[
		`${diagnostic.file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.message}`,
		...diagnostic.reasons.map(reason => `  ${reason}`),
		...(diagnostic.hint ? [`  ${diagnostic.hint}`] : [])
	].join("\n")

// e.g. a configured writer calling a function in a site's meta
export const reasonsOf = (e: unknown): string[] =>
	e instanceof DynamicValue ? chainOf(e)
	: e instanceof InternalArktypeError ?
		[
			`${e.message}, which is a bug in the build: please report it at https://github.com/arktypeio/arktype/issues`
		]
	: e instanceof Error ? [e.message]
	: [String(e)]

export const labelOf = (module: SourceModule, span: Span): string =>
	`\`${module.snippetOf(span)}\` (${module.positionOf(span)})`

// e.g. `max` for "`max` is a parameter of text ..."
export const paramOf = (
	rejection: DynamicValue | undefined
): Binding | undefined => {
	for (let link = rejection; link; link = link.cause) {
		if (link.code === "parameter")
			return link.module.scopes.byId.get(link.node)?.binding
	}
}

// e.g. `T` in `<t>(T: Type<t>) => T.or("null")`, with the function's name
export const parameterOf = (
	node: Node,
	module: SourceModule
): { binding: Binding; fn: string; isAnnotated: boolean } | undefined => {
	const id = unwrapChain(node)
	const binding =
		id.type === "Identifier" ? module.scopes.byId.get(id)?.binding : undefined
	if (binding?.kind !== "param") return
	return {
		binding,
		fn: inferredNameOf(binding.declaration as FunctionNode),
		isAnnotated: !!(binding.id as { typeAnnotation?: unknown }).typeAnnotation
	}
}

// e.g. "BeforeNavigate" for `nav: BeforeNavigate`
export const annotationSnippetOf = (
	annotation: Node | undefined,
	module: SourceModule
): string | undefined =>
	annotation &&
	module.snippetOf(
		annotation.type === "TSTypeAnnotation" ?
			annotation.typeAnnotation
		:	annotation
	)

// e.g. "t | null" for `T.or("null")`, if the call is that simple
export const genericDefinitionOf = (
	read: Node,
	module: SourceModule
): string | undefined => {
	if (read.type !== "MemberExpression") return
	const [callee, call] = operatorOf(read)
	if (call?.type !== "CallExpression" || call.callee !== callee) return
	const name = memberNameOf(read)
	const [arg, ...rest] = call.arguments
	if (name === "array") return arg ? undefined : '"t[]"'
	const operator =
		name === "or" ? "|"
		: name === "and" ? "&"
		: undefined
	if (!operator || !arg || rest.length || arg.type === "SpreadElement") return
	if (arg.type === "Literal" && typeof arg.value === "string") {
		const operand =
			operator === "&" && arg.value.includes("|") ? `(${arg.value})` : arg.value
		return JSON.stringify(`t ${operator} ${operand}`)
	}
	const text = module.snippetOf(arg)
	return text.endsWith("…") ? undefined : `["t", "${operator}", ${text}]`
}

// e.g. `{ value: "t" }` for `type({ value: T })`, if each read is a whole definition
export const genericSiteDefinitionOf = (
	site: Node,
	param: Binding,
	module: SourceModule
): string | undefined => {
	if (
		site.type !== "CallExpression" ||
		site.arguments.length !== 1 ||
		!/(?:^|\.)type$/.test(module.textOf(site.callee))
	)
		return
	const [arg] = site.arguments
	let text = module.textOf(arg)
	const reads = param.references
		.map(reference => reference.id)
		.filter(id => contains(arg, id))
		.sort((l, r) => r.start - l.start)
	for (const id of reads) {
		const parent = id.parent
		const isDefinition =
			id === arg ||
			parent?.type === "ArrayExpression" ||
			(parent?.type === "Property" && parent.value === id && !parent.shorthand)
		if (!isDefinition) return
		text = `${text.slice(0, id.start - arg.start)}"t"${text.slice(id.end - arg.start)}`
	}
	return text.includes("\n") || text.length > 60 ? undefined : text
}

// e.g. `Math.random()` for `type({ a: Math.random() > 0.5 ? "string" : "number" })`,
// or its binding where too long
export const innermostSnippetOf = (
	dynamic: DynamicValue,
	site: Span,
	module: SourceModule
): string | undefined => {
	const snippets: string[] = []
	for (let link: DynamicValue | undefined = dynamic; link; link = link.cause) {
		// e.g. `process.env.MAX` for `process`, or `Math.random()` for its callee
		let node = link.node
		for (;;) {
			const [operand, operator] = operatorOf(node)
			if (
				(operator?.type === "MemberExpression" &&
					operator.object === operand &&
					!operator.computed) ||
				(operator?.type === "CallExpression" && operator.callee === operand)
			)
				node = operator
			else break
		}
		// the site itself, as where it throws, is no value to replace
		if (link.module === module && contains(node, site)) continue
		snippets.unshift(link.module.snippetOf(node))
	}
	return snippets.find(snippet => !snippet.endsWith("…")) ?? snippets[0]
}
