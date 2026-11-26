import {
	BaseRoot,
	hasArkKind,
	type BaseScope,
	type GenericRoot,
	type PredicateNode
} from "arktype/schema"
import { hasOwn } from "arktype/util"
import { type } from "arktype"
import { isKeyword } from "arktype/internal/standalone.ts"
import type { CallExpression, Node, ObjectProperty, Span } from "oxc-parser"
import { isPlainContainer } from "./builtins.ts"
import type { Diagnostic, Rule } from "./diagnostics.ts"
import { contains, enclosingFunctionOf, memberNameOf } from "./graph.ts"
import type { SiteState } from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import { unwrapExpression } from "./scope.ts"

export type DroppedNarrowOp =
	| '"..."'
	| ".merge()"
	| ".pick()"
	| ".omit()"
	| ".partial()"
	| ".required()"
	| ".map()"

export interface SpreadSource {
	property: ObjectProperty
	valueNode: Node
	module: SourceModule
}

export interface DroppedNarrow {
	op: DroppedNarrowOp
	node: Node
	operand: Node | string
	module: SourceModule
	operatorNode?: Node | undefined
	// deferred until diagnosticsOf so un-exported scopes aren't mutated while evaluating
	pending?: {
		scope: BaseScope
		def: unknown
	}
}

export const writeDroppedNarrowMessage = (
	operand: string,
	op: DroppedNarrowOp
): string => `\`${operand}\` has a narrow that \`${op}\` drops`

const isUserPredicate = (p: PredicateNode): boolean =>
	p.meta.keyword === undefined && !isKeyword(p.predicate)

// whether a spread operand is a spreadable object intersection carrying a
// user-authored root predicate (matches parseObjectLiteral's exact runtime check)
const spreadDropsUserPredicate = (before: BaseRoot): boolean =>
	before.is("intersection") &&
	!!before.basis?.is("domain") &&
	before.basis.domain === "object" &&
	!!before.inner.predicate?.some(isUserPredicate)

const isSpreadableObjectDef = (
	def: unknown,
	scope: BaseScope,
	seen = new Set<unknown>()
): boolean => {
	if (hasArkKind(def, "root")) {
		return (
			(def.is("domain") && def.domain === "object") ||
			(def.is("intersection") &&
				!!def.basis?.is("domain") &&
				def.basis.domain === "object")
		)
	}
	if (typeof def === "string") {
		if (def === "object") return true
		if (seen.has(def)) return false
		seen.add(def)
		const resolved = scope.res[def]
		if (hasArkKind(resolved, "root"))
			return isSpreadableObjectDef(resolved, scope, seen)
		if (hasOwn(scope.aliases, def))
			return isSpreadableObjectDef(scope.aliases[def], scope, seen)
		return false
	}
	if (Array.isArray(def)) {
		if (def.length === 3 && (def[1] === ":" || def[1] === "@"))
			return isSpreadableObjectDef(def[0], scope, seen)
		if (def.length === 3 && def[1] === "&") {
			return (
				isSpreadableObjectDef(def[0], scope, seen) &&
				isSpreadableObjectDef(def[2], scope, seen)
			)
		}
		return false
	}
	return isPlainContainer(def)
}

// whether any branch of `before` carries a user-authored root predicate that
// `after` no longer preserves (e.g. `.partial()` / `.required()` preserve
// unchanged branches at runtime)
const dropsUserPredicate = (before: BaseRoot, after?: BaseRoot): boolean => {
	for (const branch of before.branches) {
		if (!branch.is("intersection") || !branch.inner.predicate) continue
		if (!branch.inner.predicate.some(isUserPredicate)) continue
		if (
			!after?.branches.some(
				afterBranch => afterBranch === branch || afterBranch.equals(branch)
			)
		)
			return true
	}
	return false
}

const structuralRootMethods = new Map<Function, DroppedNarrowOp>([
	[BaseRoot.prototype.merge, ".merge()"],
	[BaseRoot.prototype.pick, ".pick()"],
	[BaseRoot.prototype.omit, ".omit()"],
	[BaseRoot.prototype.partial, ".partial()"],
	[BaseRoot.prototype.required, ".required()"],
	[BaseRoot.prototype.map, ".map()"]
])

const definitionRootMethods = new Set<Function>([
	BaseRoot.prototype.and,
	BaseRoot.prototype.intersect,
	BaseRoot.prototype.or,
	BaseRoot.prototype.merge,
	BaseRoot.prototype.extract,
	BaseRoot.prototype.exclude,
	BaseRoot.prototype.to
])

// methods on `type` or a scope whose arguments are NOT type definitions
const nonDefinitionParserMembers = new Set([
	"unit",
	"enumerated",
	"instanceOf",
	"valueOf",
	"schema",
	"define",
	"declare",
	"generic",
	"match",
	"fn",
	"export",
	"import",
	"resolve"
])

