import type { KeySet } from "@ark/util"
import {
	visitorKeys,
	type AccessorProperty,
	type Class,
	type Function,
	type IdentifierReference,
	type JSXIdentifier,
	type MethodDefinition,
	type Node,
	type ObjectProperty,
	type ParamPattern,
	type Program,
	type PropertyDefinition
} from "oxc-parser"

export type BindingKind =
	| "import"
	| "const"
	| "let"
	| "var"
	| "function"
	| "class"
	| "enum"
	| "member"
	| "namespace"
	| "param"
	| "catch"

export interface Binding {
	name: string
	kind: BindingKind
	id: Node
	// e.g. the declarator or import specifier, or a param's function
	declaration: Node
	scope: Scope
	references: Reference[]
	writes: Node[]
	exportNames: string[]
	isAmbient: boolean
}

export interface Reference {
	id: IdentifierReference | JSXIdentifier
	binding: Binding | undefined
	isWrite: boolean
}

export interface Scope {
	node: Node
	parent: Scope | undefined
	bindings: Record<string, Binding>
	unresolved: Reference[]
}

type ExportEntry =
	| { kind: "binding"; binding: Binding }
	| { kind: "reexport"; specifier: string; name: string }
	| { kind: "namespace"; specifier: string }
	| { kind: "expression"; node: Node }

export class ModuleScopes {
	root: Scope
	references: Reference[] = []
	byId = new Map<Node, Reference>()
	bindingsById = new Map<Node, Binding>()
	exportsByName: Record<string, ExportEntry> = Object.create(null)
	starExports: string[] = []
	private scope: Scope
	private pendingExports: [string, Reference][] = []

	constructor(program: Program) {
		this.root = this.scope = createScope(program, undefined)
		for (const statement of program.body) this.visit(statement, program)
		this.close()
		for (const reference of this.references) {
			if (reference.binding && reference.isWrite)
				reference.binding.writes.push(reference.id)
		}
		for (const name in this.exportsByName) {
			const entry = this.exportsByName[name]
			if (entry.kind === "binding") entry.binding.exportNames.push(name)
		}
	}

