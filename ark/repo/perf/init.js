// init: one cold import of the root's arktype, then what it left behind.

import {
	arktypeUrl,
	options,
	reachable,
	registeredIds,
	report,
	totalLength
} from "./child.js"

const url = arktypeUrl(options.root)
const start = performance.now()
await import(url)
const ms = performance.now() - start

const { nodes, precompilations } = reachable()

report({
	"import (ms)": ms,
	"registered ids": registeredIds(),
	"reachable nodes": nodes,
	precompilations: precompilations.size,
	"precompilation bytes": totalLength(precompilations)
})