// methods on `type` or a scope whose multiple arguments are separate definitions
// rather than a single tuple expression
const naryDefinitionMembers = new Set(["and", "or", "pipe", "merge"])

let structuralGenerics:
	| Map<unknown, [op: DroppedNarrowOp, argIndices: number[]]>
	| undefined

const structuralGenericOf = (
	fn: GenericRoot
): [op: DroppedNarrowOp, argIndices: number[]] | undefined => {
	structuralGenerics ??= new Map([
		[(type.keywords.Pick as unknown as GenericRoot).bodyDef, [".pick()", [0]]],
		[(type.keywords.Omit as unknown as GenericRoot).bodyDef, [".omit()", [0]]],
		[
			(type.keywords.Partial as unknown as GenericRoot).bodyDef,
			[".partial()", [0]]
		],
		[
			(type.keywords.Required as unknown as GenericRoot).bodyDef,
			[".required()", [0]]
		],
		[
			(type.keywords.Merge as unknown as GenericRoot).bodyDef,
			[".merge()", [0, 1]]
		]
	])
	return structuralGenerics.get(fn.bodyDef)
}

export interface RecordDroppedNarrowsInput {
	fn: Function
	receiver: unknown
	args: unknown[]
	result: unknown
	node: Node
	module: SourceModule
	site: SiteState
	spreadsByObject: WeakMap<object, SpreadSource>
}

export const recordDroppedNarrows = ({
	fn,
	receiver,
	args,
	result,
	node,
	module,
	site,
	spreadsByObject
}: RecordDroppedNarrowsInput): void => {
	const call = node.type === "CallExpression" ? node : undefined
	const callee = call ? unwrapExpression(call.callee) : undefined
	const member = callee?.type === "MemberExpression" ? callee : undefined
	const memberName = member ? memberNameOf(member) : undefined

	// 1. Structural methods directly on a BaseRoot / Type
	if (hasArkKind(receiver, "root") && hasArkKind(result, "root")) {
		const op = structuralRootMethods.get(fn)
		if (op) {
			const operatorNode = member?.property ?? node
			if (dropsUserPredicate(receiver, result)) {
				site.droppedNarrows.push({
					op,
					node,
					operand: member?.object ?? node,
					module,
					operatorNode
				})
			}
			if (op === ".merge()" && args.length > 0) {
				const argNode = argNodeOf(call, 0) ?? node
				const rDef = args[0]
				if (defDropsUserPredicate(rDef, receiver.$, result)) {
					site.droppedNarrows.push({
						op: ".merge()",
						node,
						operand: argNode,
						module,
						operatorNode
					})
				}
			}
		}
		if (definitionRootMethods.has(fn) || memberName === "pipe")
			recordSpreadDrops(args, result.$, node, module, site, spreadsByObject)
		return
	}

	// 2. N-ary `type.merge(A, B, ...)` / `$.merge(A, B, ...)`
	if (hasArkKind(result, "root") && memberName === "merge") {
		const operatorNode = member?.property ?? node
		for (let i = 0; i < args.length; i++) {
			if (defDropsUserPredicate(args[i], result.$, result)) {
				site.droppedNarrows.push({
					op: ".merge()",
					node,
					operand: argNodeOf(call, i) ?? node,
					module,
					operatorNode
				})
			}
		}
		recordSpreadDrops(args, result.$, node, module, site, spreadsByObject)
		return
	}

	// 3. Built-in structural Generic calls (Pick, Omit, Partial, Required, Merge)
	if (hasArkKind(fn, "generic") && hasArkKind(result, "root")) {
		const generic = structuralGenericOf(fn)
		if (generic) {
			const [op, indices] = generic
			const operatorNode = member?.property
			for (const i of indices) {
				if (i >= args.length) continue
				if (defDropsUserPredicate(args[i], result.$, result)) {
					site.droppedNarrows.push({
						op,
						node,
						operand: argNodeOf(call, i) ?? node,
						module,
						operatorNode
					})
				}
			}
		}
		recordSpreadDrops(args, result.$, node, module, site, spreadsByObject)
		return
	}

	// 4. Object literal `"..."` spreads in definition-parsing calls
	if (hasArkKind(result, "scope")) {
		if (args.length > 0 && isPlainContainer(args[0])) {
			recordSpreadDrops(
				Object.values(args[0] as Record<PropertyKey, unknown>),
				result,
				node,
				module,
				site,
				spreadsByObject,
				true
			)
		}
		return
	}

	if (hasArkKind(result, "module")) {
		if (args.length > 0 && isPlainContainer(args[0])) {
			const scope = scopeOfModule(result)
			recordSpreadDrops(
				Object.values(args[0] as Record<PropertyKey, unknown>),
				scope,
				node,
				module,
				site,
				spreadsByObject,
				scope !== undefined
			)
		}
		return
	}

	if (hasArkKind(result, "generic")) {
		recordSpreadDrops(
			[result.bodyDef],
			result.$,
			node,
			module,
			site,
			spreadsByObject,
			true
		)
		return
	}

	if (
		hasArkKind(result, "root") &&
		(typeof memberName !== "string" ||
			!nonDefinitionParserMembers.has(memberName))
	) {
		const defs =
			(
				args.length > 1 &&
				(typeof memberName !== "string" ||
					!naryDefinitionMembers.has(memberName))
			) ?
				[args]
			:	args
		recordSpreadDrops(defs, result.$, node, module, site, spreadsByObject)
	}
}

