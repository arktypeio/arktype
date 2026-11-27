import {
	BaseRoot,
	hasArkKind,
	type BaseScope,
	type GenericRoot,
	type PredicateNode
} from "arktype/schema"
import { hasOwn } from "arktype/util"
import { type } from "arktype"
import {
	isKeyword,
	jsonSchemaPredicateKeywords
} from "arktype/internal/standalone.ts"
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
	// root Type whose narrow was dropped, cleared if immediately re-narrowed
	targetRoot?: BaseRoot | undefined
	// deferred until diagnosticsOf so un-exported scopes aren't mutated while evaluating
	pending?: {
		scope: BaseScope
		def: unknown
		shadowed?: ReadonlySet<string> | undefined
	}
	pendingString?: {
		scope: BaseScope
		expr: string
		shadowed?: ReadonlySet<string> | undefined
	}
}

export const writeDroppedNarrowMessage = (
	operand: string,
	op: DroppedNarrowOp
): string => `\`${operand}\` has a narrow that \`${op}\` drops`

const isUserPredicateFn = (fn: unknown): boolean =>
	typeof fn === "function" &&
	!isKeyword(fn) &&
	!jsonSchemaPredicateKeywords.has(fn)

const isUserPredicate = (p: PredicateNode): boolean =>
	p.meta.keyword === undefined && isUserPredicateFn(p.predicate)

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
				isSpreadableObjectDef(def[0], scope, new Set(seen)) &&
				isSpreadableObjectDef(def[2], scope, new Set(seen))
			)
		}
		return false
	}
	return isPlainContainer(def)
}

const hasUserPredicatesOf = (
	afterBranch: BaseRoot,
	userPredicates: PredicateNode[]
): boolean =>
	afterBranch.is("intersection") &&
	!!afterBranch.inner.predicate &&
	userPredicates.every(up =>
		afterBranch.inner.predicate!.some(ap => ap.predicate === up.predicate)
	)

