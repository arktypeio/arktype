import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
import { submodule } from "../utils.ts"

declare namespace string {
	namespace preformatted {
		export type normalize = normalize.NFC

		export namespace normalize {
			export type NFC = constrain<string, Branded<"preformatted.normalize.NFC">>
			export type NFD = constrain<string, Branded<"preformatted.normalize.NFD">>
			export type NFKC = constrain<
				string,
				Branded<"preformatted.normalize.NFKC">
			>
			export type NFKD = constrain<
				string,
				Branded<"preformatted.normalize.NFKD">
			>
		}
	}
}

export type NormalizedForm = "NFC" | "NFD" | "NFKC" | "NFKD"

const preformattedNormalizeNode = (form: NormalizedForm) =>
	rootNode({
		domain: "string",
		predicate: (s: string) => s.normalize(form) === s,
		meta: `${form}-normalized unicode`
	})

export const preformattedNormalize = submodule({
	$root: "NFC",
	NFC: preformattedNormalizeNode("NFC"),
	NFD: preformattedNormalizeNode("NFD"),
	NFKC: preformattedNormalizeNode("NFKC"),
	NFKD: preformattedNormalizeNode("NFKD")
})

export type preformattedNormalize = Submodule<{
	$root: string.preformatted.normalize
	NFC: string.preformatted.normalize.NFC
	NFD: string.preformatted.normalize.NFD
	NFKC: string.preformatted.normalize.NFKC
	NFKD: string.preformatted.normalize.NFKD
}>

const normalizeNode = (form: NormalizedForm) =>
	rootNode({
		in: "string",
		morphs: (s: string) => s.normalize(form)
	})

export const normalize = submodule({
	$root: "NFC",
	NFC: normalizeNode("NFC"),
	NFD: normalizeNode("NFD"),
	NFKC: normalizeNode("NFKC"),
	NFKD: normalizeNode("NFKD")
})

export type normalize = Submodule<{
	$root: (In: string) => Out<string.preformatted.normalize>
	NFC: (In: string) => Out<string.preformatted.normalize.NFC>
	NFD: (In: string) => Out<string.preformatted.normalize.NFD>
	NFKC: (In: string) => Out<string.preformatted.normalize.NFKC>
	NFKD: (In: string) => Out<string.preformatted.normalize.NFKD>
}>
