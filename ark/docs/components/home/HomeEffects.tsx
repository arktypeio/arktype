"use client"

import { useEffect } from "react"
import { reducedMotion, sleep } from "../motion.ts"

/** buttons with `data-copy` copy it and swap to their "copied" face for 1.6s */
const wireCopy = () => {
	const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()
	const onClick = async (e: MouseEvent) => {
		const button =
			e.target instanceof Element ?
				e.target.closest<HTMLElement>("[data-copy]")
			:	null
		if (!button) return
		try {
			await navigator.clipboard.writeText(button.dataset.copy!)
		} catch {
			return
		}
		button.dataset.state = "copied"
		const status = button.querySelector("[role=status]")
		if (status) status.textContent = "Copied"
		clearTimeout(timers.get(button))
		timers.set(
			button,
			setTimeout(() => {
				delete button.dataset.state
				if (status) status.textContent = ""
			}, 1600)
		)
	}
	document.addEventListener("click", onClick)
	return () => document.removeEventListener("click", onClick)
}

/**
 * Blocks below the fold at load fade in once as they arrive. Blocks already
 * scrolled past (an anchor jump) land with no transition, and focus moving
 * into one still waiting shows it at once.
 */
const wireReveal = () => {
	if (reducedMotion()) return
	const blocks = [...document.querySelectorAll<HTMLElement>("[data-reveal]")]
	const reveal = (el: HTMLElement, now: boolean) => {
		el.dataset.in = now ? "now" : ""
		observer.unobserve(el)
	}
	const observer = new IntersectionObserver(
		entries => {
			for (const { target, boundingClientRect, intersectionRatio } of entries) {
				if (boundingClientRect.bottom < 0) reveal(target as HTMLElement, true)
				else if (
					intersectionRatio >= 0.15 ||
					boundingClientRect.top < innerHeight * 0.85
				)
					reveal(target as HTMLElement, false)
			}
		},
		{ threshold: [0, 0.05, 0.1, 0.15, 0.2] }
	)
	// every read, then every write, so no write forces a layout for the next read
	const tops = blocks.map(block => block.getBoundingClientRect().top)
	for (const [i, block] of blocks.entries()) {
		if (tops[i] < innerHeight) continue
		block.dataset.wait = ""
		observer.observe(block)
	}
	const onFocus = (e: FocusEvent) => {
		const block =
			e.target instanceof Element ?
				e.target.closest<HTMLElement>("[data-wait]:not([data-in])")
			:	null
		if (block) reveal(block, true)
	}
	document.addEventListener("focusin", onFocus)
	return () => {
		observer.disconnect()
		document.removeEventListener("focusin", onFocus)
	}
}

/**
 * Plays an element's entrance (`data-play`) once a share of it is on screen.
 * html[data-motion], set before first paint, holds it at its start until
 * then; without motion it is simply the final state.
 */
const playWhenSeen = (
	el: HTMLElement | null,
	share: number,
	onPlay?: () => void
) => {
	// motion went unclaimed (a slow hydration), so the final state is showing
	if (!el || !("motion" in document.documentElement.dataset)) return
	const observer = new IntersectionObserver(
		([entry]) => {
			if (
				entry.intersectionRatio < share &&
				entry.intersectionRect.height < innerHeight * share
			)
				return
			observer.disconnect()
			el.dataset.play = ""
			onPlay?.()
		},
		{ threshold: Array.from({ length: 11 }, (_, i) => i / 20) }
	)
	observer.observe(el)
	return () => observer.disconnect()
}

/**
 * A number counting up to its prerendered value after `delay` ms. It reads
 * zero from the start, so it never shows its final value and then drops.
 */