// whether any branch of `before` carries a user-authored root predicate that
// `after` no longer preserves (e.g. `.partial()` / `.required()` preserve
// unchanged branches at runtime)
const dropsUserPredicate = (
	before: BaseRoot,
	after?: BaseRoot,
	inIntersection = false
): boolean => {
	for (const branch of before.branches) {
		if (!branch.is("intersection") || !branch.inner.predicate) continue
		const userPredicates = branch.inner.predicate.filter(isUserPredicate)
		if (!userPredicates.length) continue
		if (
			!after?.branches.some(
				afterBranch =>
					afterBranch === branch ||
					afterBranch.equals(branch) ||
					(inIntersection &&
						hasUserPredicatesOf(afterBranch, userPredicates) &&
						afterBranch.extends(branch))
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

const renarrowRootMethods = new Set<Function>([
	BaseRoot.prototype.narrow,
	BaseRoot.prototype.filter
])

const rootPropagatingMethods = new Set<Function>([
	BaseRoot.prototype.describe,
	BaseRoot.prototype.configure,
	BaseRoot.prototype.and,
	BaseRoot.prototype.intersect
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

const parserMembers = new Set([
	...nonDefinitionParserMembers,
	...naryDefinitionMembers
])

// identify a scope/type parser method by function identity first (so destructured
// `const { unit, merge } = type` or `const sm = $.merge` match accurately)
const parserMemberOf = (
	fn: Function,
	scope: BaseScope,
	memberName: unknown
): string | undefined => {
	const s = scope as unknown as Record<string, unknown>
	const t = s.type as Record<string, unknown> | undefined
	const rootType = type as unknown as Record<string, unknown>
	for (const name of parserMembers)
		if (s[name] === fn || t?.[name] === fn || rootType[name] === fn) return name

	return typeof memberName === "string" ? memberName : undefined
}

let structuralGenerics:
	| Map<unknown, [op: DroppedNarrowOp, argIndices: number[]]>
	| undefined

const structuralGenericOf = (
	fn: GenericRoot
): [op: DroppedNarrowOp, argIndices: number[]] | undefined => {
	structuralGenerics ??= new Map([
		[type.keywords.Pick.internal.bodyDef, [".pick()", [0]]],
		[type.keywords.Omit.internal.bodyDef, [".omit()", [0]]],
		[type.keywords.Partial.internal.bodyDef, [".partial()", [0]]],
		[type.keywords.Required.internal.bodyDef, [".required()", [0]]],
		[type.keywords.Merge.internal.bodyDef, [".merge()", [0, 1]]]
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
	stringPropsByObject: WeakMap<object, Map<PropertyKey, SpreadSource>>
}

export const recordDroppedNarrows = ({
	fn,
	receiver,
	args,
	result,
	node,
	module,
	site,
	spreadsByObject,
	stringPropsByObject
}: RecordDroppedNarrowsInput): void => {
	const call = node.type === "CallExpression" ? node : undefined
	const callee = call ? unwrapExpression(call.callee) : undefined
	const member = callee?.type === "MemberExpression" ? callee : undefined
	const memberName = member ? memberNameOf(member) : undefined

	// 1. Structural methods directly on a BaseRoot / Type
	if (hasArkKind(receiver, "root") && hasArkKind(result, "root")) {
		if (
			renarrowRootMethods.has(fn) &&
			args.length > 0 &&
			isUserPredicateFn(args[0])
		) {
			for (let i = site.droppedNarrows.length - 1; i >= 0; i--) {
				if (site.droppedNarrows[i].targetRoot === receiver)
					site.droppedNarrows.splice(i, 1)
			}
			return
		}
		if (rootPropagatingMethods.has(fn)) {
			for (const drop of site.droppedNarrows)
				if (drop.targetRoot === receiver) drop.targetRoot = result
		}
		const op = structuralRootMethods.get(fn)
		if (op) {
			const operatorNode = member?.property ?? node
			if (dropsUserPredicate(receiver, result)) {
				site.droppedNarrows.push({
					op,
					node,
					operand: member?.object ?? node,
					module,
					operatorNode,
					targetRoot: result
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
						operatorNode,
						targetRoot: result
					})
				}
			}
		}
		if (
			definitionRootMethods.has(fn) ||
			memberName === "pipe" ||
			fn === receiver.pipe
		) {
			recordDefinitionDrops(
				args,
				result.$,
				node,
				module,
				site,
				spreadsByObject,
				stringPropsByObject
			)
		}
		return
	}

	const parserMember =
		hasArkKind(result, "root") ?
			parserMemberOf(fn, result.$, memberName)
		:	undefined

	// 2. N-ary `type.merge(A, B, ...)` / `$.merge(A, B, ...)`
	if (hasArkKind(result, "root") && parserMember === "merge") {
		const operatorNode = member?.property ?? node
		for (let i = 0; i < args.length; i++) {
			if (defDropsUserPredicate(args[i], result.$, result)) {
				site.droppedNarrows.push({
					op: ".merge()",
					node,
					operand: argNodeOf(call, i) ?? node,
					module,
					operatorNode,
					targetRoot: result
				})
			}
		}
		recordDefinitionDrops(
			args,
			result.$,
			node,
			module,
			site,
			spreadsByObject,
			stringPropsByObject
		)
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
						operatorNode,
						targetRoot: result
					})
				}
			}
		}
		recordDefinitionDrops(
			args,
			result.$,
			node,
			module,
			site,
			spreadsByObject,
			stringPropsByObject
		)
		return
	}

	// 4. Object literal `"..."` spreads & string-syntax structural generics in definition-parsing calls
	if (hasArkKind(result, "scope")) {
		if (args.length > 0 && isPlainContainer(args[0])) {
			recordObjectContainerDrops(
				args[0] as Record<PropertyKey, unknown>,
				result,
				node,
				module,
				site,
				spreadsByObject,
				stringPropsByObject,
				true
			)
		}
		return
	}

	if (hasArkKind(result, "module")) {
		if (args.length > 0 && isPlainContainer(args[0])) {
			const scope = scopeOfModule(result)
			recordObjectContainerDrops(
				args[0] as Record<PropertyKey, unknown>,
				scope,
				node,
				module,
				site,
				spreadsByObject,
				stringPropsByObject,
				scope !== undefined
			)
		}
		return
	}

	if (hasArkKind(result, "generic")) {
		recordDefinitionDrops(
			[result.bodyDef],
			result.$,
			node,
			module,
			site,
			spreadsByObject,
			stringPropsByObject,
			true,
			result.names.length ? new Set(result.names) : undefined
		)
		return
	}

	if (
		hasArkKind(result, "root") &&
		(parserMember === undefined ||
			!nonDefinitionParserMembers.has(parserMember))
	) {
		const defs =
			(
				args.length > 1 &&
				(parserMember === undefined || !naryDefinitionMembers.has(parserMember))
			) ?
				[args]
			:	args
		recordDefinitionDrops(
			defs,
			result.$,
			node,
			module,
			site,
			spreadsByObject,
			stringPropsByObject,
			false,
			undefined,
			(
				parserMember === undefined ||
					parserMember === "type" ||
					parserMember === "and"
			) ?
				result
			:	undefined
		)
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

const recordObjectContainerDrops = (
	container: Record<PropertyKey, unknown>,
	scope: BaseScope | undefined,
	fallbackNode: Node,
	fallbackModule: SourceModule,
	site: SiteState,
	spreadsByObject: WeakMap<object, SpreadSource>,
	stringPropsByObject: WeakMap<object, Map<PropertyKey, SpreadSource>>,
	deferScopeLookups: boolean
): void => {
	const propSources = stringPropsByObject.get(container)
	const seen = new Set<unknown>()
	for (const k of Reflect.ownKeys(container)) {
		const val = container[k]
		const propSource = propSources?.get(k)
		const shadowed = genericParamNamesOfKey(k)
		if (typeof val === "string" && val.includes("<") && scope) {
			recordStringGenericDrop(
				val,
				scope,
				propSource?.property ?? fallbackNode,
				propSource?.module ?? fallbackModule,
				site,
				deferScopeLookups,
				shadowed
			)
			continue
		}
		walkDefinition(
			val,
			(obj, spreadVal) =>
				recordSpreadDrop(
					obj,
					spreadVal,
					scope,
					fallbackNode,
					fallbackModule,
					site,
					spreadsByObject,
					deferScopeLookups,
					shadowed
				),
			(expr, source) => {
				if (scope) {
					recordStringGenericDrop(
						expr,
						scope,
						source?.property ?? fallbackNode,
						source?.module ?? fallbackModule,
						site,
						deferScopeLookups,
						shadowed
					)
				}
			},
			stringPropsByObject,
			seen,
			propSource
		)
	}
}

const recordDefinitionDrops = (
	defs: unknown[],
	scope: BaseScope | undefined,
	fallbackNode: Node,
	fallbackModule: SourceModule,
	site: SiteState,
	spreadsByObject: WeakMap<object, SpreadSource>,
	stringPropsByObject: WeakMap<object, Map<PropertyKey, SpreadSource>>,
	deferScopeLookups = false,
	shadowed?: ReadonlySet<string>,
	targetRoot?: BaseRoot
): void => {
	const seen = new Set<unknown>()
	for (const def of defs) {
		walkDefinition(
			def,
			(obj, spreadVal, dropTargetRoot) =>
				recordSpreadDrop(
					obj,
					spreadVal,
					scope,
					fallbackNode,
					fallbackModule,
					site,
					spreadsByObject,
					deferScopeLookups,
					shadowed,
					dropTargetRoot
				),
			(expr, source, dropTargetRoot) => {
				if (scope) {
					recordStringGenericDrop(
						expr,
						scope,
						source?.property ?? fallbackNode,
						source?.module ?? fallbackModule,
						site,
						deferScopeLookups,
						shadowed,
						dropTargetRoot
					)
				}
			},
			stringPropsByObject,
			seen,
			undefined,
			targetRoot
		)
	}
}

const recordSpreadDrop = (
	obj: Record<PropertyKey, unknown>,
	spreadVal: unknown,
	scope: BaseScope | undefined,
	fallbackNode: Node,
	fallbackModule: SourceModule,
	site: SiteState,
	spreadsByObject: WeakMap<object, SpreadSource>,
	deferScopeLookups: boolean,
	shadowed?: ReadonlySet<string>,
	targetRoot?: BaseRoot
): void => {
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
				module: dropModule,
				targetRoot
			})
		}
		return
	}
	if (scope && (typeof spreadVal === "string" || Array.isArray(spreadVal))) {
		if (deferScopeLookups) {
			site.droppedNarrows.push({
				op: '"..."',
				node: dropNode,
				operand,
				module: dropModule,
				targetRoot,
				pending: { scope, def: spreadVal, shadowed }
			})
		} else if (
			defDropsUserPredicate(spreadVal, scope, undefined, {
				spreadOnly: true,
				shadowed
			})
		) {
			site.droppedNarrows.push({
				op: '"..."',
				node: dropNode,
				operand,
				module: dropModule,
				targetRoot
			})
		}
	}
}

