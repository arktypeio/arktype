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

/** "Pick 2" is struck out of the title, wherever the title is, once it is seen */
const wireBoard = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-board]"), 0.3)

/**
 * A big number counts up once the number itself is on screen. It answers to
 * nothing else: tied to its section's figure, it stayed blank on a phone
 * until the figure under it had scrolled into view.
 */
const wireStats = () => {
	// motion went unclaimed, so every number is showing
	if (!("motion" in document.documentElement.dataset)) return
	const observer = new IntersectionObserver(
		entries => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue
				const stat = entry.target as HTMLElement
				observer.unobserve(stat)
				// the hero's three, one after the other
				const peers = [
					...(stat.closest(".hero-stats")?.querySelectorAll(".stat-num") ?? [])
				]
				const delay = Math.max(0, peers.indexOf(stat)) * 140
				countUp(stat, delay, 0.9)
				stat.dataset.in = ""
			}
		},
		{ threshold: 0.5 }
	)
	for (const stat of document.querySelectorAll(".stat-num[data-to]"))
		observer.observe(stat)
	return () => observer.disconnect()
}

/**
 * The speed figure's counters: validations finished since it came on
 * screen, ArkType's at the figure's rate and every other library's at that
 * over its median ratio. Off screen or paused, the clock stops with them.
 */
const runCount = (figure: HTMLElement) => {
	const rate = Number(figure.dataset.rate)
	const lanes = [...figure.querySelectorAll<HTMLElement>(".count-num")].map(
		el => ({
			el,
			ratio: Number(el.dataset.ratio),
			shown: -1,
			rest: el.textContent
		})
	)
	const title = figure.querySelector<HTMLElement>(".count-title")
	const rest = title?.textContent
	if (title) title.textContent = title.dataset.live!
	const toggle = figure.querySelector<HTMLButtonElement>(".count-toggle")
	let elapsed = 0
	let last = performance.now()
	let frame = 0
	let seen = false
	let stopped = false
	const tick = (now: number) => {
		elapsed += (now - last) / 1000
		last = now
		for (const lane of lanes) {
			const count = Math.floor((elapsed * rate) / lane.ratio)
			if (count === lane.shown) continue
			lane.shown = count
			lane.el.textContent = count.toLocaleString("en-US")
		}
		frame = requestAnimationFrame(tick)
	}
	/** the counters run while they are on screen and nobody has stopped them */
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
			toggle.textContent = stopped ? "resume" : "pause"
		}
		sync()
	}
	toggle?.addEventListener("click", onToggle)
	return () => {
		cancelAnimationFrame(frame)
		observer.disconnect()
		toggle?.removeEventListener("click", onToggle)
		// the markup's comparison at rest, for a remount in development
		for (const lane of lanes) lane.el.textContent = lane.rest
		if (title && rest) title.textContent = rest
	}
}

/**
 * The boot log's counts: every library's runs up at one speed, the speed at
 * which the costliest takes `--sweep`, and stops at its own total, when its
 * lane reads as started. landing.css grows the bars on the same clock.
 */
const runBoot = (figure: HTMLElement) => {
	const max = Number(figure.style.getPropertyValue("--max"))
	const sweep = parseFloat(figure.style.getPropertyValue("--sweep"))
	const lanes = [...figure.querySelectorAll<HTMLElement>(".boot-lane")].map(
		lane => {
			const el = lane.querySelector<HTMLElement>(".boot-val")!
			return { lane, el, to: Number(el.dataset.to), final: el.textContent }
		}
	)
	const replay = figure.querySelector<HTMLButtonElement>(".boot-replay")
	let frame = 0
	const play = () => {
		cancelAnimationFrame(frame)
		for (const { lane } of lanes) delete lane.dataset.done
		// as landing.css starts the bars
		const start = performance.now() + 300
		const tick = (now: number) => {
			const reached = (Math.max(0, now - start) / 1000 / sweep) * max
			let running = false
			for (const { lane, el, to, final } of lanes) {
				if ("done" in lane.dataset) continue
				if (reached >= to) {
					el.textContent = final
					lane.dataset.done = ""
				} else {
					// in the unit its total is written in: "0.87M"
					el.textContent = `${reached.toFixed(2)}${final?.replace(/^[\d.]+/, "")}`
					running = true
				}
			}
			if (running) frame = requestAnimationFrame(tick)
		}
		frame = requestAnimationFrame(tick)
	}
	const onReplay = () => {
		delete figure.dataset.play
		// a reflow between the two, so the bars' animation starts over
		void figure.offsetWidth
		figure.dataset.play = ""
		play()
	}
	replay?.addEventListener("click", onReplay)
	play()
	return () => {
		cancelAnimationFrame(frame)
		replay?.removeEventListener("click", onReplay)
		for (const { lane, el, final } of lanes) {
			el.textContent = final
			lane.dataset.done = ""
		}
	}
}

