"use client"

import { useEffect } from "react"
import { reducedMotion } from "../motion.ts"

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
 * Where a count starts, as a share of where it lands. From zero, the first
 * half second of the hero read "0× fewer startup instructions": a frame nobody
 * should be able to screenshot. From here every frame is a number the
 * measurement supports, only smaller than the one it rests on.
 */
const countFrom = 0.7

/**
 * A number counting up to its prerendered value after `delay` ms. It reads
 * its starting share at once, so it never shows its final value and then
 * drops.
 */
const countUp = (el: HTMLElement, delay: number, seconds: number) => {
	const to = Number(el.dataset.to)
	const decimals = Number(el.dataset.decimals)
	const suffix = el.dataset.suffix ?? ""
	const final = el.textContent
	// the final width, held, so counting never moves what follows
	const width = el.getBoundingClientRect().width
	if (width > 0) el.style.minWidth = `${width}px`
	const from = to * countFrom
	el.textContent = `${from.toFixed(decimals)}${suffix}`
	const start = performance.now() + delay
	const frame = (now: number) => {
		const t = Math.max(0, Math.min((now - start) / (seconds * 1000), 1))
		el.textContent =
			t === 1 ? final : (
				`${(from + (to - from) * (1 - (1 - t) ** 3)).toFixed(decimals)}${suffix}`
			)
		if (t < 1) requestAnimationFrame(frame)
	}
	requestAnimationFrame(frame)
}

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
 * The speed figure's counters: validations finished since the page loaded,
 * ArkType's at the figure's rate and every other library's at that over its
 * median ratio. Frames stop while off screen; only the pause button stops the
 * clock.
 */