const argNodeOf = (
	call: CallExpression | undefined,
	index: number
): Node | undefined => {
	const arg = call?.arguments[index]
	return arg && arg.type !== "SpreadElement" ? arg : undefined
}

const scopeOfModule = (mod: object): BaseScope | undefined => {
	for (const value of Object.values(mod)) {
		if (hasArkKind(value, "root")) return value.$
		if (hasArkKind(value, "module")) {
			const nested = scopeOfModule(value)
			if (nested) return nested
		}
	}
}

const recordSpreadDrops = (
	defs: unknown[],
	scope: BaseScope | undefined,
	fallbackNode: Node,
	fallbackModule: SourceModule,
	site: SiteState,
	spreadsByObject: WeakMap<object, SpreadSource>,
	deferScopeLookups = false
): void => {
	const seen = new Set<unknown>()
	for (const def of defs) {
		walkDefinitionForSpreads(
			def,
			(obj, spreadVal) => {
				const source = spreadsByObject.get(obj)
				const dropNode = source?.property ?? fallbackNode
				const dropModule = source?.module ?? fallbackModule
				const operand: Node | string =
					source?.valueNode ??
					(typeof spreadVal === "string" ? spreadVal : fallbackNode)
				if (hasArkKind(spreadVal, "root")) {
					if (spreadDropsUserPredicate(spreadVal)) {
						site.droppedNarrows.push({
							op: '"..."',
							node: dropNode,
							operand,
							module: dropModule
						})
					}
					return
				}
				if (
					scope &&
					(typeof spreadVal === "string" || Array.isArray(spreadVal))
				) {
					if (deferScopeLookups) {
						site.droppedNarrows.push({
							op: '"..."',
							node: dropNode,
							operand,
							module: dropModule,
							pending: { scope, def: spreadVal }
						})
					} else if (
						defDropsUserPredicate(spreadVal, scope, undefined, {
							spreadOnly: true
						})
					) {
						site.droppedNarrows.push({
							op: '"..."',
							node: dropNode,
							operand,
							module: dropModule
						})
					}
				}
			},
			seen
		)
	}
}

// non-mutating check of whether a definition value resolves to a Type carrying
// a root-level user predicate that `after` does not preserve
const defDropsUserPredicate = (
	def: unknown,
	scope: BaseScope,
	after?: BaseRoot,
	{
		spreadOnly = false,
		seen = new Set<unknown>()
	}: { spreadOnly?: boolean; seen?: Set<unknown> } = {}
): boolean => {
	if (hasArkKind(def, "root")) {
		return spreadOnly ?
				spreadDropsUserPredicate(def)
			:	dropsUserPredicate(def, after)
	}
	if (typeof def === "string") {
		if (seen.has(def)) return false
		seen.add(def)
		const resolved = scope.res[def]
		if (hasArkKind(resolved, "root")) {
			return spreadOnly ?
					spreadDropsUserPredicate(resolved)
				:	dropsUserPredicate(resolved, after)
		}
		if (hasOwn(scope.aliases, def)) {
			return defDropsUserPredicate(scope.aliases[def], scope, after, {
				spreadOnly,
				seen
			})
		}
		return false
	}
	if (Array.isArray(def)) {
		if (seen.has(def)) return false
		seen.add(def)
		// tuple narrow: [base, ":", predicate]
		if (def.length === 3 && def[1] === ":") {
			if (spreadOnly && !isSpreadableObjectDef(def[0], scope)) return false
			if (
				typeof def[2] === "function" &&
				!isKeyword(def[2]) &&
				!after?.branches.some(
					branch =>
						branch.is("intersection") &&
						!!branch.inner.predicate?.some(p => p.predicate === def[2])
				)
			)
				return true
			return defDropsUserPredicate(def[0], scope, after, { spreadOnly, seen })
		}
		// meta tuple: [base, "@", meta]
		if (def.length === 3 && def[1] === "@")
			return defDropsUserPredicate(def[0], scope, after, { spreadOnly, seen })
		// tuple intersection: [lhs, "&", rhs]
		if (def.length === 3 && def[1] === "&") {
			return (
				defDropsUserPredicate(def[0], scope, after, { spreadOnly, seen }) ||
				defDropsUserPredicate(def[2], scope, after, { spreadOnly, seen })
			)
		}
		// tuple union: [lhs, "|", rhs] (not spreadable by `"..."`, valid for `.merge()` / generics)
		if (!spreadOnly && def.length === 3 && def[1] === "|") {
			return (
				defDropsUserPredicate(def[0], scope, after, { spreadOnly, seen }) ||
				defDropsUserPredicate(def[2], scope, after, { spreadOnly, seen })
			)
		}
	}
	return false
}