/** kilobytes to three figures, as ByteGrid writes them */
const kbText = (kb: number) => kb.toPrecision(3)

/**
 * The byte grid's number, held at the dynamic bundle's size until its blocks
 * start to leave, then counted down to the precompiled one's as they go.
 * Only then is the figure `data-done`: the number turns gold and the other
 * libraries' rows arrive.
 */
const holdBytes = (figure: HTMLElement) => {
	const num = figure.querySelector<HTMLElement>(".bytes-num")
	if (!num) return
	// its markup, which a remount in development finds already rewritten
	const final = num.dataset.to!
	const from = Number(num.dataset.from)
	const to = Number(num.dataset.to)
	delete figure.dataset.done
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
			else figure.dataset.done = ""
		}
		requestAnimationFrame(frame)
	}
}

/**
 * Every figure with `data-stage` plays once it is seen: landing.css animates
 * it from [data-play], and the stages that need a clock get one.
 */
const wireStages = () => {
	// motion went unclaimed, so every figure is showing its final state
	if (!("motion" in document.documentElement.dataset)) return
	const cleanups = [
		...document.querySelectorAll<HTMLElement>("[data-stage]")
	].flatMap(figure => {
		const { stage } = figure.dataset
		const release = stage === "bytes" ? holdBytes(figure) : undefined
		let stop: (() => void) | undefined
		const unobserve = playWhenSeen(figure, 0.4, () => {
			release?.()
			if (stage === "count") stop = runCount(figure)
			if (stage === "boot") stop = runBoot(figure)
		})
		return [unobserve, () => stop?.()]
	})
	return () => {
		for (const cleanup of cleanups) cleanup?.()
	}
}

/**
 * A section's drill-downs: a chip opens its panel under the row and closes
 * the one that was open. A link to something inside a closed panel opens it
 * first, then scrolls there: on load, on a hash change and on a press of a
 * link whose hash is already the page's.
 */
const wireDrills = () => {
	const set = (chip: Element, open: boolean) => {
		const panel = document.getElementById(chip.getAttribute("aria-controls")!)
		if (!panel) return
		chip.setAttribute("aria-expanded", String(open))
		panel.toggleAttribute("data-closed", !open)
	}
	const toggle = (chip: Element) => {
		const open = chip.getAttribute("aria-expanded") !== "true"
		const row = chip.parentElement!
		for (const other of row.querySelectorAll('[aria-expanded="true"]'))
			set(other, false)
		set(chip, open)
	}
	const reveal = (id: string) => {
		const target = id ? document.getElementById(id) : null
		const panel = target?.closest<HTMLElement>(".drill-panel[data-closed]")
		if (!target || !panel) return
		const chip = document.querySelector(
			`.drill-chip[aria-controls="${CSS.escape(panel.id)}"]`
		)
		if (!chip) return
		toggle(chip)
		// the browser has scrolled to where the target wasn't yet
		requestAnimationFrame(() => target.scrollIntoView())
	}
	const fromHash = () => reveal(decodeURIComponent(location.hash.slice(1)))
	const onClick = (e: MouseEvent) => {
		if (!(e.target instanceof Element)) return
		const chip = e.target.closest(".drill-chip")
		if (chip) return toggle(chip)
		const link = e.target.closest<HTMLAnchorElement>('a[href^="#"]')
		if (link) reveal(decodeURIComponent(link.hash.slice(1)))
	}
	fromHash()
	addEventListener("hashchange", fromHash)
	document.addEventListener("click", onClick)
	return () => {
		removeEventListener("hashchange", fromHash)
		document.removeEventListener("click", onClick)
	}
}