const countUp = (el: HTMLElement, delay: number, seconds: number) => {
	const to = Number(el.dataset.to)
	const decimals = Number(el.dataset.decimals)
	const suffix = el.dataset.suffix ?? ""
	const final = el.textContent
	// the final width, held, so counting never moves what follows
	el.style.minWidth = `${el.getBoundingClientRect().width}px`
	el.textContent = `${(0).toFixed(decimals)}${suffix}`
	const start = performance.now() + delay
	const frame = (now: number) => {
		const t = Math.max(0, Math.min((now - start) / (seconds * 1000), 1))
		el.textContent =
			t === 1 ? final : (
				`${(to * (1 - (1 - t) ** 3)).toFixed(decimals)}${suffix}`
			)
		if (t < 1) requestAnimationFrame(frame)
	}
	requestAnimationFrame(frame)
}

/** a place like "1st" isn't counted to; it lands as ArkType's bar finishes */
const isPlace = (num: HTMLElement) =>
	/^(st|nd|rd|th)$/.test(num.dataset.suffix ?? "")

/** seconds, from a dot's inline timing (Board.tsx): when it lands */
const landsAt = (spot: HTMLElement) =>
	parseFloat(spot.style.getPropertyValue("--delay")) +
	parseFloat(spot.style.getPropertyValue("--travel"))

/**
 * Each library's tally on the speed card counts its wins as their dots
 * land. Figure spaces pad it to its final length, so its text never moves.
 */
const tallyLanes = (board: HTMLElement) => {
	for (const lane of board.querySelectorAll<HTMLElement>(".spread .lane")) {
		const tally = lane.querySelector<HTMLElement>(".lane-val")
		if (!tally) continue
		const final = tally.textContent!
		const of = final.slice(final.indexOf("/"))
		const landings = [...lane.querySelectorAll<HTMLElement>(".spot.is-win")]
			.map(landsAt)
			.sort((a, b) => a - b)
		const start = performance.now()
		const frame = (now: number) => {
			const elapsed = (now - start) / 1000
			const landed = landings.filter(t => t <= elapsed).length
			tally.textContent =
				landed === landings.length ?
					final
				:	`${landed}${of}`.padStart(final.length, "\u2007")
			if (landed < landings.length) requestAnimationFrame(frame)
		}
		frame(start)
	}
}

/** the speed card's dots: the one nearest the pointer grows and names its scenario */
const wireSpots = () => {
	const board = document.querySelector<HTMLElement>("[data-board]")
	if (!board) return
	let hot: HTMLElement | undefined
	const tipOf = (el: Element) =>
		el.closest(".spread-plot")?.querySelector<HTMLElement>(".spot-tip")
	const clear = () => {
		if (!hot) return
		hot.classList.remove("is-hot")
		tipOf(hot)!.hidden = true
		hot = undefined
	}
	const onPointer = (e: PointerEvent) => {
		const plot =
			e.target instanceof Element ? e.target.closest(".spread-plot") : null
		if (!plot) return clear()
		let nearest: HTMLElement | undefined
		let distance = 16
		for (const spot of plot.querySelectorAll<HTMLElement>(".spot")) {
			const r = spot.getBoundingClientRect()
			const d = Math.hypot(
				r.x + r.width / 2 - e.clientX,
				r.y + r.height / 2 - e.clientY
			)
			if (d < distance) [nearest, distance] = [spot, d]
		}
		if (nearest === hot) return
		clear()
		if (!nearest) return
		hot = nearest
		hot.classList.add("is-hot")
		const tip = tipOf(hot)!
		const name = document.createElement("b")
		name.textContent = hot.dataset.name!
		const verdict = document.createElement("span")
		verdict.className = "v"
		verdict.textContent = hot.dataset.verdict!
		tip.replaceChildren(name, hot.dataset.ns!, verdict)
		tip.hidden = false
		// above the dot, kept inside the plot
		const area = plot.getBoundingClientRect()
		const dot = hot.getBoundingClientRect()
		const left = Math.min(
			Math.max(dot.x + dot.width / 2 - area.x - tip.offsetWidth / 2, 0),
			area.width - tip.offsetWidth
		)
		tip.style.translate = `${left}px ${dot.y - area.y - tip.offsetHeight - 12}px`
	}
	board.addEventListener("pointermove", onPointer)
	board.addEventListener("pointerdown", onPointer)
	board.addEventListener("pointerleave", clear)
	return () => {
		board.removeEventListener("pointermove", onPointer)
		board.removeEventListener("pointerdown", onPointer)
		board.removeEventListener("pointerleave", clear)
	}
}

