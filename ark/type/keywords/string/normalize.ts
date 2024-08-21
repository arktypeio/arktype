import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
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

const normalizeNode = (form: NormalizedForm) =>
	rootNode({
		in: "string",
		morphs: (s: string) => s.normalize(form)
	})

export type NFC = Submodule<{
	$root: (In: string) => Out<string.normalized.NFC>
	NFC: string.normalized.NFC
}>

export const NFC = submodule({
	$root: normalizeNode("NFC"),
	NFC: normalizedNode("NFC")
})

export type NFD = Submodule<{
	$root: (In: string) => Out<string.normalized.NFD>
	NFD: string.normalized.NFD
}>

export const NFD = submodule({
	$root: normalizeNode("NFD"),
	NFD: normalizedNode("NFD")
})

export type NFKC = Submodule<{
	$root: (In: string) => Out<string.normalized.NFKC>
	NFKC: string.normalized.NFKC
}>

export const NFKC = submodule({
	$root: normalizeNode("NFKC"),
	NFKC: normalizedNode("NFKC")
})

export type NFKD = Submodule<{
	$root: (In: string) => Out<string.normalized.NFKD>
	NFKD: string.normalized.NFKD
}>

export const NFKD = submodule({
	$root: normalizeNode("NFKD"),
	NFKD: normalizedNode("NFKD")
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
