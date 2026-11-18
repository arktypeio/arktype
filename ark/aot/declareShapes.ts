import { dirname } from "node:path/posix"
import type * as ts from "typescript"
import type { TypeScript } from "./declare.ts"

// the shapes a build names, as the module being declared reads them
export interface ShapeNames {
	// a reference to a type's shape, which asks for a name where it could have one
	referenceTo: (t: ts.Type) => string | undefined
	// a Type, Scope or Module through its shapes
	printHeld: (t: ts.Type, key: string) => string | undefined
	// the undefined an optional key or element's declaration leaves out
	isMissing: (t: ts.Type) => boolean
}

// a type as TypeScript declared it for a module's top-level declaration
export interface Declared {
	node: ts.TypeNode
	type: ts.Type
	key: string
	source: ts.SourceFile
}

type SignatureNode =
	| ts.FunctionTypeNode
	| ts.MethodSignature
	| ts.CallSignatureDeclaration

type ReferenceNode = ts.TypeReferenceNode | ts.ImportTypeNode

// internal to TypeScript, which declares a union by it where it's set
type WrittenUnion = ts.Type & { origin?: ts.Type }

// Finds where a type TypeScript declared writes out a shape the build names,
// like tRPC's `input` for a Type its procedure takes. TypeScript's nodes don't
// say which type each declares, so the type is walked beside them: a
// reference's arguments by the symbol it names, a literal's keys by name and
// a union's members by the only type each could declare. A node whose type
// can't be told is left as TypeScript wrote it.
export class ShapeReferences {
	ts: TypeScript
	checker: ts.TypeChecker
	program: ts.Program
	names: ShapeNames
	resolutions: ts.ModuleResolutionCache
	keywordFlags: Record<number, number | undefined>
	modulesBySpecifier = new Map<string, ts.Symbol | undefined>()
	// what replaces each node of the declaration being read
	byNode = new Map<ts.Node, string>()
	source: ts.SourceFile | undefined
	key = ""

	constructor(ts: TypeScript, program: ts.Program, names: ShapeNames) {
		this.ts = ts
		this.checker = program.getTypeChecker()
		this.program = program
		this.names = names
		this.keywordFlags = keywordFlagsOf(ts)
		this.resolutions = ts.createModuleResolutionCache(
			program.getCurrentDirectory(),
			path => (ts.sys.useCaseSensitiveFileNames ? path : path.toLowerCase()),
			program.getCompilerOptions()
		)
	}

	in({ node, type, key, source }: Declared): Map<ts.Node, string> {
		this.byNode = new Map()
		this.source = source
		this.key = key
		this.pair(node, type)
		return this.byNode
	}

