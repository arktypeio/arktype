"use client"

import { useEffect } from "react"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const reducedMotion = () =>
	matchMedia("(prefers-reduced-motion: reduce)").matches

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
 * scrolled past (an anchor jump) land with no transition.
 */
const wireReveal = () => {
	if (reducedMotion()) return
	const blocks = [...document.querySelectorAll<HTMLElement>("[data-reveal]")]
	const observer = new IntersectionObserver(
		entries => {
			for (const { target, boundingClientRect, intersectionRatio } of entries) {
				const el = target as HTMLElement
				if (boundingClientRect.bottom < 0) el.dataset.in = "now"
				else if (
					intersectionRatio >= 0.15 ||
					boundingClientRect.top < innerHeight * 0.85
				)
					el.dataset.in = ""
				else continue
				observer.unobserve(el)
			}
		},
		{ threshold: [0, 0.05, 0.1, 0.15, 0.2] }
	)
	for (const block of blocks) {
		if (block.getBoundingClientRect().top < innerHeight) continue
		block.dataset.wait = ""
		observer.observe(block)
	}
	return () => observer.disconnect()
}

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

/** the footer boat only floats while it's on screen */
const wireBoat = () => {
	const lane = document.querySelector<HTMLElement>(".boat-lane")
	if (!lane) return
	const observer = new IntersectionObserver(([entry]) => {
		if (entry.isIntersecting) lane.dataset.on = ""
		else delete lane.dataset.on
	})
	observer.observe(lane)
	return () => observer.disconnect()
}

/** the homepage's small behaviors, as delegated listeners over server markup */
export const HomeEffects = () => {
	useEffect(() => {
		const cleanups = [wireCopy(), wireReveal(), wireTranscript(), wireBoat()]
		return () => {
			for (const cleanup of cleanups) cleanup?.()
		}
	}, [])
	return null
}
