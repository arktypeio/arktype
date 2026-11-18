// a global meta type inferred from a scope that imports another scope's
// Types, which checking each Type against ArkEnv.meta made circular (#1644)
import { scope, type } from "arktype"

const base = scope({ BaseMeta: { "description?": "string" } })

export const Meta = scope({
	...base.import(),
	Binary: { "...": "BaseMeta", kind: "'binary'" }
}).export().Binary

declare global {
	interface ArkEnv {
		meta(): typeof Meta.infer
	}
}

export const Configured = type("string").configure({ kind: "binary" })

// @ts-expect-error meta is inferred, not any
export const Misconfigured = type("string").configure({ kind: "unary" })