	pair(node: ts.TypeNode, t: ts.Type): void {
		const { ts } = this
		if (ts.isParenthesizedTypeNode(node)) return this.pair(node.type, t)
		const isElided = isElidedNode(ts, node)
		// a type written another way, like `typeof User.infer`, stays as written
		if (isElided || (this.isStructure(node) && this.mayDeclare(node, t, 0))) {
			const reference = this.names.referenceTo(t)
			if (reference !== undefined) {
				this.byNode.set(node, reference)
				return
			}
		}
		if (isElided) return
		if (ts.isTypeReferenceNode(node) || ts.isImportTypeNode(node))
			return this.pairReference(node, t)
		if (ts.isArrayTypeNode(node)) {
			if (this.checker.isArrayType(t)) {
				this.pair(
					node.elementType,
					this.checker.getTypeArguments(t as ts.TypeReference)[0]
				)
			}
			return
		}
		if (this.isReadonlyOperator(node)) return this.pair(node.type, t)
		if (ts.isTupleTypeNode(node)) return this.pairTuple(node, t)
		if (ts.isTypeLiteralNode(node)) return this.pairLiteral(node, t)
		if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
			// a union is declared as it was written, before it was flattened
			const written = (t as WrittenUnion).origin ?? t
			if (
				written.isUnionOrIntersection() &&
				written.isUnion() === ts.isUnionTypeNode(node)
			)
				this.pairMembers(node.types, written.types)
			return
		}
		if (ts.isFunctionTypeNode(node)) {
			const signatures =
				t.flags & ts.TypeFlags.Object ? t.getCallSignatures() : []
			if (signatures.length === 1) this.pairSignature(node, signatures[0])
		}
	}

	isReadonlyOperator(node: ts.TypeNode): node is ts.TypeOperatorNode {
		return (
			this.ts.isTypeOperatorNode(node) &&
			node.operator === this.ts.SyntaxKind.ReadonlyKeyword
		)
	}

	// whether a node writes its type out, rather than naming it
	isStructure(node: ts.TypeNode): boolean {
		const { ts } = this
		return (
			ts.isTypeLiteralNode(node) ||
			ts.isArrayTypeNode(node) ||
			ts.isTupleTypeNode(node) ||
			ts.isUnionTypeNode(node) ||
			ts.isIntersectionTypeNode(node) ||
			(this.isReadonlyOperator(node) && this.isStructure(node.type))
		)
	}

	pairReference(node: ReferenceNode, t: ts.Type): void {
		const { ts, checker } = this
		const isReference =
			!!(t.flags & ts.TypeFlags.Object) &&
			!!((t as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference)
		const target = isReference ? (t as ts.TypeReference).target : undefined
		if (!node.typeArguments?.length || (!t.aliasSymbol && !target)) return
		const symbol = this.symbolOf(node)
		if (!symbol) return
		let args: readonly ts.Type[] | undefined
		if (symbol === t.aliasSymbol) args = t.aliasTypeArguments
		else if (target && symbol === target.symbol) {
			const held = this.names.printHeld(t, this.key)
			if (held !== undefined) {
				this.byNode.set(node, held)
				return
			}
			// a class in a generic one is written through both's parameters
			if (!target.outerTypeParameters?.length)
				args = checker.getTypeArguments(t as ts.TypeReference)
		}
		if (!args) return
		for (const [i, arg] of node.typeArguments.entries())
			if (i < args.length) this.pair(arg, args[i])
	}

	// the symbol a reference names from the module being declared
	symbolOf(node: ReferenceNode): ts.Symbol | undefined {
		const { ts, checker } = this
		let symbol: ts.Symbol | undefined
		let names: string[]
		if (ts.isImportTypeNode(node)) {
			const { argument, qualifier, isTypeOf } = node
			if (
				isTypeOf ||
				!qualifier ||
				!ts.isLiteralTypeNode(argument) ||
				!ts.isStringLiteral(argument.literal)
			)
				return
			symbol = this.moduleOf(argument.literal.text)
			names = this.entityNamesOf(qualifier)
		} else {
			const [root, ...rest] = this.entityNamesOf(node.typeName)
			symbol = checker.resolveName(
				root,
				this.source,
				ts.SymbolFlags.Type | ts.SymbolFlags.Namespace,
				false
			)
			names = rest
		}
		for (const name of names) {
			symbol &&= checker.tryGetMemberInModuleExports(
				name,
				this.resolved(symbol)
			)
		}
		return symbol && this.resolved(symbol)
	}

	resolved(symbol: ts.Symbol): ts.Symbol {
		return symbol.flags & this.ts.SymbolFlags.Alias ?
				this.checker.getAliasedSymbol(symbol)
			:	symbol
	}

	entityNamesOf(name: ts.EntityName): string[] {
		return this.ts.isIdentifier(name) ?
				[name.text]
			:	[...this.entityNamesOf(name.left), name.right.text]
	}

	moduleOf(specifier: string): ts.Symbol | undefined {
		const { ts, checker, program } = this
		const source = this.source!
		const key = `${dirname(source.fileName)}\0${specifier}`
		if (this.modulesBySpecifier.has(key))
			return this.modulesBySpecifier.get(key)
		const ambient = checker
			.getAmbientModules()
			.find(module => module.name === `"${specifier}"`)
		const resolved =
			ambient ? undefined : (
				ts.resolveModuleName(
					specifier,
					source.fileName,
					program.getCompilerOptions(),
					ts.sys,
					this.resolutions,
					undefined,
					source.impliedNodeFormat
				).resolvedModule
			)
		const file = resolved && program.getSourceFile(resolved.resolvedFileName)
		const symbol = ambient ?? (file && checker.getSymbolAtLocation(file))
		this.modulesBySpecifier.set(key, symbol)
		return symbol
	}

	pairTuple(node: ts.TupleTypeNode, t: ts.Type): void {
		const { ts, checker } = this
		if (!checker.isTupleType(t)) return
		const { elementFlags } = (t as ts.TupleTypeReference).target
		const types = checker.getTypeArguments(t as ts.TypeReference)
		if (node.elements.length !== elementFlags.length) return
		for (const [i, element] of node.elements.entries()) {
			const isNamed = ts.isNamedTupleMember(element)
			let inner: ts.TypeNode = isNamed ? element.type : element
			const isOptional =
				isNamed ? !!element.questionToken : ts.isOptionalTypeNode(inner)
			const isRest =
				isNamed ? !!element.dotDotDotToken : ts.isRestTypeNode(inner)
			if (ts.isOptionalTypeNode(inner) || ts.isRestTypeNode(inner))
				inner = inner.type
			const flags = elementFlags[i]
			if (
				isOptional !== !!(flags & ts.ElementFlags.Optional) ||
				isRest !== !!(flags & ts.ElementFlags.Variable)
			)
				continue
			// a rest element is declared as an array of its type
			if (flags & ts.ElementFlags.Rest) {
				while (ts.isParenthesizedTypeNode(inner)) inner = inner.type
				if (!ts.isArrayTypeNode(inner)) continue
				inner = inner.elementType
			}
			if (isOptional) this.pairOptional(inner, types[i])
			else this.pair(inner, types[i])
		}
	}

	// an optional key, element or parameter's type holds an undefined its
	// declaration may leave out, as exactOptionalPropertyTypes' always is
	pairOptional(node: ts.TypeNode, t: ts.Type): void {
		const { ts } = this
		let written = node
		while (ts.isParenthesizedTypeNode(written)) written = written.type
		const members = ts.isUnionTypeNode(written) ? written.types : undefined
		const isUndefinedWritten = !!members?.some(
			member => member.kind === ts.SyntaxKind.UndefinedKeyword
		)
		const isLeftOut = (member: ts.Type) =>
			isUndefinedWritten ?
				this.names.isMissing(member)
			:	!!(member.flags & ts.TypeFlags.Undefined)
		if (!t.isUnion() || !t.types.some(isLeftOut)) return this.pair(node, t)
		const present = t.types.filter(member => !isLeftOut(member))
		if (present.length === 1) this.pair(node, present[0])
		else if (members) this.pairMembers(members, present)
	}

	pairLiteral(node: ts.TypeLiteralNode, t: ts.Type): void {
		const { ts, checker } = this
		if (!(t.flags & ts.TypeFlags.Object)) return
		const indexSignatures = node.members.filter(ts.isIndexSignatureDeclaration)
		const indexInfos = checker.getIndexInfosOfType(t)
		if (indexSignatures.length === 1 && indexInfos.length === 1)
			this.pair(indexSignatures[0].type, indexInfos[0].type)
		const callSignatures = node.members.filter(ts.isCallSignatureDeclaration)
		const signatures = t.getCallSignatures()
		if (callSignatures.length === 1 && signatures.length === 1)
			this.pairSignature(callSignatures[0], signatures[0])
		for (const member of node.members) {
			if (!ts.isPropertySignature(member) && !ts.isMethodSignature(member))
				continue
			const name = memberNameOf(ts, member)
			const property =
				name === undefined ? undefined : checker.getPropertyOfType(t, name)
			if (
				!property ||
				!!member.questionToken !== !!(property.flags & ts.SymbolFlags.Optional)
			)
				continue
			const type = checker.getTypeOfSymbol(property)
			if (ts.isMethodSignature(member)) {
				// an overload is declared as a method of its own
				const overloads = node.members.filter(
					other =>
						ts.isMethodSignature(other) && memberNameOf(ts, other) === name
				)
				const methods =
					type.flags & ts.TypeFlags.Object ? type.getCallSignatures() : []
				if (overloads.length === 1 && methods.length === 1)
					this.pairSignature(member, methods[0])
			} else if (!member.type) continue
			else if (member.questionToken) this.pairOptional(member.type, type)
			else this.pair(member.type, type)
		}
	}

	pairSignature(node: SignatureNode, signature: ts.Signature): void {
		const { ts, checker } = this
		// TypeScript declares a tuple of rest parameters as a parameter each
		if (
			node.typeParameters ||
			signature.typeParameters ||
			node.parameters.length !== signature.parameters.length
		)
			return
		const isPaired = node.parameters.every((parameter, i) => {
			const declaration = signature.parameters[i].valueDeclaration
			return (
				ts.isIdentifier(parameter.name) &&
				parameter.name.text === signature.parameters[i].name &&
				!!declaration &&
				ts.isParameter(declaration) &&
				!!declaration.dotDotDotToken === !!parameter.dotDotDotToken
			)
		})
		if (!isPaired) return
		for (const [i, parameter] of node.parameters.entries()) {
			if (!parameter.type) continue
			const type = checker.getTypeOfSymbol(signature.parameters[i])
			if (parameter.questionToken) this.pairOptional(parameter.type, type)
			else this.pair(parameter.type, type)
		}
		if (node.type)
			this.pair(node.type, checker.getReturnTypeOfSignature(signature))
	}

	// a member is paired with the only type it could declare
	pairMembers(nodes: readonly ts.TypeNode[], types: readonly ts.Type[]): void {
		const { ts } = this
		for (const node of nodes) {
			let inner = node
			while (ts.isParenthesizedTypeNode(inner)) inner = inner.type
			const candidates =
				isElidedNode(ts, inner) ?
					// TypeScript elides only an object it's already declaring
					types.filter(t => t.flags & ts.TypeFlags.Object)
				: ts.isTypeReferenceNode(inner) || ts.isImportTypeNode(inner) ?
					this.referencedBy(inner, types)
				: this.isStructure(inner) || ts.isFunctionTypeNode(inner) ?
					types.filter(t => this.mayDeclare(inner, t, 0))
				:	[]
			if (candidates.length === 1) this.pair(inner, candidates[0])
		}
	}

	referencedBy(node: ReferenceNode, types: readonly ts.Type[]): ts.Type[] {
		if (!node.typeArguments?.length) return []
		const symbol = this.symbolOf(node)
		if (!symbol) return []
		return types.filter(
			t =>
				t.aliasSymbol === symbol ||
				(!!(t.flags & this.ts.TypeFlags.Object) &&
					!!(
						(t as ts.ObjectType).objectFlags & this.ts.ObjectFlags.Reference
					) &&
					(t as ts.TypeReference).target.symbol === symbol)
		)
	}

	// whether a node could declare a type, as far as what it writes out tells.
	// A name could be any type's, so only a mismatch it writes is one
	mayDeclare(node: ts.TypeNode, t: ts.Type, depth: number): boolean {
		const { ts, checker } = this
		const { TypeFlags, SyntaxKind } = ts
		if (depth > maxComparedDepth || isElidedNode(ts, node)) return true
		if (ts.isParenthesizedTypeNode(node))
			return this.mayDeclare(node.type, t, depth)
		if (ts.isTypeLiteralNode(node)) {
			if (!(t.flags & TypeFlags.Object)) return false
			const names = new Set<string>()
			for (const member of node.members) {
				if (!ts.isPropertySignature(member) && !ts.isMethodSignature(member))
					continue
				const name = memberNameOf(ts, member)
				// a computed key's name isn't written
				if (name === undefined) return true
				const property = checker.getPropertyOfType(t, name)
				if (
					!property ||
					!!member.questionToken !==
						!!(property.flags & ts.SymbolFlags.Optional)
				)
					return false
				names.add(name)
				if (
					ts.isPropertySignature(member) &&
					member.type &&
					!member.questionToken &&
					!this.mayDeclare(
						member.type,
						checker.getTypeOfSymbol(property),
						depth + 1
					)
				)
					return false
			}
			return names.size === checker.getPropertiesOfType(t).length
		}
		if (ts.isArrayTypeNode(node)) {
			return (
				checker.isArrayType(t) &&
				this.mayDeclare(
					node.elementType,
					checker.getTypeArguments(t as ts.TypeReference)[0],
					depth + 1
				)
			)
		}
		if (ts.isTupleTypeNode(node)) {
			return (
				checker.isTupleType(t) &&
				(t as ts.TupleTypeReference).target.elementFlags.length ===
					node.elements.length
			)
		}
		if (ts.isFunctionTypeNode(node))
			return !!(t.flags & TypeFlags.Object) && t.getCallSignatures().length > 0

		if (ts.isLiteralTypeNode(node)) {
			const { literal } = node
			if (ts.isStringLiteral(literal))
				return t.isStringLiteral() && t.value === literal.text
			if (ts.isNumericLiteral(literal))
				return t.isNumberLiteral() && t.value === Number(literal.text)
			if (literal.kind === SyntaxKind.NullKeyword)
				return !!(t.flags & TypeFlags.Null)
			if (
				literal.kind === SyntaxKind.TrueKeyword ||
				literal.kind === SyntaxKind.FalseKeyword
			)
				return !!(t.flags & TypeFlags.BooleanLiteral)
			return true
		}
		const keyword = this.keywordFlags[node.kind]
		return keyword === undefined || !!(t.flags & keyword)
	}
}

