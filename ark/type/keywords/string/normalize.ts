import { rootSchema } from "@ark/schema"
import { flatMorph } from "@ark/util"
import type { Module, Submodule } from "../../module.ts"
import type { of, Predicate, To } from "../inference.ts"
import { arkModule } from "../utils.ts"

declare namespace string {
	export type normalized = normalized.NFC

	export namespace normalized {
		export type NFC = of<string, Predicate<"normalized.NFC">>
		export type NFD = of<string, Predicate<"normalized.NFD">>
		export type NFKC = of<string, Predicate<"normalized.NFKC">>
		export type NFKD = of<string, Predicate<"normalized.NFKD">>
	}
}

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
		root: (In: string) => To<string.normalized.NFC>
		NFC: NFC.submodule
		NFD: NFD.submodule
		NFKC: NFKC.submodule
		NFKD: NFKD.submodule
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