const recordStringGenericDrop = (
	expr: string,
	scope: BaseScope,
	dropNode: Node,
	dropModule: SourceModule,
	site: SiteState,
	deferScopeLookups: boolean,
	shadowed?: ReadonlySet<string>,
	targetRoot?: BaseRoot
): void => {
	if (deferScopeLookups) {
		site.droppedNarrows.push({
			op: ".partial()",
			node: dropNode,
			operand: expr,
			module: dropModule,
			targetRoot,
			pendingString: { scope, expr, shadowed }
		})
		return
	}
	for (const found of checkStringGenericDrops(expr, scope, shadowed)) {
		site.droppedNarrows.push({
			op: found.op,
			node: dropNode,
			operand: found.operand,
			module: dropModule,
			targetRoot
		})
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
		inIntersection = false,
		seen = new Set<unknown>(),
		shadowed
	}: {
		spreadOnly?: boolean
		inIntersection?: boolean
		seen?: Set<unknown>
		shadowed?: ReadonlySet<string> | undefined
	} = {}
): boolean => {
	if (hasArkKind(def, "root")) {
		return spreadOnly ?
				spreadDropsUserPredicate(def)
			:	dropsUserPredicate(def, after, inIntersection)
	}
	if (typeof def === "string") {
		if (shadowed?.has(def)) return false
		if (seen.has(def)) return false
		seen.add(def)
		const resolved = scope.res[def]
		if (hasArkKind(resolved, "root")) {
			return spreadOnly ?
					spreadDropsUserPredicate(resolved)
				:	dropsUserPredicate(resolved, after, inIntersection)
		}
		if (hasOwn(scope.aliases, def)) {
			return defDropsUserPredicate(scope.aliases[def], scope, after, {
				spreadOnly,
				inIntersection,
				seen,
				shadowed
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
				isUserPredicateFn(def[2]) &&
				!after?.branches.some(
					branch =>
						branch.is("intersection") &&
						!!branch.inner.predicate?.some(p => p.predicate === def[2])
				)
			)
				return true
			return defDropsUserPredicate(def[0], scope, after, {
				spreadOnly,
				inIntersection,
				seen,
				shadowed
			})
		}
		// meta tuple: [base, "@", meta]
		if (def.length === 3 && def[1] === "@") {
			return defDropsUserPredicate(def[0], scope, after, {
				spreadOnly,
				inIntersection,
				seen,
				shadowed
			})
		}
		// tuple intersection: [lhs, "&", rhs]
		if (def.length === 3 && def[1] === "&") {
			if (spreadOnly && !isSpreadableObjectDef(def, scope)) return false
			const nextInIntersection = inIntersection || (!spreadOnly && !!after)
			return (
				defDropsUserPredicate(def[0], scope, after, {
					spreadOnly,
					inIntersection: nextInIntersection,
					seen: new Set(seen),
					shadowed
				}) ||
				defDropsUserPredicate(def[2], scope, after, {
					spreadOnly,
					inIntersection: nextInIntersection,
					seen: new Set(seen),
					shadowed
				})
			)
		}
		// tuple union: [lhs, "|", rhs] (not spreadable by `"..."`, valid for `.merge()` / generics)
		if (!spreadOnly && def.length === 3 && def[1] === "|") {
			return (
				defDropsUserPredicate(def[0], scope, after, {
					spreadOnly,
					inIntersection,
					seen: new Set(seen),
					shadowed
				}) ||
				defDropsUserPredicate(def[2], scope, after, {
					spreadOnly,
					inIntersection,
					seen: new Set(seen),
					shadowed
				})
			)
		}
	}
	return false
}

const walkDefinition = (
	def: unknown,
	visitSpread: (
		obj: Record<PropertyKey, unknown>,
		spreadVal: unknown,
		targetRoot?: BaseRoot
	) => void,
	visitString: (
		expr: string,
		source?: SpreadSource,
		targetRoot?: BaseRoot
	) => void,
	stringPropsByObject: WeakMap<object, Map<PropertyKey, SpreadSource>>,
	seen: Set<unknown>,
	propSource?: SpreadSource,
	targetRoot?: BaseRoot,
	renarrowed = false
): void => {
	if (typeof def === "string") {
		if (def.includes("<") && !renarrowed)
			visitString(def, propSource, targetRoot)
		return
	}
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
			walkDefinition(
				def[0],
				visitSpread,
				visitString,
				stringPropsByObject,
				seen,
				propSource
			)
			return
		}
		if (def[0] === "===" || def[0] === "instanceof") return
		if (def.length === 2 && def[1] === "@") return
		if (def.length === 3 && def[1] === "@") {
			walkDefinition(
				def[0],
				visitSpread,
				visitString,
				stringPropsByObject,
				seen,
				propSource,
				targetRoot,
				renarrowed
			)
			return
		}
		if (def.length === 3 && def[1] === ":" && isUserPredicateFn(def[2])) {
			walkDefinition(
				def[0],
				visitSpread,
				visitString,
				stringPropsByObject,
				seen,
				propSource,
				undefined,
				true
			)
			return
		}
		if (def.length === 3 && def[1] === "&") {
			walkDefinition(
				def[0],
				visitSpread,
				visitString,
				stringPropsByObject,
				seen,
				propSource,
				targetRoot,
				renarrowed
			)
			walkDefinition(
				def[2],
				visitSpread,
				visitString,
				stringPropsByObject,
				seen,
				propSource,
				targetRoot,
				renarrowed
			)
			return
		}
		for (const item of def) {
			walkDefinition(
				item,
				visitSpread,
				visitString,
				stringPropsByObject,
				seen,
				propSource
			)
		}
		return
	}
	if (!isPlainContainer(def)) return
	const obj = def as Record<PropertyKey, unknown>
	const propSources = stringPropsByObject.get(obj)
	if (hasOwn(obj, "...") && !renarrowed)
		visitSpread(obj, obj["..."], targetRoot)
	for (const k of Reflect.ownKeys(obj)) {
		if (k === "@" || k === "+" || (k === "..." && renarrowed)) continue
		walkDefinition(
			obj[k],
			visitSpread,
			visitString,
			stringPropsByObject,
			seen,
			propSources?.get(k)
		)
	}
}