	private visit(node: Node | null | undefined, parent: Node): void {
		if (!node) return
		node.parent = parent
		switch (node.type) {
			case "Identifier":
				this.reference(node as IdentifierReference, false)
				return
			case "FunctionDeclaration":
			case "FunctionExpression":
			case "ArrowFunctionExpression":
				return this.visitFunction(node)
			case "ClassDeclaration":
			case "ClassExpression":
				return this.visitClass(node)
			case "BlockStatement":
			case "StaticBlock":
				return this.inScope(node, () => this.visitAll(node.body, node))
			case "ForStatement":
			case "SwitchStatement":
				return this.inScope(node, () => this.visitChildren(node))
			case "ForInStatement":
			case "ForOfStatement":
				return this.inScope(node, () => {
					if (node.left.type === "VariableDeclaration")
						this.visit(node.left, node)
					else this.visitTarget(node.left, node)
					this.visit(node.right, node)
					this.visit(node.body, node)
				})
			case "CatchClause":
				return this.inScope(node, () => {
					if (node.param) this.bindPattern(node.param, "catch", node, node)
					this.visit(node.body, node)
				})
			case "VariableDeclaration":
				return this.visitVariables(node)
			case "ImportDeclaration":
				if (node.importKind === "type") return
				for (const specifier of node.specifiers) {
					specifier.parent = node
					if (
						specifier.type === "ImportSpecifier" &&
						specifier.importKind === "type"
					)
						continue
					this.bind(specifier.local, "import", specifier, specifier)
				}
				return
			case "ExportNamedDeclaration":
				return this.visitExport(node)
			case "ExportDefaultDeclaration": {
				this.visit(node.declaration, node)
				const [id] = declaredIds(node.declaration)
				const binding = id && this.bindingsById.get(id)
				this.exportsByName.default =
					binding ?
						{ kind: "binding", binding }
					:	{ kind: "expression", node: node.declaration }
				// `export default T` exports the binding T names, once it resolves
				if (node.declaration.type === "Identifier") {
					this.pendingExports.push([
						"default",
						this.byId.get(node.declaration)!
					])
				}
				return
			}
			case "ExportAllDeclaration":
				if (node.exportKind === "type") return
				if (node.exported) {
					this.exportsByName[exportNameOf(node.exported)] = {
						kind: "namespace",
						specifier: node.source.value
					}
				} else this.starExports.push(node.source.value)
				return
			case "TSExportAssignment":
				this.exportsByName.default = {
					kind: "expression",
					node: node.expression
				}
				return this.visit(node.expression, node)
			case "MemberExpression":
				this.visit(node.object, node)
				if (node.computed) this.visit(node.property, node)
				else node.property.parent = node
				return
			case "Property":
			case "MethodDefinition":
			case "PropertyDefinition":
			case "AccessorProperty":
				return this.visitProperty(node as never)
			case "LabeledStatement":
				return this.visit(node.body, node)
			case "BreakStatement":
			case "ContinueStatement":
			case "MetaProperty":
			case "Literal":
			case "ThisExpression":
			case "Super":
			case "TemplateElement":
				return
			case "AssignmentExpression":
				this.visitTarget(node.left, node)
				return this.visit(node.right, node)
			case "UpdateExpression":
				return this.visitTarget(node.argument, node)
			case "TSEnumDeclaration":
				this.bind(node.id, "enum", node, node)
				if (node.declare) this.scope.bindings[node.id.name].isAmbient = true
				return this.inScope(node, () => {
					for (const member of node.body.members) {
						member.parent = node
						if (member.id.type !== "TemplateLiteral") {
							const name =
								member.id.type === "Identifier" ?
									member.id.name
								:	member.id.value
							this.bindName(name, member.id, "member", member)
						}
						this.visit(member.initializer, member)
					}
				})
			case "TSModuleDeclaration": {
				if (node.declare || !node.body) return
				// e.g. `A` in `namespace A.B {}`
				let id: Node = node.id
				id.parent = node
				while (id.type === "TSQualifiedName") {
					id.left.parent = id
					id = id.left
				}
				if (id.type !== "Identifier") return
				this.bind(id, "namespace", node, id.parent!)
				return this.inScope(node, () => this.visit(node.body, node))
			}
			case "TSModuleBlock":
				return this.visitAll(node.body, node)
			case "TSImportEqualsDeclaration":
				if (node.importKind === "type") return
				this.bind(node.id, "import", node, node)
				return this.visit(node.moduleReference, node)
			case "TSQualifiedName":
				return this.visit(node.left, node)
			case "TSExternalModuleReference":
				return this.visit(node.expression, node)
			case "JSXOpeningElement":
			case "JSXClosingElement":
				this.visitJsxName(node.name, node)
				if (node.type === "JSXOpeningElement")
					this.visitAll(node.attributes, node)
				return
			case "JSXAttribute":
				return this.visit(node.value, node)
		}
		if (isTransparent(node)) return this.visit(node.expression, node)
		if (node.type.startsWith("TS")) return
		this.visitChildren(node)
	}

	private visitChildren(node: Node): void {
		forEachChild(node, child => this.visit(child, node))
	}

	private visitAll(nodes: readonly (Node | null)[], parent: Node): void {
		for (const node of nodes) this.visit(node, parent)
	}

	private visitFunction(node: Function | ArrowFunctionNode): void {
		const { body } = node
		if (!body) return
		if (node.type === "FunctionDeclaration" && node.id)
			this.bind(node.id, "function", node, node)
		const visitScope = () =>
			this.inScope(node, () => {
				for (const param of runtimeParamsOf(node))
					this.bindPattern(param, "param", node, node)
				if (body.type === "BlockStatement") {
					body.parent = node
					this.visitAll(body.body, body)
				} else this.visit(body, node)
			})
		if (node.type === "FunctionExpression" && node.id) {
			this.inScope(node, () => {
				this.bind(node.id!, "function", node, node)
				visitScope()
			})
		} else visitScope()
	}

	private visitClass(node: Class): void {
		if (node.declare) return
		if (node.type === "ClassDeclaration" && node.id)
			this.bind(node.id, "class", node, node)
		this.visitAll(node.decorators, node)
		this.inScope(node, () => {
			if (node.type === "ClassExpression" && node.id)
				this.bind(node.id, "class", node, node)
			this.visit(node.superClass, node)
			node.body.parent = node
			for (const element of node.body.body) this.visit(element, node.body)
		})
	}

	private visitProperty(
		node:
			| ObjectProperty
			| MethodDefinition
			| PropertyDefinition
			| AccessorProperty
	): void {
		if (node.type !== "Property") this.visitAll(node.decorators, node)
		if (node.computed) this.visit(node.key, node)
		else node.key.parent = node
		if (node.type === "Property" || node.type === "MethodDefinition")
			return this.visit(node.value, node)
		if (node.value) this.inScope(node, () => this.visit(node.value, node))
	}