const maxComparedDepth = 3

const keywordFlagsOf = (
	ts: TypeScript
): Record<number, number | undefined> => ({
	[ts.SyntaxKind.StringKeyword]: ts.TypeFlags.String,
	[ts.SyntaxKind.NumberKeyword]: ts.TypeFlags.Number,
	[ts.SyntaxKind.BooleanKeyword]: ts.TypeFlags.Boolean,
	[ts.SyntaxKind.BigIntKeyword]: ts.TypeFlags.BigInt,
	[ts.SyntaxKind.SymbolKeyword]: ts.TypeFlags.ESSymbol,
	[ts.SyntaxKind.UndefinedKeyword]: ts.TypeFlags.Undefined,
	[ts.SyntaxKind.VoidKeyword]: ts.TypeFlags.Void,
	[ts.SyntaxKind.NeverKeyword]: ts.TypeFlags.Never,
	[ts.SyntaxKind.UnknownKeyword]: ts.TypeFlags.Unknown,
	[ts.SyntaxKind.ObjectKeyword]: ts.TypeFlags.NonPrimitive,
	[ts.SyntaxKind.AnyKeyword]: ts.TypeFlags.Any
})

const memberNameOf = (
	ts: TypeScript,
	member: ts.PropertySignature | ts.MethodSignature
): string | undefined =>
	(
		ts.isIdentifier(member.name) ||
		ts.isStringLiteral(member.name) ||
		ts.isNumericLiteral(member.name)
	) ?
		member.name.text
	:	undefined

// the `any` TypeScript writes where a type it's declaring recurs
export const isElidedNode = (ts: TypeScript, node: ts.Node): boolean =>
	node.kind === ts.SyntaxKind.AnyKeyword &&
	!!ts
		.getSyntheticLeadingComments(node)
		?.some(comment => comment.text === "elided")
