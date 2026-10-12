import type { CallExpression, Node } from "oxc-parser"
import {
	bindingOfFunction,
	enclosingFunctionOf,
	isArk,
	isPassiveReference,
	isRuntimeExport,
	isIntrospectedProperty,
	isValidatorMember,
	memberNameOf,
	staticBodyOf,
	type FunctionNode,
	type ModuleGraph
} from "./graph.ts"
import {
	createSiteState,
	isDynamic,
	type Interpreter,
	type SiteState
} from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import type { SiteKind } from "./precompile.ts"
import { operatorOf, type Reference } from "./scope.ts"

export interface SiteCandidate {
	kind: SiteKind
	root: Node
	// the nearest enclosing function, which runs the site each time it is called
	fn: FunctionNode | undefined
	// a static helper the site is written in, which folds the site into each call that reaches it
	helper: FunctionNode | undefined
	state: SiteState
	// the calls the site climbed through, innermost first, as the callee or argument the site can shrink back to
	fallbacks: Node[]
	// what the site read a validator's member of, innermost first, where it ends if that's a Type rather than a Module
	ends: Node[]
	isSite?: boolean
}

export interface SiteRead {
	reference: Reference
	kind: SiteKind
	root: Node
	candidate: SiteCandidate | undefined
}

export const findSites = (
	module: SourceModule,
	graph: ModuleGraph,
	// whether a Type's json or toJSON() at a site of its own folds to what arktype returns, as a standalone build bakes it
	foldsIntrospection: boolean
): SiteRead[] => {
	const reads: SiteRead[] = []
	// candidates climbing to one node evaluate it once
	const statesByNode = new Map<Node, SiteState>()
	for (const reference of module.scopes.references) {
		const found = rootOf(reference, module, graph)
		if (!found) continue
		const [kind, root, isOwnSite] = found
		const fallbacks: Node[] = []
		const ends: Node[] = []
		const climbed = climb(root, fallbacks, ends, module, graph)
		const top =
			(foldsIntrospection && introspectionReadOf(climbed, module, graph)) ||
			climbed
		let candidate: SiteCandidate | undefined
		if (top !== root || isOwnSite) {
			let state = statesByNode.get(top)
			if (!state) statesByNode.set(top, (state = createSiteState(top, module)))
			const fn = enclosingFunctionOf(reference.id)
			candidate = {
				kind,
				root: kind === "helper" ? reference.id : root,
				fn,
				helper: fn && isFoldedHelper(fn, module) ? fn : undefined,
				state,
				fallbacks,
				ends
			}
		}
		reads.push({ reference, kind, root, candidate })
	}
	return reads
}

// each reference is read before any site settles, so a site's holes are judged after what the module's bindings ran, like a Scope's thunks its export calls
export const filterSites = (
	reads: SiteRead[],
	module: SourceModule,
	interpreter: Interpreter
): SiteCandidate[] => {
	const candidates: SiteCandidate[] = []
	for (const { reference, kind, root, candidate } of reads) {
		const value =
			kind !== "reference" ? undefined
			: root === reference.id ?
				interpreter.valueOfBinding(reference.binding!, module)
			:	interpreter.evaluateSite(createSiteState(root, module)).value
		// a binding the build could not compute is reported where it is defined, and validated data or a RegExp is read at runtime
		if (
			kind === "reference" &&
			(value === undefined || isDynamic(value) || value instanceof RegExp)
		)
			continue
		if (candidate) candidates.push(candidate)
	}
	// a call to a static helper is a site only if the helper's own sites do not cover it, so those settle first
	return candidates.sort(
		(l, r) =>
			settleOrderOf(l) - settleOrderOf(r) ||
			depthOf(l.fn) - depthOf(r.fn) ||
			l.state.node.start - r.state.node.start ||
			r.state.node.end - l.state.node.end
	)
}

