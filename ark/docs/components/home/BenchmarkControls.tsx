"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { reducedMotion } from "../reducedMotion.ts"

const sets = [
	{ set: "valid", label: "valid data" },
	{
		set: "invalid",
		label: (
			<>
				<span className="seg-wide">reporting </span>errors · ajv faster
			</>
		)
	}
] as const

type BenchSet = (typeof sets)[number]["set"]

/** restarts the bar animation on a set's grid */
const grow = (grid: HTMLElement | null) => {
	if (!grid || reducedMotion()) return
	delete grid.dataset.grow
	void grid.offsetWidth
	grid.dataset.grow = ""
}

/**
 * The chart's only client code: the valid/invalid radiogroup, the row
 * tooltip (median, IQR and the sign test), arrow keys between rows and, on
 * the homepage, bars that grow once when the chart scrolls into view.
 */
export const BenchmarkControls = ({
	animate = false
}: {
	animate?: boolean | undefined
}) => {
	const ref = useRef<HTMLDivElement>(null)
	const tipRef = useRef<HTMLDivElement>(null)
	const tipId = useId()
	const [current, setCurrent] = useState<BenchSet>("valid")
	const root = () => ref.current?.closest<HTMLElement>("[data-bench]")
	const gridOf = (set: BenchSet) =>
		root()?.querySelector<HTMLElement>(`.b-grid[data-set="${set}"]`) ?? null

	const pick = (set: BenchSet) => {
		setCurrent(set)
		const chart = root()
		if (!chart) return
		for (const grid of chart.querySelectorAll<HTMLElement>(".b-grid"))
			grid.hidden = grid.dataset.set !== set
		const tally = chart.querySelector<HTMLElement>(".b-tally")
		// the tally counts valid data only
		if (tally) tally.hidden = set !== "valid"
		if (animate) grow(gridOf(set))
	}

	const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
		e.preventDefault()
		const i = sets.findIndex(s => s.set === current)
		const next = sets[(i + 1) % sets.length].set
		pick(next)
		ref.current
			?.querySelector<HTMLButtonElement>(`[data-for="${next}"]`)
			?.focus()
	}

	useEffect(() => {
		const chart = ref.current?.closest<HTMLElement>("[data-bench]")
		const tip = tipRef.current
		if (!chart || !tip) return

		/** the row the tip describes, so a screen reader reads it on focus */
		let described: HTMLElement | undefined
		const hide = () => {
			tip.hidden = true
			described?.removeAttribute("aria-describedby")
			described = undefined
		}
		const show = (row: HTMLElement) => {
			if (described !== row) hide()
			described = row
			row.setAttribute("aria-describedby", tipId)
			tip.textContent = row.dataset.tip ?? ""
			tip.hidden = false
			const r = row.getBoundingClientRect()
			const t = tip.getBoundingClientRect()
			tip.style.left = `${Math.min(
				Math.max(12, r.left + r.width / 2 - t.width / 2),
				innerWidth - t.width - 12
			)}px`
			const above = r.top - t.height - 8
			const below = r.bottom + 8
			// a phone-width tip above the row would cover the panel's title
			tip.style.top = `${
				matchMedia("(max-width: 760px)").matches ?
					below + t.height < innerHeight - 8 || above < 80 ?
						below
					:	above
				: above > 80 ? above
				: below
			}px`
		}
		const onTarget = (e: Event) => {
			const row =
				e.target instanceof Element ?
					e.target.closest<HTMLElement>(".b-row[data-tip]")
				:	null
			if (row) show(row)
			else hide()
		}
		const onKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape" && !tip.hidden) hide()
		}
		/** a set's rows are one tab stop; the arrow keys, Home and End move within it */
		const onRowKey = (e: globalThis.KeyboardEvent) => {
			const row =
				(
					e.target instanceof HTMLElement &&
					e.target.matches(".b-row[data-tip]")
				) ?
					e.target
				:	null
			const grid = row?.closest(".b-grid")
			if (!row || !grid) return
			const rows = [...grid.querySelectorAll<HTMLElement>(".b-row[data-tip]")]
			const i = rows.indexOf(row)
			const next =
				e.key === "ArrowDown" || e.key === "ArrowRight" ? rows[i + 1]
				: e.key === "ArrowUp" || e.key === "ArrowLeft" ? rows[i - 1]
				: e.key === "Home" ? rows[0]
				: e.key === "End" ? rows.at(-1)
				: undefined
			if (!next) return
			e.preventDefault()
			row.tabIndex = -1
			next.tabIndex = 0
			next.focus()
		}
		chart.addEventListener("pointerover", onTarget)
		chart.addEventListener("focusin", onTarget)
		chart.addEventListener("pointerleave", hide)
		chart.addEventListener("focusout", hide)
		chart.addEventListener("keydown", onRowKey)
		addEventListener("scroll", hide, { passive: true })
		addEventListener("keydown", onKeyDown)

		let observer: IntersectionObserver | undefined
		const valid = chart.querySelector<HTMLElement>('.b-grid[data-set="valid"]')
		if (
			animate &&
			valid &&
			!reducedMotion() &&
			valid.getBoundingClientRect().top > innerHeight
		) {
			valid.dataset.grow = "wait"
			observer = new IntersectionObserver(
				([entry]) => {
					if (!entry.isIntersecting) return
					observer?.disconnect()
					grow(valid)
				},
				{ threshold: 0.2 }
			)
			observer.observe(valid)
		}

		return () => {
			chart.removeEventListener("pointerover", onTarget)
			chart.removeEventListener("focusin", onTarget)
			chart.removeEventListener("pointerleave", hide)
			chart.removeEventListener("focusout", hide)
			chart.removeEventListener("keydown", onRowKey)
			removeEventListener("scroll", hide)
			removeEventListener("keydown", onKeyDown)
			observer?.disconnect()
		}
	}, [animate, tipId])

	return (
		<>
			<div ref={ref} className="seg" role="radiogroup" aria-label="Input">
				{sets.map(({ set, label }) => (
					<button
						key={set}
						type="button"
						role="radio"
						data-for={set}
						aria-checked={current === set}
						tabIndex={current === set ? 0 : -1}
						onClick={() => pick(set)}
						onKeyDown={onKeyDown}
					>
						{label}
					</button>
				))}
			</div>
			<div ref={tipRef} id={tipId} className="b-tip" role="tooltip" hidden />
		</>
	)
}
