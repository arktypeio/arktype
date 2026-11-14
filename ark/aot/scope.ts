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
	type Program,
	type PropertyDefinition
} from "oxc-parser"
import { isTransparent, runtimeParamsOf } from "./proofs.ts"

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

	// whether it's CommonJS, whose exports are read only as tsc writes them
	isCommonJs = false

	constructor(program: Program) {
		this.root = this.scope = createScope(program, undefined)
		for (const statement of program.body) this.visit(statement, program)
		this.close()
		for (const reference of this.references) {
			if (reference.binding && reference.isWrite)
				reference.binding.writes.push(reference.id)
		}
		if (
			!program.body.some(statement => statement.type in moduleSyntaxKinds) &&
			this.root.unresolved.some(({ id }) => id.name in commonJsGlobals)
		) {
			this.isCommonJs = true
			this.readCommonJs(program)
		}
		for (const name in this.exportsByName) {
			const entry = this.exportsByName[name]
			if (entry.kind === "binding") entry.binding.exportNames.push(name)
		}
	}

	// what tsc writes for a module's exports where it emits CommonJS, read as
	// the declarations they were: `exports.a = value`, `__exportStar(
	// require("./a"), exports)`, `exports.a = __importStar(require("./a"))` and
	// the getter `Object.defineProperty(exports, "a", ...)` defines for `export
	// { a } from "./a"`. A name set any other way, or twice, is left unread
	private readCommonJs(program: Program): void {
		const unread = new Set<string>()
		const set = (name: string, entry: ExportEntry | undefined) => {
			if (!entry || name in this.exportsByName) unread.add(name)
			this.exportsByName[name] = entry!
		}
		for (const statement of program.body) {
			if (statement.type !== "ExpressionStatement") continue
			const { expression } = statement
			if (expression.type === "AssignmentExpression") {
				const names: string[] = []
				let value: Node = expression
				while (value.type === "AssignmentExpression") {
					const name = commonJsExportOf(value.left)
					if (name === undefined || value.operator !== "=") break
					names.push(name)
					value = value.right
				}
				// `exports.a = void 0`, which tsc writes ahead of each export
				if (value.type === "UnaryExpression" && value.operator === "void")
					continue
				const binding =
					value.type === "Identifier" ?
						this.root.bindings[value.name]
					:	undefined
				const specifier = requiredBy(value, "__importStar")
				for (const name of names) {
					set(
						name,
						value.type === "AssignmentExpression" ? undefined
						: specifier !== undefined ? { kind: "namespace", specifier }
						: binding ? { kind: "binding", binding }
						: { kind: "expression", node: value }
					)
				}
			} else if (expression.type === "CallExpression") {
				const [first, second, third] = expression.arguments
				if (
					expression.callee.type === "Identifier" &&
					expression.callee.name === "__exportStar"
				) {
					const specifier = first && requiredBy(first)
					if (specifier !== undefined) this.starExports.push(specifier)
				} else if (
					isCommonJsExports(first) &&
					second?.type === "Literal" &&
					typeof second.value === "string" &&
					second.value !== "__esModule"
				)
					set(second.value, this.reexportDefinedBy(third))
			}
		}
		for (const name of unread) delete this.exportsByName[name]
	}

	// e.g. `{ enumerable: true, get: function () { return a_1.a; } }`, where
	// `a_1` is `require("./a")`
	private reexportDefinedBy(
		descriptor: Node | undefined
	): ExportEntry | undefined {
		if (descriptor?.type !== "ObjectExpression") return
		const getter = descriptor.properties.find(
			property =>
				property.type === "Property" && propertyKeyOf(property) === "get"
		)
		const fn = getter?.type === "Property" ? getter.value : undefined
		const [statement, ...rest] =
			fn?.type === "FunctionExpression" && fn.body ? fn.body.body : []
		const returned =
			statement?.type === "ReturnStatement" && !rest.length ?
				statement.argument
			:	undefined
		if (
			returned?.type !== "MemberExpression" ||
			returned.computed ||
			returned.object.type !== "Identifier"
		)
			return
		const binding = this.root.bindings[returned.object.name]
		const init =
			(
				binding?.declaration.type === "VariableDeclarator" &&
				!binding.writes.length
			) ?
				binding.declaration.init
			:	undefined
		const specifier = init ? requiredBy(init, "__importStar") : undefined
		return specifier === undefined ? undefined : (
				{ kind: "reexport", specifier, name: returned.property.name }
			)
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

export const unwrapExpression = (node: Node): Node => {
	while (isTransparent(node)) node = node.expression
	return node
}

// a TypeScript enum as a transpiler writes it, Vite's, esbuild's, SWC's and
// Babel's alike:
//
// let Color = function (Color) {
// 	Color["Red"] = "red"
// 	Color[Color["One"] = 1] = "One"
// 	return Color
// }({})
//
// each member, by name, with its value, a number mapped back to its name, and,
// where the argument is `Color || {}`, the binding it reads. Any other call
// is undefined
export const transpiledEnumOf = (
	call: Node
):
	| {
			param: string
			members: [name: string, value: Node, isNumber: boolean][]
			seed: Node | undefined
	  }
	| undefined => {
	if (call.type !== "CallExpression" || call.arguments.length !== 1) return
	const fn = unwrapExpression(call.callee)
	if (
		(fn.type !== "FunctionExpression" &&
			fn.type !== "ArrowFunctionExpression") ||
		fn.async ||
		fn.generator ||
		fn.params.length !== 1 ||
		fn.params[0].type !== "Identifier" ||
		fn.body?.type !== "BlockStatement"
	)
		return
	const param = fn.params[0].name
	const isParam = (node: Node | null | undefined) =>
		!!node && node.type === "Identifier" && node.name === param
	const isEmpty = (node: Node) =>
		node.type === "ObjectExpression" && !node.properties.length
	const statements = fn.body.body
	const last = statements[statements.length - 1]
	if (last?.type !== "ReturnStatement" || !isParam(last.argument)) return
	const arg = unwrapExpression(call.arguments[0])
	let seed: Node | undefined
	if (!isEmpty(arg)) {
		if (
			arg.type !== "LogicalExpression" ||
			arg.operator !== "||" ||
			arg.left.type !== "Identifier" ||
			!isEmpty(unwrapExpression(arg.right))
		)
			return
		seed = arg.left
	}
	// each member: `E["A"] = value`, or `E[E["A"] = value] = "A"` for a
	// number
	const members: [name: string, value: Node, isNumber: boolean][] = []
	for (const statement of statements.slice(0, -1)) {
		if (
			statement.type !== "ExpressionStatement" ||
			statement.expression.type !== "AssignmentExpression" ||
			statement.expression.operator !== "="
		)
			return
		const { left, right } = statement.expression
		if (
			left.type !== "MemberExpression" ||
			!left.computed ||
			!isParam(left.object)
		)
			return
		const key = unwrapExpression(left.property)
		if (key.type === "Literal" && typeof key.value === "string") {
			members.push([key.value, right, false])
			continue
		}
		if (key.type !== "AssignmentExpression" || key.operator !== "=") return
		const named = unwrapExpression(key.left)
		if (
			named.type !== "MemberExpression" ||
			!named.computed ||
			!isParam(named.object)
		)
			return
		const nameKey = unwrapExpression(named.property)
		if (
			nameKey.type !== "Literal" ||
			typeof nameKey.value !== "string" ||
			right.type !== "Literal" ||
			right.value !== nameKey.value
		)
			return
		members.push([nameKey.value, key.right, true])
	}
	return members.length ? { param, members, seed } : undefined
}

// `Color` in `let Color = function (Color) { … }(Color || {})`, which reads
// the binding the enum initializes, undefined there where nothing else
// declares or writes it, so passing it writes nothing it holds
export const isOwnEnumSeed = (seed: Node, scopes: ModuleScopes): boolean => {
	const or = seed.parent
	const call = or?.parent
	const declarator = call?.parent
	if (
		or?.type !== "LogicalExpression" ||
		or.left !== seed ||
		call?.type !== "CallExpression" ||
		transpiledEnumOf(call)?.seed !== seed ||
		declarator?.type !== "VariableDeclarator" ||
		declarator.init !== call ||
		declarator.id.type !== "Identifier" ||
		seed.type !== "Identifier" ||
		declarator.id.name !== seed.name
	)
		return false
	const binding = scopes.bindingsById.get(declarator.id)
	return !!binding && !binding.writes.length
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

const moduleSyntaxKinds = {
	ImportDeclaration: 1,
	ExportNamedDeclaration: 1,
	ExportDefaultDeclaration: 1,
	ExportAllDeclaration: 1,
	TSExportAssignment: 1
} as const satisfies KeySet

const commonJsGlobals = {
	exports: 1,
	module: 1,
	require: 1
} as const satisfies KeySet

const isCommonJsExports = (node: Node | undefined): boolean =>
	node?.type === "Identifier" ? node.name === "exports"
	: node?.type === "MemberExpression" ?
		!node.computed &&
		node.object.type === "Identifier" &&
		node.object.name === "module" &&
		node.property.name === "exports"
	:	false

// e.g. `a` for `exports.a` or `module.exports.a`
const commonJsExportOf = (node: Node): string | undefined =>
	(
		node.type === "MemberExpression" &&
		!node.computed &&
		isCommonJsExports(node.object)
	) ?
		node.property.name
	:	undefined

// e.g. `./a` for `require("./a")`, or for `wrapper(require("./a"))`
const requiredBy = (node: Node, wrapper?: string): string | undefined => {
	if (node.type !== "CallExpression" || node.callee.type !== "Identifier")
		return
	const [argument] = node.arguments
	if (!argument || node.arguments.length !== 1) return
	if (node.callee.name === wrapper) return requiredBy(argument)
	return (
			node.callee.name === "require" &&
				argument.type === "Literal" &&
				typeof argument.value === "string"
		) ?
			argument.value
		:	undefined
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

// an object literal property's key, where it's a name
export const propertyKeyOf = (property: {
	key: Node
	computed: boolean
}): string | undefined =>
	property.key.type === "Literal" ?
		(
			typeof property.key.value === "string" ||
			typeof property.key.value === "number"
		) ?
			String(property.key.value)
		:	undefined
	: property.computed || property.key.type !== "Identifier" ? undefined
	: property.key.name

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
