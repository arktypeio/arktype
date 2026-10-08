import type { IdentifierReference, Node } from "oxc-parser"
import {
	bindingOfFunction,
	enclosingFunctionOf,
	runtimeExports,
	runtimeMembers,
	unstableArkMembers,
	staticBodyOf,
	type FunctionNode,
	type ModuleGraph
} from "./graph.ts"
import {
	createSiteState,
	isDynamic,
	isValidator,
	type Interpreter,
	type SiteState
} from "./interpreter.ts"
import type { SourceModule } from "./module.ts"
import type { SiteKind } from "./precompile.ts"
import { isTransparent, type Reference } from "./scope.ts"

export interface SiteCandidate {
	kind: SiteKind
	root: Node
	// the nearest enclosing function, which runs the site each time it is called
	fn: FunctionNode | undefined
	state: SiteState
	// the calls the site climbed through, innermost first, as the callee or argument the site can shrink back to
	fallbacks: Node[]
}

export const findSites = (
	module: SourceModule,
	graph: ModuleGraph,
	interpreter: Interpreter
): SiteCandidate[] => {
	const candidates: SiteCandidate[] = []
	for (const reference of module.scopes.references) {
		const kind = rootKindOf(reference, module, graph)
		if (!kind) continue
		const fn = enclosingFunctionOf(reference.id)
		if (fn && isFoldedHelper(fn, module)) continue
		const root = kind === "helper" ? helperCallOf(reference.id)! : reference.id
		const value =
			kind === "reference" ?
				interpreter.valueOfBinding(reference.binding!, module)
			:	undefined
		// a binding the build could not compute is reported where it is defined, or holds validated data
		if (kind === "reference" && (value === undefined || isDynamic(value)))
			continue
		const fallbacks: Node[] = []
		const top = climb(root, isValidator(value), fallbacks, module, graph)
		if (top === reference.id) continue
		candidates.push({
			kind,
			root: reference.id,
			fn,
			state: createSiteState(top, module),
			fallbacks
		})
	}
	return candidates.sort(
		(l, r) =>
			depthOf(l.fn) - depthOf(r.fn) ||
			l.state.node.start - r.state.node.start ||
			r.state.node.end - l.state.node.end
	)
}

const rootKindOf = (
	reference: Reference,
	module: SourceModule,
	graph: ModuleGraph
): SiteKind | undefined => {
	const binding = reference.binding
	if (!binding || reference.isWrite) return
	const [name] = graph.arkExportOf(reference, module) ?? []
	if (name)
		return name in runtimeExports || name === "configure" ? undefined : name
	if (graph.isArkBinding(binding, module)) return "reference"
	const call = helperCallOf(reference.id)
	const helper =
		call && graph.helperOf((call as { callee: Node }).callee, module)
	return helper && graph.isArkHelper(helper[0], helper[1]) ?
			"helper"
		:	undefined
}

const helperCallOf = (id: Node): Node | undefined => {
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

const climb = (
	root: Node,
	isValidator: boolean,
	fallbacks: Node[],
	module: SourceModule,
	graph: ModuleGraph
): Node => {
	let top = root
	for (;;) {
		let probe = top
		let parent = probe.parent
		while (
			parent &&
			(isTransparent(parent) || parent.type === "ChainExpression")
		) {
			probe = parent
			parent = parent.parent
		}
		if (
			parent?.type === "MemberExpression" &&
			parent.object === probe &&
			!isRuntimeMember(parent, root)
		)
			top = parent
		else if (
			parent?.type === "CallExpression" &&
			(parent.callee === probe ?
				!(isValidator && top === root)
			:	!!graph.helperOf(parent.callee, module))
		) {
			fallbacks.push(top)
			top = parent
		} else return top
	}
}

const isRuntimeMember = (
	member: Extract<Node, { type: "MemberExpression" }>,
	root: Node
): boolean => {
	const name =
		member.computed ?
			member.property.type === "Literal" ?
				member.property.value
			:	undefined
		:	(member.property as IdentifierReference).name
	return (
		typeof name === "string" &&
		(name in runtimeMembers ||
			name in unstableArkMembers ||
			(name === "errors" &&
				member.object === root &&
				(root as IdentifierReference).name === "type"))
	)
}

// a static helper that is only ever called is folded at each call, so its body holds no sites of its own
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
				reference.id.parent?.type === "CallExpression" &&
				reference.id.parent.callee === reference.id
		)
	)
}

const depthOf = (fn: FunctionNode | undefined) => {
	let depth = 0
	for (let node: Node | undefined = fn; node; node = enclosingFunctionOf(node))
		depth++
	return depth
}
