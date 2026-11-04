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

// where each function is among those of its module declared with its name
export const namedPlacesOf = <fn>(
	functions: readonly fn[],
	startOf: (f: fn) => number,
	declaredOf: (f: fn) => string | undefined
): Map<fn, number> => {
	const counts = new Map<string | undefined, number>()
	const places = new Map<fn, number>()
	for (const f of [...functions].sort((l, r) => startOf(l) - startOf(r))) {
		const declared = declaredOf(f)
		const place = counts.get(declared) ?? 0
		counts.set(declared, place + 1)
		places.set(f, place)
	}
	return places
}

// a placeholder led by the declared name, which arktype sorts by, then what tells
// it from others of that name in its module: where it's among them, which a
// plugin rewriting the module keeps, though not where it starts. A Type's id
// holds this, so what reads it in another module knows it for the same Type
export const holeNameOf = (
	declared: string | undefined,
	path: string,
	place: number
): string =>
	`${
		declared === undefined ? ""
		: isDotAccessible(declared) ? declared
		: "fn"
	}${holeNameMarker}${hashOf(`${path}:${declared}:${place}`)}`