const runCount = (figure: HTMLElement, loadedAt: number) => {
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
	let pausedMs = 0
	let pausedAt = 0
	let frame = 0
	let seen = false
	let stopped = false
	const render = (now: number) => {
		const elapsed = Math.max(0, now - loadedAt - pausedMs) / 1000
		for (const lane of lanes) {
			const count = Math.floor((elapsed * rate) / lane.ratio)
			if (count <= lane.shown) continue
			lane.shown = count
			lane.el.textContent = count.toLocaleString("en-US")
		}
	}
	const tick = (now: number) => {
		render(now)
		frame = requestAnimationFrame(tick)
	}
	/** the counters paint while on screen and unpaused; the clock only stops when paused */
	const sync = () => {
		cancelAnimationFrame(frame)
		if (seen && !stopped) {
			delete figure.dataset.paused
			frame = requestAnimationFrame(tick)
		} else figure.dataset.paused = ""
	}
	render(performance.now())
	const observer = new IntersectionObserver(([entry]) => {
		seen = entry.isIntersecting
		sync()
	})
	observer.observe(figure)
	const onToggle = () => {
		stopped = !stopped
		if (stopped) pausedAt = performance.now()
		else pausedMs += performance.now() - pausedAt
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

/** decodes a URL hash fragment safely without throwing URIError on malformed escapes */
const hashId = (hash: string) => {
	const raw = hash.startsWith("#") ? hash.slice(1) : hash
	try {
		return decodeURIComponent(raw)
	} catch {
		return raw
	}
}

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
	return () => {
		// measure once visible (the Size tab is display:none on initial mount)
		const width = num.getBoundingClientRect().width
		if (width > 0) num.style.minWidth = `${width}px`
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
	const loadedAt = performance.now()
	const cleanups = [
		...document.querySelectorAll<HTMLElement>("[data-stage]")
	].flatMap(figure => {
		const { stage } = figure.dataset
		const release = stage === "bytes" ? holdBytes(figure) : undefined
		let stop: (() => void) | undefined
		const unobserve = playWhenSeen(figure, 0.4, () => {
			release?.()
			if (stage === "count") stop = runCount(figure, loadedAt)
			if (stage === "boot") stop = runBoot(figure)
		})
		return [unobserve, () => stop?.()]
	})
	return () => {
		for (const cleanup of cleanups) cleanup?.()
	}
}

/**
 * Tabbed stages (`data-tabs`): clicking a tab switches the visible panel and
 * reveals any hidden target anchored by a hash or link (like #run, #size,
 * #start, #loses, or #guarantee). Keyboard arrows move between tabs.
 */
const wireTabs = () => {
	const groups = [...document.querySelectorAll<HTMLElement>("[data-tabs]")]
	if (!groups.length) return
	const activate = (group: HTMLElement, key: string) => {
		const tabs = group.querySelectorAll<HTMLButtonElement>("[data-tab]")
		const panels = group.querySelectorAll<HTMLElement>("[data-panel]")
		for (const tab of tabs) {
			const active = tab.dataset.tab === key
			tab.setAttribute("aria-selected", String(active))
			tab.tabIndex = active ? 0 : -1
		}
		for (const panel of panels) {
			const active = panel.dataset.panel === key
			panel.toggleAttribute("data-closed", !active)
		}
	}
	for (const group of groups) {
		const selected = group.querySelector<HTMLButtonElement>(
			'[data-tab][aria-selected="true"]'
		)
		if (selected?.dataset.tab) activate(group, selected.dataset.tab)
	}
	const scrollTargetOf = (
		group: HTMLElement,
		panel: HTMLElement,
		target: HTMLElement
	) => (group.id === "proof" && target === panel ? group : target)
	const reveal = (id: string) => {
		const target = id ? document.getElementById(id) : null
		if (!target) return
		const panel = target.closest<HTMLElement>("[data-panel]")
		const group = panel?.closest<HTMLElement>("[data-tabs]")
		if (!panel || !group || !panel.dataset.panel) return
		activate(group, panel.dataset.panel)
		const scrollTo = scrollTargetOf(group, panel, target)
		requestAnimationFrame(() => scrollTo.scrollIntoView())
	}
	const fromHash = () => reveal(hashId(location.hash))
	const onClick = (e: MouseEvent) => {
		if (!(e.target instanceof Element)) return
		const tab = e.target.closest<HTMLButtonElement>("[data-tab]")
		if (tab) {
			const group = tab.closest<HTMLElement>("[data-tabs]")
			if (group && tab.dataset.tab) activate(group, tab.dataset.tab)
			return
		}
		if (
			e.defaultPrevented ||
			e.button !== 0 ||
			e.metaKey ||
			e.ctrlKey ||
			e.shiftKey ||
			e.altKey
		)
			return
		const link = e.target.closest<HTMLAnchorElement>('a[href^="#"]')
		if (link) {
			const id = hashId(link.hash)
			const target = id ? document.getElementById(id) : null
			const panel = target?.closest<HTMLElement>("[data-panel]")
			const group = panel?.closest<HTMLElement>("[data-tabs]")
			if (panel && group && panel.dataset.panel) {
				e.preventDefault()
				activate(group, panel.dataset.panel)
				const scrollTo = scrollTargetOf(group, panel, target!)
				if (location.hash !== `#${id}`) history.pushState(null, "", `#${id}`)
				requestAnimationFrame(() => scrollTo.scrollIntoView())
			}
		}
	}
	const onKeyDown = (e: KeyboardEvent) => {
		if (!(e.target instanceof Element)) return
		const tab = e.target.closest<HTMLButtonElement>("[data-tab]")
		if (!tab) return
		const group = tab.closest<HTMLElement>("[data-tabs]")
		if (!group) return
		const tabs = [...group.querySelectorAll<HTMLButtonElement>("[data-tab]")]
		const i = tabs.indexOf(tab)
		let next = -1
		if (e.key === "ArrowRight") next = (i + 1) % tabs.length
		else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length
		else if (e.key === "Home") next = 0
		else if (e.key === "End") next = tabs.length - 1
		if (next < 0) return
		e.preventDefault()
		const target = tabs[next]
		if (target.dataset.tab) activate(group, target.dataset.tab)
		target.focus()
	}
	fromHash()
	addEventListener("hashchange", fromHash)
	document.addEventListener("click", onClick)
	document.addEventListener("keydown", onKeyDown)
	return () => {
		removeEventListener("hashchange", fromHash)
		document.removeEventListener("click", onClick)
		document.removeEventListener("keydown", onKeyDown)
	}
}

/** switches the migrate card's copyable prompt between @ark/aot and dynamic-only */
const wireMigrateToggle = () => {
	const box = document.querySelector<HTMLElement>("[data-migrate]")
	const toggle = box?.querySelector<HTMLInputElement>("[data-migrate-aot]")
	const text = box?.querySelector<HTMLElement>("[data-migrate-text]")
	const button = text?.closest<HTMLElement>("[data-copy]")
	if (!box || !toggle || !text || !button) return
	const sync = () => {
		const prompt =
			toggle.checked ? box.dataset.promptAot! : box.dataset.promptDynamic!
		text.textContent = prompt
		button.dataset.copy = prompt
	}
	sync()
	toggle.addEventListener("change", sync)
	return () => toggle.removeEventListener("change", sync)
}

/** closes the mobile navigation menu on outside click, Escape or link press */
const wireMobileMenu = () => {
	const menu = document.querySelector<HTMLDetailsElement>("[data-home-menu]")
	const summary = menu?.querySelector<HTMLElement>("summary")
	if (!menu) return
	const onClick = (e: MouseEvent) => {
		if (!menu.open || !(e.target instanceof Element)) return
		if (!menu.contains(e.target) || e.target.closest("a")) menu.open = false
	}
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape" && menu.open) {
			menu.open = false
			summary?.focus()
		}
	}
	document.addEventListener("click", onClick)
	document.addEventListener("keydown", onKeyDown)
	return () => {
		document.removeEventListener("click", onClick)
		document.removeEventListener("keydown", onKeyDown)
	}
}

