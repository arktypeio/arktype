import { hashOf, isDotAccessible } from "@ark/util"
import { holeNameMarker } from "arktype/internal/standalone.ts"
import type { ArrowFunctionExpression, Class, Function, Node } from "oxc-parser"

// reads no files, so the docs playground names a function as a build does

/** the name a function's declaration gives it, or "" where arktype calls it */
export const declaredNameOf = (
	node: Function | ArrowFunctionExpression | Class,
	parent: Node | null | undefined = node.parent
): string | undefined => {
	if (node.id) return node.id.name
	switch (parent?.type) {
		case "VariableDeclarator":
			return parent.init === node && parent.id.type === "Identifier" ?
					parent.id.name
				:	undefined
		case "Property":
			return (
					parent.value === node &&
						parent.kind === "init" &&
						!parent.computed &&
						parent.key.type === "Identifier"
				) ?
					parent.key.name
				:	undefined
		case "ArrayExpression":
		case "ReturnStatement":
			return ""
		case "ArrowFunctionExpression":
			return parent.body === node ? "" : undefined
		case "CallExpression":
		case "NewExpression":
			return parent.callee === node ? undefined : ""
	}
}

// a placeholder led by the declared name, which arktype sorts by
export const holeNameOf = (
	declared: string | undefined,
	path: string,
	start: number
): string =>
	`${
		declared === undefined ? ""
		: isDotAccessible(declared) ? declared
		: "fn"
	}${holeNameMarker}${hashOf(`${path}:${start}`)}`
