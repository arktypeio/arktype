import { BaseNode, type BaseRoot } from "@ark/schema"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import {
	cloneInput,
	compare,
	flattened,
	layouts,
	observeArktype,
	outDir
} from "./differential.ts"

// every root arktype's suites call, precompiled in each layout, agrees with
// arktype on each input the suites passed it: pnpm testDifferential

const maxInputsPerRoot = 32

const originalsByRoot = new Map<BaseRoot, unknown[]>()
const inputsByRoot = new Map<BaseRoot, unknown[]>()
let isRecording = true

const prototype = BaseNode.prototype as any
const { initRootApply } = prototype
prototype.initRootApply = function (this: BaseRoot) {
	const apply = initRootApply.call(this)
	const recordingApply = (data: unknown, onFail: unknown) => {
		if (isRecording) {
			let originals = originalsByRoot.get(this)
			if (!originals) {
				originalsByRoot.set(this, (originals = []))
				inputsByRoot.set(this, [])
			}
			// a copy as the suite passed it, before the call morphs it
			if (originals.length < maxInputsPerRoot && !originals.includes(data)) {
				originals.push(data)
				inputsByRoot.get(this)!.push(cloneInput(data))
			}
		}
		return apply(data, onFail)
	}
	// cached where arktype caches it, so a root checking its first data
	// uncompiled compiles at its next call
	if (this.c.rootApply === apply) this.c.rootApply = recordingApply
	return recordingApply
}

const run = async () => {
	isRecording = false
	const roots = [...inputsByRoot]
	// every root is observed first, as a build renames the functions they hold
	const observations = roots.map(([node, inputs]) =>
		observeArktype(node, inputs)
	)
	const refusalsByReason: Record<string, number> = {}
	const disagreements: string[] = []
	let precompiledRoots = 0
	let calls = 0
	let harnessLimited = 0
	let introspected = 0
	let unbaked = 0
	let folded = 0
	for (const [i, [node, inputs]] of roots.entries()) {
		const comparison = await compare(node, inputs, observations[i])
		disagreements.push(...comparison.disagreements)
		harnessLimited += comparison.harnessLimited
		if (comparison.isIntrospected) introspected++
		if (comparison.isUnbaked) unbaked++
		if (comparison.isFolded) folded++
		if (comparison.refusal === undefined) {
			precompiledRoots++
			calls += inputs.length
		} else {
			refusalsByReason[comparison.refusal] =
				(refusalsByReason[comparison.refusal] ?? 0) + 1
		}
	}
	console.log(disagreements.slice(0, 20).join("\n\n"))
	console.log(
		`\n${disagreements.length ? "❌" : "✅"} ${precompiledRoots} of ${roots.length} roots precompiled, ${introspected} with their introspection baked (${unbaked} throwing why a schema can't be) and ${folded} folded where a site reads it, ${calls} calls, each in the ${layouts.join(", ")} layouts (${flattened} flattened): ${disagreements.length} disagreeing, ${harnessLimited} beyond the harness`
	)
	if (!disagreements.length) return
	const report = join(await outDir(), "differential.json")
	writeFileSync(
		report,
		JSON.stringify(
			{
				refusalsByReason: Object.fromEntries(
					Object.entries(refusalsByReason).sort((l, r) => r[1] - l[1])
				),
				disagreements
			},
			null,
			2
		)
	)
	throw new Error(
		`${disagreements.length} disagreements with arktype (${report})`
	)
}

export const mochaHooks = {
	async afterAll(this: Mocha.Context): Promise<void> {
		this.timeout(0)
		await run()
	}
}
