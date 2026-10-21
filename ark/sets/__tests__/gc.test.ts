import { attest, contextualize } from "@ark/attest"
import type { BaseRoot } from "@ark/schema"
import { parse } from "arksets"
import { setFlagsFromString } from "node:v8"
import { runInNewContext } from "node:vm"

setFlagsFromString("--expose-gc")
const gc: () => void = runInNewContext("gc")

const nextJob = () => new Promise(resolve => setTimeout(resolve, 0))

// WeakRef targets live until their job ends, and finalizers run between jobs
const collectTarget = async (ref: WeakRef<object>) => {
	for (let i = 0; i < 10 && ref.deref(); i++) {
		await nextJob()
		gc()
		await nextJob()
	}
}

const predicateOf = (root: BaseRoot) =>
	root.children.find(child => child.kind === "predicate")!.inner
		.predicate as object

contextualize(() => {
	it("collects an opaque keyword's predicate once nothing reads it", async () => {
		const ref = new WeakRef(predicateOf(parse({ not: { const: "collected" } })))
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
	})
})