/** the board's bars race (the shortest, ArkType's, finishes first) as its numbers count */
const wireBoard = () => {
	const board = document.querySelector<HTMLElement>("[data-board]")
	return playWhenSeen(board, 0.3, () => {
		tallyLanes(board!)
		for (const card of board!.querySelectorAll<HTMLElement>(".card")) {
			const num = card.querySelector<HTMLElement>(".card-num[data-to]")
			if (!num) continue
			if (isPlace(num)) {
				// home.css lands it after this, the race's own finish
				const won = card
					.querySelector<HTMLElement>(".race")
					?.style.getPropertyValue("--won")
				if (won) num.style.setProperty("--won", won)
				continue
			}
			// as the card's bars start: home.css's race delay
			const delay =
				Number(getComputedStyle(card).getPropertyValue("--i")) * 120 + 200
			countUp(num, delay, 0.9)
		}
	})
}

const wireProof = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-proof]"), 0.45)

const wirePickThree = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-pick3]"), 0.5)

/**
 * The agent transcript's steps appear in order once it is half visible; a
 * press finishes it and "replay" plays it again. The markup is the final
 * state, so without JS or with reduced motion it simply reads.
 */
const wireTranscript = () => {
	const term = document.querySelector<HTMLElement>("[data-term]")
	if (!term) return
	let run = 0
	const items = [...term.querySelectorAll<HTMLElement>("[data-step]")]
	const finish = () => {
		run++
		delete term.dataset.playing
		for (const li of items) li.classList.remove("is-waiting")
	}
	const play = async () => {
		const id = ++run
		term.dataset.playing = ""
		for (const li of items) li.classList.add("is-waiting")
		const steps = [...new Set(items.map(li => Number(li.dataset.step)))]
		for (const step of steps) {
			if (id !== run) return
			for (const li of items)
				if (Number(li.dataset.step) === step) li.classList.remove("is-waiting")
			// a beat to read the tsc error before the fix
			await sleep(step === 2 ? 900 : 420)
		}
		if (id === run) delete term.dataset.playing
	}
	let observer: IntersectionObserver | undefined
	if (!reducedMotion() && term.getBoundingClientRect().top > innerHeight) {
		observer = new IntersectionObserver(
			([entry]) => {
				if (entry.intersectionRatio < 0.5) return
				observer?.disconnect()
				void play()
			},
			{ threshold: [0.5] }
		)
		observer.observe(term)
	}
	const onPointerDown = (e: PointerEvent) => {
		const replay =
			e.target instanceof Element && e.target.closest(".term-replay")
		if (replay) return
		if (term.dataset.playing !== undefined) finish()
	}
	const onClick = (e: MouseEvent) => {
		if (!(e.target instanceof Element && e.target.closest(".term-replay")))
			return
		if (reducedMotion()) finish()
		else void play()
	}
	term.addEventListener("pointerdown", onPointerDown)
	term.addEventListener("click", onClick)
	return () => {
		run++
		observer?.disconnect()
		term.removeEventListener("pointerdown", onPointerDown)
		term.removeEventListener("click", onClick)
	}
}

/** html[data-motion] (see the home layout), kept now that something will play it */
const claimMotion = () => {
	const root = document.documentElement
	if (root.dataset.motion === "") root.dataset.motion = "claimed"
}

/** the homepage's small behaviors, as delegated listeners over server markup */
export const HomeEffects = () => {
	useEffect(() => {
		claimMotion()
		const cleanups = [
			wireCopy(),
			wireReveal(),
			wireTranscript(),
			wireBoard(),
			wireSpots(),
			wireProof(),
			wirePickThree()
		]
		return () => {
			for (const cleanup of cleanups) cleanup?.()
		}
	}, [])
	return null
}
