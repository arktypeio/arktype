import { rootNode } from "@ark/schema"
import { flatMorph } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { type } from "../ark.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { arkModule } from "../utils.ts"

declare namespace string {
	export type normalized = normalized.NFC

	export namespace normalized {
		export type NFC = constrain<string, Branded<"normalized.NFC">>
		export type NFD = constrain<string, Branded<"normalized.NFD">>
		export type NFKC = constrain<string, Branded<"normalized.NFKC">>
		export type NFKD = constrain<string, Branded<"normalized.NFKD">>
	}
}

export const normalizedForms = ["NFC", "NFD", "NFKC", "NFKD"] as const

export type NormalizedForm = (typeof normalizedForms)[number]

const preformattedNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			rootNode({
				domain: "string",
				predicate: (s: string) => s.normalize(form) === s,
				meta: `${form}-normalized unicode`
			})
		] as const
)

const normalizeNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			rootNode({
				in: "string",
				morphs: (s: string) => s.normalize(form),
				declaredOut: preformattedNodes[form]
			})
		] as const
)

export const NFC = arkModule({
	root: normalizeNodes.NFC,
	preformatted: preformattedNodes.NFC
})

export const NFD = arkModule({
	root: normalizeNodes.NFD,
	preformatted: preformattedNodes.NFD
})

export const NFKC = arkModule({
	root: normalizeNodes.NFKC,
	preformatted: preformattedNodes.NFKC
})

export const NFKD = arkModule({
	root: normalizeNodes.NFKD,
	preformatted: preformattedNodes.NFKD
})

export const normalize = arkModule({
	root: "NFC",
	NFC,
	NFD,
	NFKC,
	NFKD
})

export declare namespace normalize {
	export type module = Module<submodule>

	export type submodule = Submodule<$>

	export type $ = {
		root: (In: string) => To<string.normalized.NFC>
		NFC: NFC.submodule
		NFD: NFD.submodule
		NFKC: NFKC.submodule
		NFKD: NFKD.submodule
	}

	type shallowResolutions = {
		[k in keyof $ as `string.normalize.${k}`]: $[k] extends type.cast<infer t> ?
			t
		:	$[k]
	}

	export namespace NFC {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string.normalized.NFC>
			preformatted: string.normalized.NFC
		}
	}

	export namespace NFD {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string.normalized.NFD>
			preformatted: string.normalized.NFD
		}
	}

	export namespace NFKC {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string.normalized.NFKC>
			preformatted: string.normalized.NFKC
		}
	}

	export namespace NFKD {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string.normalized.NFKD>
			preformatted: string.normalized.NFKD
		}
	}
}