	private visitVariables(
		node: Extract<Node, { type: "VariableDeclaration" }>
	): void {
		const kind: BindingKind =
			node.kind === "var" ? "var"
			: node.kind === "let" ? "let"
			: "const"
		for (const declarator of node.declarations) {
			declarator.parent = node
			const scope = kind === "var" ? this.functionScope() : this.scope
			if (
				declarator.init &&
				declarator.id.type === "Identifier" &&
				scope.bindings[declarator.id.name]?.kind === "var"
			) {
				scope.bindings[declarator.id.name].writes.push(declarator.id)
				declarator.id.parent = declarator
			} else
				this.bindPattern(declarator.id, kind, declarator, declarator, scope)
			if (node.declare) {
				for (const id of idsOf(declarator.id))
					this.bindingsById.get(id)!.isAmbient = true
			}
			this.visit(declarator.init, declarator)
		}
	}

	private visitExport(
		node: Extract<Node, { type: "ExportNamedDeclaration" }>
	): void {
		if (node.exportKind === "type") return
		// a namespace's export is a member of it, not of the module
		if (this.scope !== this.root) return this.visit(node.declaration, node)
		if (node.declaration) {
			this.visit(node.declaration, node)
			for (const id of declaredIds(node.declaration)) {
				const binding = this.bindingsById.get(id)
				if (binding)
					this.exportsByName[binding.name] = { kind: "binding", binding }
			}
			return
		}
		for (const specifier of node.specifiers) {
			specifier.parent = node
			if (specifier.exportKind === "type") continue
			const name = exportNameOf(specifier.exported)
			if (node.source) {
				this.exportsByName[name] = {
					kind: "reexport",
					specifier: node.source.value,
					name: exportNameOf(specifier.local)
				}
			} else {
				const reference = this.reference(
					specifier.local as IdentifierReference,
					false
				)
				specifier.local.parent = specifier
				this.pendingExports.push([name, reference])
			}
		}
	}

	private visitTarget(target: Node, parent: Node): void {
		target.parent = parent
		switch (target.type) {
			case "Identifier":
				this.reference(target as IdentifierReference, true)
				return
			case "ObjectPattern":
				for (const property of target.properties) {
					property.parent = target
					if (property.type === "RestElement")
						this.visitTarget(property.argument, property)
					else {
						if (property.computed) this.visit(property.key, property)
						this.visitTarget(property.value, property)
					}
				}
				return
			case "ArrayPattern":
				for (const element of target.elements)
					if (element) this.visitTarget(element, target)
				return
			case "AssignmentPattern":
				this.visitTarget(target.left, target)
				return this.visit(target.right, target)
			case "RestElement":
				return this.visitTarget(target.argument, target)
		}
		if (isTransparent(target)) this.visitTarget(target.expression, target)
		else this.visit(target, parent)
	}

	private visitJsxName(name: Node, parent: Node): void {
		name.parent = parent
		if (name.type === "JSXMemberExpression") {
			if (name.object.type === "JSXIdentifier") {
				name.object.parent = name
				this.reference(name.object, false)
			} else this.visitJsxName(name.object, name)
			name.property.parent = name
		} else if (name.type === "JSXIdentifier" && /^[$A-Z_]/.test(name.name))
			this.reference(name, false)
	}

	private bindPattern(
		pattern: Node,
		kind: BindingKind,
		declaration: Node,
		parent: Node,
		scope = this.scope
	): void {
		pattern.parent = parent
		switch (pattern.type) {
			case "Identifier":
				if (pattern.name === "this") return
				return this.bind(pattern, kind, declaration, parent, scope)
			case "ObjectPattern":
				for (const property of pattern.properties) {
					property.parent = pattern
					if (property.type === "RestElement") {
						this.bindPattern(
							property.argument,
							kind,
							declaration,
							property,
							scope
						)
					} else {
						if (property.computed) this.visit(property.key, property)
						else property.key.parent = property
						this.bindPattern(property.value, kind, declaration, property, scope)
					}
				}
				return
			case "ArrayPattern":
				for (const element of pattern.elements) {
					if (element)
						this.bindPattern(element, kind, declaration, pattern, scope)
				}
				return
			case "AssignmentPattern":
				this.bindPattern(pattern.left, kind, declaration, pattern, scope)
				return this.visit(pattern.right, pattern)
			case "RestElement":
				return this.bindPattern(
					pattern.argument,
					kind,
					declaration,
					pattern,
					scope
				)
			case "TSParameterProperty":
				return this.bindPattern(
					pattern.parameter,
					kind,
					declaration,
					pattern,
					scope
				)
		}
	}