// --- string-syntax structural generic detection ---

interface StringGenericCall {
	name: string
	args: string[]
}

const isIdentStart = (ch: string): boolean => /[#$A-Z_a-z]/.test(ch)
const isIdentPart = (ch: string): boolean => /[\w#$.]/.test(ch)

// skip `'...'`, `"..."`, or `/.../` literal starting at `index`, returning index after closing delimiter
const skipQuotedOrRegex = (str: string, index: number): number => {
	const quote = str[index]
	if (quote === "'" || quote === '"') {
		let i = index + 1
		while (i < str.length) {
			if (str[i] === "\\") {
				i += 2
				continue
			}
			if (str[i] === quote) return i + 1
			i++
		}
		return str.length
	}
	if (quote === "/") {
		let i = index + 1
		let inClass = false
		while (i < str.length) {
			if (str[i] === "\\") {
				i += 2
				continue
			}
			if (str[i] === "[") inClass = true
			else if (str[i] === "]") inClass = false
			else if (str[i] === "/" && !inClass) return i + 1
			i++
		}
		return str.length
	}
	return index + 1
}

// parse `<arg0, arg1, ...>` starting at `ltIndex` (where `str[ltIndex] === "<"`)
const parseAngleArgs = (
	str: string,
	ltIndex: number
): { args: string[]; end: number } | undefined => {
	const args: string[] = []
	let i = ltIndex + 1
	let argStart = i
	let angleDepth = 1
	let parenDepth = 0
	while (i < str.length) {
		const ch = str[i]
		if (ch === "'" || ch === '"' || ch === "/") {
			i = skipQuotedOrRegex(str, i)
			continue
		}
		if (ch === "(") {
			parenDepth++
			i++
			continue
		}
		if (ch === ")") {
			if (parenDepth > 0) parenDepth--
			i++
			continue
		}
		if (ch === "<") {
			if (str[i + 1] === "=") {
				i += 2
				continue
			}
			angleDepth++
			i++
			continue
		}
		if (ch === ">") {
			if (str[i + 1] === "=") {
				i += 2
				continue
			}
			angleDepth--
			if (angleDepth === 0) {
				args.push(str.slice(argStart, i).trim())
				return { args, end: i + 1 }
			}
			i++
			continue
		}
		if (ch === "," && angleDepth === 1 && parenDepth === 0) {
			args.push(str.slice(argStart, i).trim())
			argStart = i + 1
		}
		i++
	}
	return undefined
}

// find every generic instantiation in a string expression (innermost args scanned too)
const scanStringGenerics = (str: string): StringGenericCall[] => {
	const found: StringGenericCall[] = []
	const scan = (s: string) => {
		let i = 0
		while (i < s.length) {
			const ch = s[i]
			if (ch === "'" || ch === '"' || ch === "/") {
				i = skipQuotedOrRegex(s, i)
				continue
			}
			if (isIdentStart(ch)) {
				const start = i
				i++
				while (i < s.length && isIdentPart(s[i])) i++
				const name = s.slice(start, i)
				let j = i
				while (j < s.length && /\s/.test(s[j])) j++
				if (s[j] === "<" && s[j + 1] !== "=") {
					const parsed = parseAngleArgs(s, j)
					if (parsed) {
						for (const arg of parsed.args) if (arg.includes("<")) scan(arg)

						found.push({ name, args: parsed.args })
						i = parsed.end
						continue
					}
				}
				continue
			}
			i++
		}
	}
	scan(str)
	return found
}

// extract parameter names from a scope generic key like `"MyPartial<t, k extends string>"`
const genericParamNamesOfKey = (key: PropertyKey): Set<string> | undefined => {
	if (typeof key !== "string" || !key.includes("<")) return undefined
	const lt = key.indexOf("<")
	const parsed = parseAngleArgs(key, lt)
	if (!parsed) return undefined
	const names = new Set<string>()
	for (const raw of parsed.args) {
		const match = /^([#$A-Z_a-z][\w#$]*)/.exec(raw)
		if (match) names.add(match[1])
	}
	return names.size ? names : undefined
}

// non-mutating lookup of a name (including private `#name` or dotted `mod.name`) in `scope`
const lookupInScope = (
	name: string,
	scope: BaseScope,
	shadowed?: ReadonlySet<string>
): unknown => {
	const topName = name.includes(".") ? name.slice(0, name.indexOf(".")) : name
	if (shadowed?.has(topName)) return undefined
	const direct = (key: string): unknown => {
		if (hasOwn(scope.res, key)) {
			const resolved = scope.res[key]
			if (resolved !== undefined && !hasArkKind(resolved, "context"))
				return resolved
		}
		if (hasOwn(scope.res, `#${key}`)) {
			const resolved = scope.res[`#${key}`]
			if (resolved !== undefined && !hasArkKind(resolved, "context"))
				return resolved
		}
		if (hasOwn(scope.aliases, key)) return scope.aliases[key]
		if (hasOwn(scope.aliases, `#${key}`)) return scope.aliases[`#${key}`]
		if (hasOwn(scope.ambient, key)) return scope.ambient[key]
		return undefined
	}
	const found = direct(name)
	if (found !== undefined) return found
	if (!name.includes(".")) return undefined
	const parts = name.split(".")
	let cur = direct(parts[0])
	for (let i = 1; i < parts.length; i++) {
		if (!cur || typeof cur !== "object") return undefined
		const rec = cur as Record<string, unknown>
		if (!hasOwn(rec, parts[i])) return undefined
		cur = rec[parts[i]]
	}
	return cur
}

// strip matching outer parentheses `(expr)`
const stripOuterParens = (expr: string): string => {
	let s = expr.trim()
	while (s.startsWith("(") && s.endsWith(")")) {
		let depth = 0
		let wrapsWhole = true
		for (let i = 0; i < s.length; i++) {
			const ch = s[i]
			if (ch === "'" || ch === '"' || ch === "/") {
				i = skipQuotedOrRegex(s, i) - 1
				continue
			}
			if (ch === "(") depth++
			else if (ch === ")") {
				depth--
				if (depth === 0 && i < s.length - 1) {
					wrapsWhole = false
					break
				}
			}
		}
		if (!wrapsWhole) break
		s = s.slice(1, -1).trim()
	}
	return s
}

// split `expr` on a top-level binary operator (`|` or `&`)
const splitTopLevelOp = (expr: string, op: "|" | "&"): string[] | undefined => {
	const parts: string[] = []
	let start = 0
	let parenDepth = 0
	let angleDepth = 0
	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i]
		if (ch === "'" || ch === '"' || ch === "/") {
			i = skipQuotedOrRegex(expr, i) - 1
			continue
		}
		if (ch === "(") parenDepth++
		else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1)
		else if (ch === "<" && expr[i + 1] !== "=") angleDepth++
		else if (ch === ">" && expr[i + 1] !== "=")
			angleDepth = Math.max(0, angleDepth - 1)
		else if (ch === op && parenDepth === 0 && angleDepth === 0) {
			parts.push(expr.slice(start, i).trim())
			start = i + 1
		}
	}
	if (!parts.length) return undefined
	parts.push(expr.slice(start).trim())
	return parts
}

const unescapeStringLiteral = (raw: string): string | undefined => {
	if (raw.length < 2) return undefined
	const quote = raw[0]
	if ((quote !== "'" && quote !== '"') || raw[raw.length - 1] !== quote)
		return undefined
	// ensure closing quote is actually the end of the literal (not `'a' | 'b'`)
	if (skipQuotedOrRegex(raw, 0) !== raw.length) return undefined
	let out = ""
	for (let i = 1; i < raw.length - 1; i++) {
		if (raw[i] === "\\" && i + 1 < raw.length - 1) {
			out += raw[i + 1]
			i++
		} else out += raw[i]
	}
	return out
}

const applyStructuralOp = (
	op: DroppedNarrowOp,
	argRoots: BaseRoot[]
): BaseRoot | undefined => {
	try {
		if (op === ".partial()") return argRoots[0]?.partial()
		if (op === ".required()") return argRoots[0]?.required()
		if (op === ".pick()") return argRoots[0]?.pick(argRoots[1] as never)
		if (op === ".omit()") return argRoots[0]?.omit(argRoots[1] as never)
		if (op === ".merge()") return argRoots[0]?.merge(argRoots[1])
	} catch {
		return undefined
	}
}

const evalDefInScope = (
	def: unknown,
	scope: BaseScope,
	seen: Set<unknown>
): BaseRoot | undefined => {
	try {
		if (hasArkKind(def, "root")) return def
		if (typeof def === "string") return evalStringTypeInScope(def, scope, seen)
		if (seen.has(def)) return undefined
		if (Array.isArray(def)) {
			seen.add(def)
			if (def.length === 3 && def[1] === ":") {
				const base = evalDefInScope(def[0], scope, seen)
				if (base && typeof def[2] === "function")
					return base.narrow(def[2] as never)
				return base
			}
			if (def.length === 3 && def[1] === "@")
				return evalDefInScope(def[0], scope, seen)
			if (def.length === 3 && def[1] === "&") {
				const l = evalDefInScope(def[0], scope, new Set(seen))
				const r = evalDefInScope(def[2], scope, new Set(seen))
				return l && r ? l.and(r) : undefined
			}
			if (def.length === 3 && def[1] === "|") {
				const l = evalDefInScope(def[0], scope, new Set(seen))
				const r = evalDefInScope(def[2], scope, new Set(seen))
				return l && r ? l.or(r) : undefined
			}
			return undefined
		}
		if (isPlainContainer(def)) return type.raw(def).internal
	} catch {
		return undefined
	}
	return undefined
}

const evalStringTypeInScope = (
	rawExpr: string,
	scope: BaseScope,
	seen = new Set<unknown>(),
	shadowed?: ReadonlySet<string>
): BaseRoot | undefined => {
	try {
		const expr = stripOuterParens(rawExpr)
		if (!expr) return undefined
		const unionParts = splitTopLevelOp(expr, "|")
		if (unionParts) {
			const roots: BaseRoot[] = []
			for (const part of unionParts) {
				const r = evalStringTypeInScope(part, scope, new Set(seen), shadowed)
				if (!r) return undefined
				roots.push(r)
			}
			return roots.reduce((a, b) => a.or(b))
		}
		const interParts = splitTopLevelOp(expr, "&")
		if (interParts) {
			const roots: BaseRoot[] = []
			for (const part of interParts) {
				const r = evalStringTypeInScope(part, scope, new Set(seen), shadowed)
				if (!r) return undefined
				roots.push(r)
			}
			return roots.reduce((a, b) => a.and(b))
		}
		if (expr.endsWith("[]")) {
			const inner = evalStringTypeInScope(
				expr.slice(0, -2),
				scope,
				seen,
				shadowed
			)
			return inner?.array()
		}
		const lit = unescapeStringLiteral(expr)
		if (lit !== undefined) return type.unit(lit).internal
		// single generic instantiation spanning the whole expression
		const genMatch = /^([#$A-Z_a-z][\w#$.]*)\s*</.exec(expr)
		if (genMatch) {
			const ltIndex = genMatch[0].length - 1
			const parsed = parseAngleArgs(expr, ltIndex)
			if (parsed && parsed.end === expr.length) {
				const target = lookupInScope(genMatch[1], scope, shadowed)
				if (hasArkKind(target, "generic")) {
					const argRoots: BaseRoot[] = []
					for (const arg of parsed.args) {
						const r = evalStringTypeInScope(arg, scope, new Set(seen), shadowed)
						if (!r) return undefined
						argRoots.push(r)
					}
					const structural = structuralGenericOf(target)
					if (structural) return applyStructuralOp(structural[0], argRoots)
					return target(...argRoots)
				}
				return undefined
			}
		}
		// simple or dotted alias / keyword
		if (/^[#$A-Z_a-z][\w#$.]*$/.test(expr)) {
			if (seen.has(expr)) return undefined
			seen.add(expr)
			const resolved = lookupInScope(expr, scope, shadowed)
			if (hasArkKind(resolved, "root")) return resolved
			if (resolved !== undefined) return evalDefInScope(resolved, scope, seen)
		}
	} catch {
		return undefined
	}
	return undefined
}

const checkStringGenericDrops = (
	expr: string,
	scope: BaseScope,
	shadowed?: ReadonlySet<string>
): { op: DroppedNarrowOp; operand: string }[] => {
	const drops: { op: DroppedNarrowOp; operand: string }[] = []
	for (const call of scanStringGenerics(expr)) {
		const target = lookupInScope(call.name, scope, shadowed)
		if (!hasArkKind(target, "generic")) continue
		const info = structuralGenericOf(target)
		if (!info) continue
		const [op, argIndices] = info
		if (call.args.length !== target.params.length) continue
		const argRoots: BaseRoot[] = []
		let allResolved = true
		for (const arg of call.args) {
			const r = evalStringTypeInScope(arg, scope, new Set(), shadowed)
			if (!r) {
				allResolved = false
				break
			}
			argRoots.push(r)
		}
		if (!allResolved) continue
		const after = applyStructuralOp(op, argRoots)
		if (!after) continue
		for (const idx of argIndices) {
			if (dropsUserPredicate(argRoots[idx], after))
				drops.push({ op, operand: call.args[idx] })
		}
	}
	return drops
}

export const isDropNarrowSuppressed = (
	module: SourceModule,
	span: Span,
	operatorNode?: Node
): boolean => {
	const { nodes, leadingLines, trailingLines } = module.allowDropNarrows
	if (
		nodes.some(
			mark =>
				contains(mark, span) || (!!operatorNode && contains(mark, operatorNode))
		)
	)
		return true
	const [endLine] = module.lineAndColumnOf(Math.max(span.start, span.end - 1))
	if (operatorNode) {
		const [opLine] = module.lineAndColumnOf(operatorNode.start)
		return (
			trailingLines.has(opLine) ||
			leadingLines.has(opLine) ||
			trailingLines.has(endLine)
		)
	}
	const [spanLine] = module.lineAndColumnOf(span.start)
	return trailingLines.has(spanLine) || trailingLines.has(endLine)
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
	const [siteEndLine] = module.lineAndColumnOf(
		Math.max(siteNode.start, siteNode.end - 1)
	)
	const emitDrop = (
		drop: DroppedNarrow,
		op: DroppedNarrowOp,
		operand: Node | string
	) => {
		// report in the site's module when the operation happened inside a helper
		// function or another module, so `isQuiet` and ESLint surface it at the call
		const dropInsideSite = contains(siteNode, drop.node)
		const inSiteScope =
			drop.module === module &&
			(dropInsideSite || enclosingFunctionOf(drop.node) === siteFn)
		if (
			isDropNarrowSuppressed(drop.module, drop.node, drop.operatorNode) ||
			(inSiteScope ?
				module.allowDropNarrows.nodes.some(mark => contains(mark, siteNode)) ||
				(!dropInsideSite &&
					module.allowDropNarrows.trailingLines.has(siteEndLine))
			:	isDropNarrowSuppressed(module, siteNode))
		)
			return
		const targetSpan = inSiteScope ? drop.node : siteNode
		const label = operandLabelOf(operand, drop.module)
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
				writeDroppedNarrowMessage(label, op),
				reasons,
				undefined,
				"warning"
			)
		)
	}
	for (const drop of state.droppedNarrows) {
		if (drop.pendingString) {
			for (const found of checkStringGenericDrops(
				drop.pendingString.expr,
				drop.pendingString.scope,
				drop.pendingString.shadowed
			))
				emitDrop(drop, found.op, found.operand)
			continue
		}
		if (
			drop.pending &&
			!defDropsUserPredicate(drop.pending.def, drop.pending.scope, undefined, {
				spreadOnly: true,
				shadowed: drop.pending.shadowed
			})
		)
			continue
		emitDrop(drop, drop.op, drop.operand)
	}
	return result
}
