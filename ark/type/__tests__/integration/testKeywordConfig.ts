import "./keywordConfig.ts"

import { keywords, type } from "arktype"
import { arkArray } from "arktype/internal/keywords/Array.ts"
import { stringInteger } from "arktype/internal/keywords/string.ts"
import { strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

const isCompiled = (t: type.Any) => t.internal.precompilation !== undefined

// each keyword is compiled as an export of its whole scope compiles it under
// this config
cases({
	configuredRootAliasedByReadonly: () => {
		// Array's own scope resolves readonly to root's configured node
		strictEqual(isCompiled(arkArray.readonly), true)
		strictEqual(isCompiled(arkArray.root), true)
		// ark's copy of readonly is bound after its copy of root
		strictEqual(isCompiled(keywords.Array.root), false)
		strictEqual(isCompiled(type.Array), false)
		strictEqual(isCompiled(keywords.Array.readonly), true)
	},
	rootOfConfiguredParse: () => {
		strictEqual(isCompiled(stringInteger.root), true)
		strictEqual(isCompiled(keywords.string.integer.root), true)
	}
})
