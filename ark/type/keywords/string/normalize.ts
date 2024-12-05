import { rootSchema } from "@ark/schema"
import { flatMorph } from "@ark/util"
import type { To } from "../../attributes.ts"
import type { Module, Submodule } from "../../module.ts"
import { arkModule } from "../utils.ts"

export const normalizedForms = ["NFC", "NFD", "NFKC", "NFKD"] as const

export type NormalizedForm = (typeof normalizedForms)[number]

const preformattedNodes = flatMorph(
	normalizedForms,
	(i, form) =>
		[
			form,
			rootSchema({
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
			rootSchema({
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
		root: (In: string) => To<string>
		NFC: NFC.submodule
		NFD: NFD.submodule
		NFKC: NFKC.submodule
		NFKD: NFKD.submodule
	}

	export namespace NFC {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}

	export namespace NFD {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}

	export namespace NFKC {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}

	export namespace NFKD {
		export type submodule = Submodule<$>

		export type $ = {
			root: (In: string) => To<string>
			preformatted: string
		}
	}
}