	private bind(
		id: Node,
		kind: BindingKind,
		declaration: Node,
		parent: Node,
		scope = this.scope
	): void {
		id.parent = parent
		this.bindName(
			(id as IdentifierReference).name,
			id,
			kind,
			declaration,
			scope
		)
	}

	private bindName(
		name: string,
		id: Node,
		kind: BindingKind,
		declaration: Node,
		scope = this.scope
	): void {
		// a name declared again, like a merged enum, is not static
		const existing = scope.bindings[name]
		if (existing) {
			existing.writes.push(id)
			this.bindingsById.set(id, existing)
			return
		}
		const binding: Binding = {
			name,
			kind,
			id,
			declaration,
			scope,
			references: [],
			writes: [],
			exportNames: [],
			isAmbient: false
		}
		scope.bindings[name] = binding
		this.bindingsById.set(id, binding)
	}

	private reference(
		id: IdentifierReference | JSXIdentifier,
		isWrite: boolean
	): Reference {
		const reference: Reference = { id, binding: undefined, isWrite }
		this.references.push(reference)
		this.byId.set(id, reference)
		this.scope.unresolved.push(reference)
		return reference
	}

	private inScope(node: Node, visit: () => void): void {
		const parentScope = this.scope
		this.scope = createScope(node, parentScope)
		visit()
		this.close()
		this.scope = parentScope
	}

	private close(): void {
		const { bindings, parent, unresolved } = this.scope
		for (const reference of unresolved) {
			const binding = bindings[reference.id.name]
			if (binding) {
				reference.binding = binding
				binding.references.push(reference)
			} else parent?.unresolved.push(reference)
		}
		if (parent) return
		for (const [name, reference] of this.pendingExports) {
			if (reference.binding) {
				this.exportsByName[name] = {
					kind: "binding",
					binding: reference.binding
				}
			}
		}
	}

	private functionScope(): Scope {
		let scope = this.scope
		while (scope.parent && !(scope.node.type in varScopeKinds))
			scope = scope.parent
		return scope
	}
}

type ArrowFunctionNode = Extract<Node, { type: "ArrowFunctionExpression" }>

const createScope = (node: Node, parent: Scope | undefined): Scope => ({
	node,
	parent,
	bindings: Object.create(null),
	unresolved: []
})

const varScopeKinds = {
	FunctionDeclaration: 1,
	FunctionExpression: 1,
	ArrowFunctionExpression: 1,
	StaticBlock: 1
} as const satisfies KeySet

export const typeKeys = {
	typeAnnotation: 1,
	typeParameters: 1,
	typeArguments: 1,
	returnType: 1,
	superTypeArguments: 1,
	implements: 1
} as const satisfies KeySet

const transparentKinds = {
	TSAsExpression: 1,
	TSSatisfiesExpression: 1,
	TSTypeAssertion: 1,
	TSNonNullExpression: 1,
	TSInstantiationExpression: 1
} as const satisfies KeySet

type TransparentNode = Extract<Node, { type: keyof typeof transparentKinds }>

export const isTransparent = (node: Node): node is TransparentNode =>
	node.type in transparentKinds

export const unwrapExpression = (node: Node): Node => {
	while (isTransparent(node)) node = node.expression
	return node
}

// e.g. `T` for `(T as Type)!` or `T?.and`
export const unwrapChain = (node: Node): Node => {
	while (isTransparent(node) || node.type === "ChainExpression")
		node = node.expression
	return node
}

// e.g. `T!` and `T!.and` for `T`
export const operatorOf = (
	node: Node
): [operand: Node, operator: Node | undefined] => {
	while (
		node.parent &&
		(isTransparent(node.parent) || node.parent.type === "ChainExpression")
	)
		node = node.parent
	return [node, node.parent ?? undefined]
}

