// memory: what creating and discarding 5,000 distinct types leaves behind.
// Run with --expose-gc.

import {
	importArktype,
	objectDefinition,
	options,
	registeredIds,
	report
} from "./child.js"

const count = 5000
const { type } = await importArktype(options.root)

const heapAfterGc = () => {
	globalThis.gc()
	globalThis.gc()
	return process.memoryUsage().heapUsed
}

const heapBefore = heapAfterGc()
const idsBefore = registeredIds()

for (let i = 0; i < count; i++) type(objectDefinition(`m${i}`))

const heapAfter = heapAfterGc()

report({
	"registered ids before": idsBefore,
	"registered ids after": registeredIds(),
	"heap before (MB)": heapBefore / 2 ** 20,
	"heap after (MB)": heapAfter / 2 ** 20,
	"retained (KB/type)": (heapAfter - heapBefore) / 1024 / count
})
