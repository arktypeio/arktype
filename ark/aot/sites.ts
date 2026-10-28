import type { Node } from "oxc-parser"
import {
	enclosingFunctionOf,
	errorReaders,
	isArk,
	staticBodyOf,
	isRuntimeExport,
	isIntrospectedProperty,
	isValidatorMember,
	memberNameOf,
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
	state: SiteState
	// the callees or arguments the site can shrink back to, innermost first
	fallbacks: Node[]
	// what it reads a validator member of, innermost first, ending at a Type
	ends: Node[]
	// the function a call to a static helper calls, e.g. `text` for `text(50)`
	callee?: [FunctionNode, SourceModule]
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
	// fold json and toJSON() at their own site, as standalone bakes them
	foldsIntrospection: boolean
): SiteRead[] => {
	const reads: SiteRead[] = []
	// candidates climbing to one node evaluate it once
	const statesByNode = new Map<Node, SiteState>()
	for (const reference of module.scopes.references) {
		const found = rootOf(reference, module, graph)
		if (!found) continue
		const [kind, root, callee] = found
		const fallbacks: Node[] = callee ? [root] : []
		const ends: Node[] = []
		const climbed = climb(
			callee ? operatorOf(root)[1]! : root,
			fallbacks,
			ends,
			module,
			graph
		)
		const top =
			(foldsIntrospection && introspectionReadOf(climbed, module, graph)) ||
			climbed
		let candidate: SiteCandidate | undefined
		if (top !== root) {
			let state = statesByNode.get(top)
			if (!state) statesByNode.set(top, (state = createSiteState(top, module)))
			candidate = {
				kind,
				root,
				fn: enclosingFunctionOf(reference.id),
				state,
				fallbacks,
				ends
			}
			if (callee) candidate.callee = callee
		}
		reads.push({ reference, kind, root, candidate })
	}
	return reads
}

// sites are judged once every reference is read
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
		// reported where it's defined, or data or a RegExp read at runtime
		if (
			kind === "reference" &&
			(value === undefined || isDynamic(value) || value instanceof RegExp)
		)
			continue
		if (candidate) candidates.push(candidate)
	}
	return candidates.sort(
		(l, r) =>
			depthOf(l.fn) - depthOf(r.fn) ||
			l.state.node.start - r.state.node.start ||
			r.state.node.end - l.state.node.end
	)
}

const rootOf = (
	reference: Reference,
	module: SourceModule,
	graph: ModuleGraph
):
	| [kind: SiteKind, root: Node, callee?: [FunctionNode, SourceModule]]
	| undefined => {
	const binding = reference.binding
	if (!binding || reference.isWrite) return
	const [name, read] = graph.arkExportOf(reference, module) ?? []
	if (name) {
		return isRuntimeExport(name) || name in errorReaders ?
				undefined
			:	[name, read!]
	}
	if (isArk(graph.bindingKindOf(binding, module)))
		return ["reference", reference.id]
	const member = arkMemberOf(reference.id, module, graph)
	if (member) return ["reference", member]
	const [operand, parent] = operatorOf(reference.id)
	const callee =
		parent?.type === "MemberExpression" && parent.object === operand ?
			parent
		:	reference.id
	const fn = graph.functionOf(callee, module)
	if (!fn || !staticBodyOf(fn[0])) return
	const [calleeOperand, call] = operatorOf(callee)
	if (
		graph.composerOf(callee, module) ||
		// e.g. `nullable(User)`, whose kind is what it returns for `User`
		(call?.type === "CallExpression" &&
			call.callee === calleeOperand &&
			isArk(graph.kindOf(call, module)))
	)
		return ["reference", callee, fn]
}

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

// e.g. `T.json`, `T.expression`, `T.toJsonSchema()` or `$.json`
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

// e.g. `A.and(B).array()` from `A`
const climb = (
	root: Node,
	fallbacks: Node[],
	ends: Node[],
	module: SourceModule,
	graph: ModuleGraph
): Node => {
	let top = root
	for (;;) {
		const composer = graph.composerOf(top, module)
		if (!composer) return top
		if (composer.type !== "MemberExpression") fallbacks.push(top)
		else if (isValidatorMember(memberNameOf(composer))) ends.push(top)
		top = composer
	}
}

const depthOf = (fn: FunctionNode | undefined) => {
	let depth = 0
	for (let node: Node | undefined = fn; node; node = enclosingFunctionOf(node))
		depth++
	return depth
}