// e.g. `o.a` in `o.a = 1`, `delete o.a` or `({ x: o.a } = p)`
export const isWriteTarget = (node: Node): boolean => {
	const parent = node.parent!
	if (isTransparent(parent)) return isWriteTarget(parent)
	switch (parent.type) {
		case "AssignmentExpression":
			return parent.left === node
		case "UpdateExpression":
			return true
		case "UnaryExpression":
			return parent.operator === "delete"
		case "ForInStatement":
		case "ForOfStatement":
			return parent.left === node
		case "ArrayPattern":
		case "ObjectPattern":
		case "RestElement":
			return isWriteTarget(parent)
		case "Property":
			return parent.value === node && isWriteTarget(parent)
		case "AssignmentPattern":
			return parent.left === node && isWriteTarget(parent)
	}
	return false
}

// a TypeScript `this` parameter types the receiver and takes no argument
export const runtimeParamsOf = (fn: {
	params: ParamPattern[]
}): ParamPattern[] =>
	fn.params[0]?.type === "Identifier" && fn.params[0].name === "this" ?
		fn.params.slice(1)
	:	fn.params

export const walk = (node: Node, visit: (node: Node) => boolean): void => {
	if (visit(node)) forEachChild(node, child => walk(child, visit))
}

const forEachChild = (node: Node, f: (child: Node) => void) => {
	for (const k of visitorKeys[node.type]) {
		if (k in typeKeys) continue
		const child = (node as never)[k] as Node | (Node | null)[] | null
		if (!Array.isArray(child)) {
			if (child) f(child)
		} else for (const item of child) if (item) f(item)
	}
}

export const loadedSourceOf = (node: Node): Node | undefined =>
	node.type === "ImportExpression" ? node.source
	: (
		node.type === "CallExpression" &&
		node.callee.type === "Identifier" &&
		node.callee.name === "require"
	) ?
		node.arguments[0]
	:	undefined

export const exportNameOf = (node: Node): string =>
	node.type === "Literal" ?
		String(node.value)
	:	(node as IdentifierReference).name

export const declaredIds = (declaration: Node): Node[] =>
	declaration.type === "VariableDeclaration" ?
		declaration.declarations.flatMap(declarator => idsOf(declarator.id))
	: "id" in declaration && declaration.id?.type === "Identifier" ?
		[declaration.id]
	:	[]

export const idsOf = (pattern: Node): Node[] => {
	switch (pattern.type) {
		case "Identifier":
			return [pattern]
		case "ObjectPattern":
			return pattern.properties.flatMap(property =>
				idsOf(
					property.type === "RestElement" ? property.argument : property.value
				)
			)
		case "ArrayPattern":
			return pattern.elements.flatMap(element =>
				element ? idsOf(element) : []
			)
		case "AssignmentPattern":
			return idsOf(pattern.left)
		case "RestElement":
			return idsOf(pattern.argument)
		default:
			return []
	}
}

export const isMemberRead = (node: Node, root: Node): boolean => {
	node = unwrapExpression(node)
	while (node !== root) {
		if (node.type !== "MemberExpression") return false
		node = unwrapExpression(node.object)
	}
	return true
}

// e.g. `export default configure(...)`
export const runsOnceAtLoad = (call: Node): boolean => {
	let statement = operatorOf(call)[1]
	if (statement?.type === "UnaryExpression" && statement.operator === "void")
		statement = operatorOf(statement)[1]
	if (statement?.type === "VariableDeclarator") statement = statement.parent
	if (statement?.parent?.type === "ExportNamedDeclaration")
		statement = statement.parent
	return (
		statement?.parent?.type === "Program" &&
		(statement.type === "ExpressionStatement" ||
			statement.type === "VariableDeclaration" ||
			statement.type === "ExportNamedDeclaration" ||
			statement.type === "ExportDefaultDeclaration")
	)
}

// e.g. "./a.ts" for `import("./a.ts")`, `require("./a.ts")` or `import a = require("./a.ts")`
export const loadedSpecifierOf = (node: Node): unknown => {
	// a require() may be one createRequire() returns
	const source =
		loadedSourceOf(node) ??
		((
			node.type === "TSImportEqualsDeclaration" &&
			node.importKind !== "type" &&
			node.moduleReference.type === "TSExternalModuleReference"
		) ?
			node.moduleReference.expression
		:	undefined)
	return source?.type === "Literal" ? source.value : undefined
}

// e.g. `await import("arktype")` as a statement, loading a module only to run it
export const isDiscarded = (node: Node): boolean => {
	let [, parent] = operatorOf(node)
	while (
		parent?.type === "AwaitExpression" ||
		(parent?.type === "UnaryExpression" && parent.operator === "void")
	)
		[, parent] = operatorOf(parent)
	return parent?.type === "ExpressionStatement"
}