// e.g. a call to a helper composing a Type, which is a site even where nothing composes it
const rootOf = (
	reference: Reference,
	module: SourceModule,
	graph: ModuleGraph
): [kind: SiteKind, root: Node, isOwnSite: boolean] | undefined => {
	const binding = reference.binding
	if (!binding || reference.isWrite) return
	const [name, read] = graph.arkExportOf(reference, module) ?? []
	if (name) return isRuntimeExport(name) ? undefined : [name, read!, false]
	if (isArk(graph.bindingKindOf(binding, module)))
		return ["reference", reference.id, false]
	const member = arkMemberOf(reference.id, module, graph)
	if (member) return ["reference", member, false]
	const call = helperCallOf(reference.id)
	const helper = call && graph.helperOf(call.callee, module)
	if (!helper) return
	const isOwnSite = graph.composesArk(...helper)
	if (isArk(graph.kindOf(call, module))) return ["helper", call, isOwnSite]
	const returned = arkMemberOf(call, module, graph)
	if (returned) return ["reference", returned, false]
	return isOwnSite ? ["helper", call, isOwnSite] : undefined
}

// e.g. `schemas.users.User` or `make().User`, with `schemas` a namespace import or an object literal holding Types and `make` a helper returning one
const arkMemberOf = (
	node: Node,
	module: SourceModule,
	graph: ModuleGraph
): Node | undefined => {
	for (;;) {
		const [operand, member] = operatorOf(node)
		if (member?.type !== "MemberExpression" || member.object !== operand) return
		if (isArk(graph.kindOf(member, module))) return member
		node = member
	}
}

// e.g. `T.json`, `T.expression` or `T.toJsonSchema()`, or `$.json`, which the build refuses rather than read nothing at runtime
const introspectionReadOf = (
	node: Node,
	module: SourceModule,
	graph: ModuleGraph
): Node | undefined => {
	const [operand, member] = operatorOf(node)
	if (
		member?.type !== "MemberExpression" ||
		member.object !== operand ||
		!isArk(graph.kindOf(node, module))
	)
		return
	const name = memberNameOf(member)
	if (isIntrospectedProperty(name)) return member
	if (name !== "toJSON" && name !== "toJsonSchema") return
	const [callee, call] = operatorOf(member)
	return call?.type === "CallExpression" && call.callee === callee ?
			call
		:	undefined
}

const helperCallOf = (id: Node): CallExpression | undefined => {
	const parent = id.parent
	const callee =
		parent?.type === "MemberExpression" && parent.object === id ? parent : id
	return (
			callee.parent?.type === "CallExpression" &&
				callee.parent.callee === callee
		) ?
			callee.parent
		:	undefined
}

// e.g. `A.and(B).array()` from `A`, or `withId(A)` from `A` with `withId` a static helper
const climb = (
	root: Node,
	fallbacks: Node[],
	ends: Node[],
	module: SourceModule,
	graph: ModuleGraph
): Node => {
	let top = root
	for (;;) {
		const [probe, parent] = operatorOf(top)
		const composer = graph.composerOf(top, module)
		if (composer?.type === "MemberExpression") {
			if (isValidatorMember(memberNameOf(composer))) ends.push(top)
			top = composer
		} else if (
			composer ||
			(parent?.type === "CallExpression" &&
				parent.callee !== probe &&
				graph.helperOf(parent.callee, module))
		) {
			fallbacks.push(top)
			top = parent!
		} else return top
	}
}

// a static helper that is only ever called, so a site in it is its own only if it reads none of the helper's bindings
export const isFoldedHelper = (
	fn: FunctionNode,
	module: SourceModule
): boolean => {
	const binding = bindingOfFunction(fn, module)
	return (
		!!binding &&
		!binding.writes.length &&
		!!staticBodyOf(fn) &&
		binding.references.every(
			reference =>
				(reference.id.parent?.type === "CallExpression" &&
					reference.id.parent.callee === reference.id) ||
				isPassiveReference(reference.id, module)
		)
	)
}

const settleOrderOf = (candidate: SiteCandidate) =>
	!candidate.helper ? 2
	: candidate.kind === "helper" ? 1
	: 0

const depthOf = (fn: FunctionNode | undefined) => {
	let depth = 0
	for (let node: Node | undefined = fn; node; node = enclosingFunctionOf(node))
		depth++
	return depth
}
