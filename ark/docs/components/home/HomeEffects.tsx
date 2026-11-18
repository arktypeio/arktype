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

/** the speed drill-down's dots: the one nearest the pointer grows and names its scenario */
const wireSpots = () => {
	const card = document.querySelector<HTMLElement>(".card.is-solo.is-speed")
	if (!card) return
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
	card.addEventListener("pointermove", onPointer)
	card.addEventListener("pointerdown", onPointer)
	card.addEventListener("pointerleave", clear)
	return () => {
		card.removeEventListener("pointermove", onPointer)
		card.removeEventListener("pointerdown", onPointer)
		card.removeEventListener("pointerleave", clear)
	}
}

/** the board's title strikes "Pick 2" and its places land, once it is seen */
const wireBoard = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-board]"), 0.3)

/**
 * The lap race's tallies: a lane's count is how many times its runner has
 * crossed, from the same clock home.css's animation runs on. Off screen, the
 * race and its clock both stop.
 */
const runLaps = (figure: HTMLElement) => {
	const lanes = [...figure.querySelectorAll<HTMLElement>(".lap-count")].map(
		el => ({ el, lap: Number(el.dataset.lap), shown: -1 })
	)
	const toggle = figure.querySelector<HTMLButtonElement>(".laps-toggle")
	let elapsed = 0
	let last = performance.now()
	let frame = 0
	let seen = false
	let stopped = false
	const tick = (now: number) => {
		elapsed += (now - last) / 1000
		last = now
		for (const lane of lanes) {
			const laps = Math.floor(elapsed / lane.lap)
			if (laps === lane.shown) continue
			lane.shown = laps
			lane.el.textContent = laps.toLocaleString("en-US")
		}
		frame = requestAnimationFrame(tick)
	}
	/** the race runs while it is on screen and nobody has stopped it */
	const sync = () => {
		cancelAnimationFrame(frame)
		if (seen && !stopped) {
			delete figure.dataset.paused
			last = performance.now()
			frame = requestAnimationFrame(tick)
		} else figure.dataset.paused = ""
	}
	const observer = new IntersectionObserver(([entry]) => {
		seen = entry.isIntersecting
		sync()
	})
	observer.observe(figure)
	const onToggle = () => {
		stopped = !stopped
		if (toggle) {
			toggle.setAttribute("aria-pressed", String(stopped))
			toggle.textContent = stopped ? "play" : "pause"
		}
		sync()
	}
	toggle?.addEventListener("click", onToggle)
	return () => {
		cancelAnimationFrame(frame)
		observer.disconnect()
		toggle?.removeEventListener("click", onToggle)
	}
}

/** kilobytes to three figures, as ByteGrid writes them */
const kbText = (kb: number) => kb.toPrecision(3)

/**
 * The byte grid's number, held at the dynamic bundle's size until its blocks
 * start to leave, then counted down to the precompiled one's as they go
 */
const holdBytes = (figure: HTMLElement) => {
	const num = figure.querySelector<HTMLElement>(".bytes-num")
	if (!num) return
	// its markup, which a remount in development finds already rewritten
	const final = num.dataset.to!
	const from = Number(num.dataset.from)
	const to = Number(num.dataset.to)
	num.textContent = kbText(from)
	// the wider number's width, held, so counting never moves what follows
	num.style.minWidth = `${num.getBoundingClientRect().width}px`
	return () => {
		// as landing.css lets the blocks go: from a second in, evenly, for two more
		const start = performance.now() + 1000
		const frame = (now: number) => {
			const t = Math.max(0, Math.min((now - start) / 2000, 1))
			num.textContent = t === 1 ? final : kbText(from + (to - from) * t)
			if (t < 1) requestAnimationFrame(frame)
		}
		requestAnimationFrame(frame)
	}
}

/**
 * Every figure with `data-stage` plays once it is seen: home.css animates it
 * from [data-play], its point's big number counts up, and the stages that
 * need a clock get one.
 */
const wireStages = () => {
	// motion went unclaimed, so every figure is showing its final state
	if (!("motion" in document.documentElement.dataset)) return
	const cleanups = [
		...document.querySelectorAll<HTMLElement>("[data-stage]")
	].flatMap(figure => {
		const release =
			figure.dataset.stage === "bytes" ? holdBytes(figure) : undefined
		let stop: (() => void) | undefined
		const unobserve = playWhenSeen(figure, 0.4, () => {
			const stat = figure
				.closest(".point")
				?.querySelector<HTMLElement>(".stat-num[data-to]")
			if (stat) countUp(stat, 100, 0.9)
			release?.()
			if (figure.dataset.stage === "laps") stop = runLaps(figure)
		})
		return [unobserve, () => stop?.()]
	})
	return () => {
		for (const cleanup of cleanups) cleanup?.()
	}
}

/**
 * A link to something inside a closed drill-down opens it first, then
 * scrolls there: on load, and whenever the hash changes.
 */
const wireHash = () => {
	const open = () => {
		const id = decodeURIComponent(location.hash.slice(1))
		const target = id ? document.getElementById(id) : null
		if (!target) return
		const within: HTMLDetailsElement[] = []
		for (
			let details = target.closest("details");
			details;
			details = details.parentElement?.closest("details") ?? null
		)
			within.push(details)
		if (!within.length) return
		for (const details of within) details.open = true
		// the browser may have opened it already, having scrolled to where
		// the target wasn't yet
		requestAnimationFrame(() => target.scrollIntoView())
	}
	open()
	addEventListener("hashchange", open)
	return () => removeEventListener("hashchange", open)
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
			wireStages(),
			wireHash(),
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