const wireProof = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-proof]"), 0.45)

const wirePickThree = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-pick3]"), 0.5)

/** the step whose output is the tsc error, and the one whose diff applies it */
const errorStep = 2
const fixStep = 3

/**
 * The agent transcript's steps appear in order once it is half visible. Its
 * one beat is held: the name tsc suggests lifts out of the error and lands
 * in the diff, where the typo was. A press finishes it and "replay" plays it
 * again. The markup is the final state, so without JS or with reduced
 * motion it simply reads.
 */
const wireTranscript = () => {
	const term = document.querySelector<HTMLElement>("[data-term]")
	if (!term) return
	let run = 0
	const items = [...term.querySelectorAll<HTMLElement>("[data-step]")]
	const body = term.querySelector<HTMLElement>(".term-body")
	const fix = term.querySelector<HTMLElement>(".fix")
	const target = term.querySelector<HTMLElement>(".fix-target")
	let flying: HTMLElement | undefined
	const settle = () => {
		flying?.remove()
		flying = undefined
		fix?.classList.remove("is-lifted")
		target?.classList.remove("is-unset")
	}
	const finish = () => {
		run++
		delete term.dataset.playing
		for (const li of items) li.classList.remove("is-waiting")
		target?.classList.remove("is-landed")
		settle()
	}
	/** the suggested name, from the error to where the diff uses it */
	const fly = async () => {
		if (!body || !fix || !target) return
		const area = body.getBoundingClientRect()
		const from = fix.getBoundingClientRect()
		const to = target.getBoundingClientRect()
		const ghost = document.createElement("span")
		ghost.className = "fix-fly"
		ghost.textContent = fix.textContent
		ghost.style.left = `${from.x - area.x}px`
		ghost.style.top = `${from.y - area.y}px`
		body.append(ghost)
		flying = ghost
		fix.classList.add("is-lifted")
		await ghost.animate(
			[
				{ translate: "0 0", scale: 1 },
				{ scale: 1.12, offset: 0.35 },
				{ translate: `${to.x - from.x}px ${to.y - from.y}px`, scale: 1 }
			],
			{
				duration: 820,
				easing: "cubic-bezier(0.6, 0, 0.2, 1)",
				fill: "forwards"
			}
		).finished
	}
	const play = async () => {
		const id = ++run
		settle()
		term.dataset.playing = ""
		target?.classList.remove("is-landed")
		target?.classList.add("is-unset")
		for (const li of items) li.classList.add("is-waiting")
		const steps = [...new Set(items.map(li => Number(li.dataset.step)))]
		for (const step of steps) {
			if (id !== run) return
			for (const li of items)
				if (Number(li.dataset.step) === step) li.classList.remove("is-waiting")
			if (step === errorStep) {
				// long enough to read the error and find the name in it
				await sleep(1500)
			} else if (step === fixStep) {
				await sleep(450)
				if (id !== run) return
				await fly()
				if (id !== run) return
				settle()
				target?.classList.add("is-landed")
				await sleep(1300)
			} else await sleep(520)
		}
		if (id === run) delete term.dataset.playing
	}
	let observer: IntersectionObserver | undefined
	if (!reducedMotion() && term.getBoundingClientRect().top > innerHeight) {
		observer = new IntersectionObserver(
			([entry]) => {
				// half of it, or half a screen of it where it is taller than one
				if (
					entry.intersectionRatio < 0.5 &&
					entry.intersectionRect.height < innerHeight * 0.5
				)
					return
				observer?.disconnect()
				void play()
			},
			{ threshold: Array.from({ length: 11 }, (_, i) => i / 20) }
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
		observer?.disconnect()
		term.removeEventListener("pointerdown", onPointerDown)
		term.removeEventListener("click", onClick)
		finish()
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
			wireStats(),
			wireStages(),
			wireDrills(),
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
