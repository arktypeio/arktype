/* eslint-disable @typescript-eslint/no-restricted-imports -- the docs aren't a
   package with entrypoints, so tests import their modules directly */
import { attest, contextualize } from "@ark/attest"
import type { ResultRow } from "../leaderboard.ts"
import {
	placeAmong,
	sharedRows,
	standingsOver,
	widestShared
} from "../units.ts"

const row = (id: string, results: Record<string, number>): ResultRow => ({
	id,
	results
})

/** each standing as "place library mean", the mean to three figures */
const printed = (rows: ResultRow[]) =>
	standingsOver(rows).map(
		s => `${s.place} ${s.library} ${s.value.toPrecision(3)}`
	)

const ids = (rows: ResultRow[]) => rows.map(row => row.id)

contextualize(() => {
	it("ranks by the geometric mean, which one slow row doesn't decide", () => {
		// by the arithmetic mean steady (20) would beat spiky (50.5)
		attest(
			printed([
				row("fast", { spiky: 1, steady: 20 }),
				row("slow", { spiky: 100, steady: 20 })
			])
		).equals(["1 spiky 10.0", "2 steady 20.0"])
	})

	it("doesn't rank a library missing from a row", () => {
		// partial's mean would be over the one row it is quickest on
		attest(
			printed([row("a", { whole: 4, partial: 1 }), row("b", { whole: 9 })])
		).equals(["1 whole 6.00"])
	})

	it("gives equal results one place and the next the place after both", () => {
		attest([1, 1, 2, 3].map(value => placeAmong([1, 1, 2, 3], value))).equals([
			1, 1, 3, 4
		])
	})

	it("keeps only the rows every library ran", () => {
		const rows = [
			row("a", { whole: 4, partial: 1 }),
			row("b", { whole: 9 }),
			row("c", { whole: 1, partial: 4 })
		]
		attest(ids(sharedRows(rows))).equals(["a", "c"])
		// over them both are ranked, where over all three only one was
		attest(printed(sharedRows(rows))).equals(["1 whole 2.00", "1 partial 2.00"])
	})

	const pooled = [
		row("a", { ours: 1, zod: 9, x: 2, y: 3 }),
		row("b", { ours: 1, zod: 9, x: 2, y: 3 }),
		row("c", { ours: 1, zod: 9, x: 2 }),
		row("d", { ours: 1, zod: 9, z: 4 }),
		row("e", { ours: 1, x: 2, y: 3 })
	]

	it("averages the most rows the required libraries and enough others share", () => {
		// x alone shares three with ours and zod; x and y together, two
		attest(
			ids(widestShared(pooled, ["ours", "zod"], ["x", "y", "z"], 1))
		).equals(["a", "b", "c"])
		attest(
			ids(widestShared(pooled, ["ours", "zod"], ["x", "y", "z"], 2))
		).equals(["a", "b"])
	})

	it("never counts a row a required library didn't run", () => {
		// e has x and y on it, and no zod
		attest(ids(widestShared(pooled, ["ours", "zod"], ["x", "y"], 2))).equals([
			"a",
			"b"
		])
	})

	it("prefers, of two sets as large, the one more libraries ran in full", () => {
		const rows = [
			row("a", { ours: 1, zod: 9, x: 2 }),
			row("b", { ours: 1, zod: 9, y: 3, w: 5 })
		]
		// x's row and y's are one each; y's has a fourth library on it
		attest(ids(widestShared(rows, ["ours", "zod"], ["x", "y"], 1))).equals([
			"b"
		])
	})

	it("has nothing to average where too few libraries share a row", () => {
		attest(widestShared(pooled, ["ours", "zod"], ["x", "y", "z"], 3)).equals([])
		attest(standingsOver([])).equals([])
	})
})
