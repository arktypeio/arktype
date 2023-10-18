/* eslint-disable @typescript-eslint/no-restricted-imports */
import type { TypeNode } from "./ark/schema/main.js"
import { node } from "./ark/schema/main.js"

const compileType = (node: TypeNode) => {
	switch (node.kind) {
		case "union":
			return "throw Error('unsupported')"
		case "morph":
			return "throw Error('unsupported')"
		case "intersection":
			return node.description
	}
}

const n = node({
	domain: "string",
	pattern: {
		rule: ".*",
		description: "very special"
	}
})

n //?

const result = compileType(n) //?
