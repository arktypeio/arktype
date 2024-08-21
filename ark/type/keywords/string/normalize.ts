import { rootNode } from "@ark/schema"
import { flatMorph } from "@ark/util"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, To } from "../ast.ts"
import { submodule } from "../utils.ts"

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

export type NFC = Submodule<{
	$root: (In: string) => To<string.normalized.NFC>
	preformatted: string.normalized.NFC
}>

export const NFC = submodule({
	$root: normalizeNodes.NFC,
	preformatted: preformattedNodes.NFC
})

export type NFD = Submodule<{
	$root: (In: string) => To<string.normalized.NFD>
	preformatted: string.normalized.NFD
}>

export const NFD = submodule({
	$root: normalizeNodes.NFD,
	preformatted: preformattedNodes.NFD
})

export type NFKC = Submodule<{
	$root: (In: string) => To<string.normalized.NFKC>
	preformatted: string.normalized.NFKC
}>

export const NFKC = submodule({
	$root: normalizeNodes.NFKC,
	preformatted: preformattedNodes.NFKC
})

export type NFKD = Submodule<{
	$root: (In: string) => To<string.normalized.NFKD>
	preformatted: string.normalized.NFKD
}>

export const NFKD = submodule({
	$root: normalizeNodes.NFKD,
	preformatted: preformattedNodes.NFKD
})

export const normalize = submodule({
	$root: "NFC",
	NFC,
	NFD,
	NFKC,
	NFKD
})

export type normalize = Submodule<{
	$root: NFC
	NFC: NFC
	NFD: NFD
	NFKC: NFKC
	NFKD: NFKD
}>