const walkDefinitionForSpreads = (
	def: unknown,
	visit: (obj: Record<PropertyKey, unknown>, spreadVal: unknown) => void,
	seen: Set<unknown>
): void => {
	if (!def || typeof def !== "object" || seen.has(def)) return
	if (
		hasArkKind(def, "root") ||
		hasArkKind(def, "scope") ||
		hasArkKind(def, "module") ||
		hasArkKind(def, "generic") ||
		def instanceof RegExp ||
		def instanceof Date
	)
		return
	seen.add(def)
	if (Array.isArray(def)) {
		// [def, "=", defaultValue] -> defaultValue is data, not a definition
		if (def.length === 3 && def[1] === "=") {
			walkDefinitionForSpreads(def[0], visit, seen)
			return
		}
		if (def[0] === "===" || def[0] === "instanceof") return
		if (def.length === 2 && def[1] === "@") return
		if (def.length === 3 && def[1] === "@") {
			walkDefinitionForSpreads(def[0], visit, seen)
			return
		}
		for (const item of def) walkDefinitionForSpreads(item, visit, seen)
		return
	}
	if (!isPlainContainer(def)) return
	const obj = def as Record<PropertyKey, unknown>
	if (hasOwn(obj, "...")) visit(obj, obj["..."])
	for (const k of Reflect.ownKeys(obj)) {
		if (k === "@" || k === "+") continue
		walkDefinitionForSpreads(obj[k], visit, seen)
	}
}

export const isDropNarrowSuppressed = (
	module: SourceModule,
	span: Span,
	operatorNode?: Node
): boolean => {
	const { nodes, leadingLines, trailingLines } = module.allowDropNarrows
	if (nodes.some(mark => contains(mark, span))) return true
	if (operatorNode) {
		const [opLine] = module.lineAndColumnOf(operatorNode.start)
		return trailingLines.has(opLine) || leadingLines.has(opLine)
	}
	const [spanLine] = module.lineAndColumnOf(span.start)
	return trailingLines.has(spanLine)
}

const operandLabelOf = (
	operand: Node | string,
	module: SourceModule
): string => {
	if (typeof operand === "string") return operand
	const unwrapped = unwrapExpression(operand)
	if (unwrapped.type === "Literal" && typeof unwrapped.value === "string")
		return unwrapped.value
	return module.snippetOf(operand)
}

export type CreateDiagnostic = (
	module: SourceModule,
	span: Span,
	rule: Rule,
	message: string,
	reasons?: string[],
	hint?: string | false,
	severity?: Diagnostic["severity"]
) => Diagnostic

export const resolveDroppedNarrowDiagnostics = (
	state: SiteState,
	module: SourceModule,
	createDiagnostic: CreateDiagnostic
): Diagnostic[] => {
	const result: Diagnostic[] = []
	const siteNode = state.node
	const siteFn = enclosingFunctionOf(siteNode)
	for (const drop of state.droppedNarrows) {
		if (
			drop.pending &&
			!defDropsUserPredicate(drop.pending.def, drop.pending.scope, undefined, {
				spreadOnly: true
			})
		)
			continue
		// report in the site's module when the operation happened inside a helper
		// function or another module, so `isQuiet` and ESLint surface it at the call
		const inSiteScope =
			drop.module === module &&
			(contains(siteNode, drop.node) ||
				enclosingFunctionOf(drop.node) === siteFn)
		if (
			isDropNarrowSuppressed(drop.module, drop.node, drop.operatorNode) ||
			(inSiteScope ?
				module.allowDropNarrows.nodes.some(mark => contains(mark, siteNode))
			:	isDropNarrowSuppressed(module, siteNode))
		)
			continue
		const targetSpan = inSiteScope ? drop.node : siteNode
		const label = operandLabelOf(drop.operand, drop.module)
		const reasons =
			inSiteScope ?
				[]
			:	[
					`\`${drop.module.snippetOf(drop.node)}\` (${drop.module.positionOf(drop.node)})`
				]
		result.push(
			createDiagnostic(
				module,
				targetSpan,
				"dropped-narrow",
				writeDroppedNarrowMessage(label, drop.op),
				reasons,
				undefined,
				"warning"
			)
		)
	}
	return result
}
