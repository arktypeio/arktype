import type { Node } from "oxc-parser"
import type { SourceModule } from "./module.ts"
import { unwrapExpression } from "./scope.ts"

// A function a unit holds as text reads what it imported from where its module
// did, so those modules load as soon as any unit reading it does: earlier than
// the module that wrote the function may have loaded them. That's only the
// same program if loading them runs nothing: each statement declares a
// function, or a value its own text fixes.

// classes whose construction from fixed values runs nothing a program can see
const inertClasses = new Set(["Set", "Map", "RegExp"])

const inertGlobals = new Set(["undefined", "NaN", "Infinity"])

/**
 * each module a module imports or exports a value from, if loading it runs
 * only declarations of functions and of values its own text fixes; undefined
 * if it may run anything else, as a call would
 */
export const inertImportsOf = (module: SourceModule): string[] | undefined => {
	if (module.parseErrors.length) return
	const imports: string[] = []
	const { scopes } = module
	// a value its text fixes, reading nothing another module declares
	const isInert = (expression: Node | null, before: number): boolean => {
		if (!expression) return true
		const node = unwrapExpression(expression)
		switch (node.type) {
			case "Literal":
			case "ArrowFunctionExpression":
			case "FunctionExpression":
				return true
			case "TemplateLiteral":
				return node.expressions.length === 0
			case "UnaryExpression":
				return (
					node.operator !== "delete" &&
					unwrapExpression(node.argument).type === "Literal"
				)
			case "ArrayExpression":
				return node.elements.every(
					element =>
						element?.type !== "SpreadElement" && isInert(element, before)
				)
			case "ObjectExpression":
				return node.properties.every(
					property =>
						property.type === "Property" &&
						property.kind === "init" &&
						!property.computed &&
						isInert(property.value, before)
				)
			case "NewExpression":
				return (
					node.callee.type === "Identifier" &&
					!scopes.byId.get(node.callee)?.binding &&
					inertClasses.has(node.callee.name) &&
					node.arguments.every(
						argument =>
							argument.type !== "SpreadElement" && isInert(argument, before)
					)
				)
			case "Identifier": {
				const binding = scopes.byId.get(node)?.binding
				if (!binding) return inertGlobals.has(node.name)
				// its own module's, declared by the time it's read
				return (
					binding.scope === scopes.root &&
					(binding.kind === "function" ||
						(binding.kind === "const" && binding.declaration.end <= before))
				)
			}
			default:
				return false
		}
	}
	const declares = (statement: Node): boolean => {
		switch (statement.type) {
			case "ImportDeclaration":
				if (statement.importKind !== "type")
					imports.push(statement.source.value)
				return true
			case "ExportAllDeclaration":
				if (statement.exportKind !== "type")
					imports.push(statement.source.value)
				return true
			case "ExportNamedDeclaration":
				if (statement.exportKind === "type") return true
				if (statement.source) imports.push(statement.source.value)
				return !statement.declaration || declares(statement.declaration)
			case "ExportDefaultDeclaration":
				return (
					statement.declaration.type === "FunctionDeclaration" ||
					isInert(statement.declaration as Node, statement.start)
				)
			case "ExpressionStatement":
				// a directive, like "use client"
				return (
					statement.expression.type === "Literal" &&
					typeof statement.expression.value === "string"
				)
			case "FunctionDeclaration":
			case "TSDeclareFunction":
			case "TSInterfaceDeclaration":
			case "TSTypeAliasDeclaration":
			case "EmptyStatement":
				return true
			case "VariableDeclaration":
				return (
					!!statement.declare ||
					statement.declarations.every(
						declarator =>
							declarator.id.type === "Identifier" &&
							isInert(declarator.init, declarator.start)
					)
				)
			default:
				return false
		}
	}
	return module.program.body.every(declares) ? imports : undefined
}