/**
 * A figure that keeps moving at rest (`data-idle`) is marked `data-away`
 * while none of it is on screen, and landing.css pauses it until it is back.
 */
const wireIdle = () => {
	const observer = new IntersectionObserver(entries => {
		for (const { target, isIntersecting } of entries)
			target.toggleAttribute("data-away", !isIntersecting)
	})
	for (const figure of document.querySelectorAll("[data-idle]"))
		observer.observe(figure)
	return () => observer.disconnect()
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
	const fromHash = () => reveal(hashId(location.hash))
	const onClick = (e: MouseEvent) => {
		if (!(e.target instanceof Element)) return
		const chip = e.target.closest(".drill-chip")
		if (chip) return toggle(chip)
		const link = e.target.closest<HTMLAnchorElement>('a[href^="#"]')
		if (link) reveal(hashId(link.hash))
	}
	fromHash()
	addEventListener("hashchange", fromHash)
	document.addEventListener("click", onClick)
	return () => {
		removeEventListener("hashchange", fromHash)
		document.removeEventListener("click", onClick)
	}
}

/**
 * A chip row that scrolls sideways (a phone's) fades at whichever edge has
 * more chips past it, and only there: `data-more` names the edges, and
 * landing.css fades them. Before this runs, and without scripts, the row
 * fades at its end, where the rest always starts out.
 */
const wireChipRows = () => {
	const rows = [...document.querySelectorAll<HTMLElement>(".drill-chips")]
	const mark = (row: HTMLElement) => {
		const past = row.scrollLeft > 4
		const ahead = row.scrollLeft + row.clientWidth < row.scrollWidth - 4
		row.dataset.more = [past ? "start" : "", ahead ? "end" : ""]
			.join(" ")
			.trim()
	}
	const onScroll = (e: Event) => mark(e.currentTarget as HTMLElement)
	const onResize = () => {
		for (const row of rows) mark(row)
	}
	const ro = new ResizeObserver(entries => {
		for (const { target } of entries) mark(target as HTMLElement)
	})
	for (const row of rows) {
		mark(row)
		ro.observe(row)
		row.addEventListener("scroll", onScroll, { passive: true })
	}
	addEventListener("resize", onResize, { passive: true })
	return () => {
		ro.disconnect()
		for (const row of rows) row.removeEventListener("scroll", onScroll)
		removeEventListener("resize", onResize)
	}
}

const wirePickThree = () =>
	playWhenSeen(document.querySelector<HTMLElement>("[data-pick3]"), 0.5)

/** html[data-motion] (see the home layout), kept now that something will play it */
const claimMotion = () => {
	const root = document.documentElement
	if (root.dataset.motion === "") root.dataset.motion = "claimed"
}

/** hovering a library in one board graph highlights that same library across all three */
const wireBoardTrace = () => {
	const board = document.querySelector<HTMLElement>(".graphs")
	if (!board) return
	const clear = () => {
		delete board.dataset.hoverLib
		for (const el of board.querySelectorAll(".graph-lane.is-traced"))
			el.classList.remove("is-traced")
	}
	const highlight = (lib: string) => {
		if (board.dataset.hoverLib === lib) return
		clear()
		board.dataset.hoverLib = lib
		for (const el of board.querySelectorAll<HTMLElement>(".graph-lane"))
			if (el.dataset.lib === lib) el.classList.add("is-traced")
	}
	const onOver = (e: PointerEvent) => {
		if (e.pointerType !== "mouse") return
		const lane =
			e.target instanceof Element ?
				e.target.closest<HTMLElement>(".graph-lane[data-lib]")
			:	null
		if (lane?.dataset.lib) highlight(lane.dataset.lib)
		else clear()
	}
	board.addEventListener("pointerover", onOver)
	board.addEventListener("pointerleave", clear)
	return () => {
		board.removeEventListener("pointerover", onOver)
		board.removeEventListener("pointerleave", clear)
		clear()
	}
}

/** the homepage's small behaviors, as delegated listeners over server markup */
export const HomeEffects = () => {
	useEffect(() => {
		claimMotion()
		const cleanups = [
			wireCopy(),
			wireReveal(),
			wireStats(),
			wireStages(),
			wireTabs(),
			wireMigrateToggle(),
			wireMobileMenu(),
			wireIdle(),
			wireDrills(),
			wireChipRows(),
			wirePickThree(),
			wireBoardTrace()
		]
		return () => {
			for (const cleanup of cleanups) cleanup?.()
		}
	}, [])
	return null
}
