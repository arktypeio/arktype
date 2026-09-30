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

// V8 keeps the source of each new Function in its compilation cache until
// memory runs short, which only a last-resort gc simulates
const heapAfterLastResortGc = () => {
	heapAfterGc()
	globalThis.gc({ type: "major", execution: "sync", flavor: "last-resort" })
	return process.memoryUsage().heapUsed
}

// a WeakRef's target is kept until the job that created or read it ends, and
// a FinalizationRegistry calls back only between jobs
const nextJob = () => new Promise(resolve => setTimeout(resolve, 0))

const heapBefore = heapAfterGc()
const idsBefore = registeredIds()
await nextJob()
const heapBeforeLastResort = heapAfterLastResortGc()

for (let i = 0; i < count; i++) type(objectDefinition(`m${i}`))

const heapAfter = heapAfterGc()
const idsAfter = registeredIds()
await nextJob()
heapAfterGc()
await nextJob()
const heapAfterLastResort = heapAfterLastResortGc()

report({
	"registered ids before": idsBefore,
	"registered ids after": idsAfter,
	"heap before (MB)": heapBefore / 2 ** 20,
	"heap after (MB)": heapAfter / 2 ** 20,
	"retained (KB/type)": (heapAfter - heapBefore) / 1024 / count,
	"retained after last-resort gc (KB/type)":
		(heapAfterLastResort - heapBeforeLastResort) / 1024 / count
})
