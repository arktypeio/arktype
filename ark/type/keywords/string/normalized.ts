import { rootNode } from "@ark/schema"
import type { Branded, constrain, Out } from "../../ast.ts"
import type { Submodule } from "../../module.ts"
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

export type NormalizedForm = "NFC" | "NFD" | "NFKC" | "NFKD"

const normalizedNode = (form: NormalizedForm) =>
	rootNode({
		domain: "string",
		predicate: (s: string) => s.normalize(form) === s,
		meta: `${form}-normalized unicode`
	})

export const normalized = submodule({
	$root: "NFC",
	NFC: normalizedNode("NFC"),
	NFD: normalizedNode("NFD"),
	NFKC: normalizedNode("NFKC"),
	NFKD: normalizedNode("NFKD")
})

export type normalized = Submodule<{
	$root: string.normalized
	NFC: string.normalized.NFC
	NFD: string.normalized.NFD
	NFKC: string.normalized.NFKC
	NFKD: string.normalized.NFKD
}>

const toNormalizedNode = (form: NormalizedForm) =>
	rootNode({
		in: "string",
		morphs: (s: string) => s.normalize(form)
	})

export const toNormalized = submodule({
	$root: "NFC",
	NFC: toNormalizedNode("NFC"),
	NFD: toNormalizedNode("NFD"),
	NFKC: toNormalizedNode("NFKC"),
	NFKD: toNormalizedNode("NFKD")
})

export type toNormalized = Submodule<{
	$root: (In: string) => Out<string.normalized>
	NFC: (In: string) => Out<string.normalized.NFC>
	NFD: (In: string) => Out<string.normalized.NFD>
	NFKC: (In: string) => Out<string.normalized.NFKC>
	NFKD: (In: string) => Out<string.normalized.NFKD>
}>
