import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	implementNode,
	type ArkErrorCode,
	type Divisor
} from "@ark/schema"
import { resolvedConfig } from "@ark/schema/runtime"
import { hasDomain } from "@ark/util"

const writerKeys = ["expected", "actual", "problem", "message"] as const

const sourceOf = (writer: unknown) => String(writer).replace(/\s+/g, "")

contextualize(() => {
	it("writes errors as their node kinds do", () => {
		const codes = Object.keys(resolvedConfig).filter(k =>
			hasDomain(resolvedConfig[k as never], "object")
		) as ArkErrorCode[]
		const { defaults } = implementNode<Divisor.Declaration>({
			hasAssociatedError: true,
			defaults: {}
		} as never)
		for (const code of codes) {
			for (const k of writerKeys) {
				const nodeWriter = sourceOf($ark.defaultConfig[code][k])
				const runtimeWriter = sourceOf(resolvedConfig[code]?.[k])
				// node contexts carry their description, which is all the runtime's expected reads
				if (
					nodeWriter === sourceOf(defaults.expected) ||
					(code === "discriminant" && k === "expected")
				)
					attest(runtimeWriter).equals("ctx=>ctx.description")
				// en's names a domain by its noun, which is its description
				else if (code === "discriminant" && k === "actual") {
					attest(runtimeWriter).equals(
						`(data,e)=>e.discriminantKind==="domain"?domainDescriptions[domainOf(data)]:printable(data)`
					)
				} else attest(runtimeWriter).equals(nodeWriter)
			}
		}
	})
})
