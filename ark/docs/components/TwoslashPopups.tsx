"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { closePopupsEvent } from "./shell/searchEvents.ts"

const tokenSelector = ".twoslash-hover, .tok[data-qi]"
const showDelay = 80
const hideDelay = 120
const gap = 10
const margin = 12
const dockedQuery = "(max-width: 760px)"
const lineStep = 40

const tokenOf = (target: EventTarget | null) =>
	target instanceof Element ? target.closest<HTMLElement>(tokenSelector) : null

const contentOf = (token: HTMLElement) =>
	token.matches(".twoslash-hover") ?
		(token.querySelector(":scope > .twoslash-popup-container")?.innerHTML ?? "")
	:	(document.getElementById(token.dataset.qi!)?.innerHTML ?? "")

/**
 * The page's one quickinfo, like tsserver's. Twoslash renders each hover's
 * popup hidden inside its token (lib/content/twoslash.ts); delegated
 * listeners copy it into this fixed element on hover intent, focus or tap,
 * so code blocks that scroll sideways never clip it. It sits under its
 * token, or above when there's no room below, and docks to the bottom of
 * the screen on phones. Escape, a tap elsewhere, and opening search or the
 * drawer close it.
 * While its token or the box itself has focus, the pointer leaving doesn't
 * close it, so a clicked one can be read, selected and copied, and the
 * focused token's arrow and page keys scroll a long one.
 */
export const TwoslashPopups = () => {
	const pathname = usePathname()
	const qi = useRef<HTMLDivElement>(null)
	const close = useRef(() => {})

	useEffect(() => close.current(), [pathname])

	useEffect(() => {
		const box = qi.current!
		const body = box.querySelector<HTMLElement>(".qi-body")!
		let current: HTMLElement | undefined
		// the token a pointer is pressing, and whether it's a finger or pen
		let pointerToken: HTMLElement | undefined
		let tapped = false
		let showTimer: ReturnType<typeof setTimeout> | undefined
		let hideTimer: ReturnType<typeof setTimeout> | undefined

		const place = () => {
			if (!current || matchMedia(dockedQuery).matches) return
			const token = current.getBoundingClientRect()
			const { width, height } = box.getBoundingClientRect()
			const left = Math.max(
				margin,
				Math.min(token.left - margin, innerWidth - width - margin)
			)
			const below = token.bottom + gap
			const above = token.top - gap - height
			const side =
				below + height > innerHeight - margin && above > margin ?
					"top"
				:	"bottom"
			box.dataset.side = side
			box.style.left = `${left}px`
			box.style.top = `${side === "bottom" ? below : above}px`
			box.style.setProperty(
				"--caret-x",
				`${Math.max(10, Math.min(token.left - left + Math.min(token.width / 2, 24) - 5, width - 20))}px`
			)
		}

		const hide = () => {
			clearTimeout(showTimer)
			clearTimeout(hideTimer)
			if (!current) return
			delete current.dataset.open
			current.removeAttribute("aria-describedby")
			current = undefined
			delete box.dataset.open
		}
		close.current = hide

		const show = (token: HTMLElement) => {
			clearTimeout(hideTimer)
			if (current === token) return
			hide()
			const html = contentOf(token)
			if (!html) return
			current = token
			token.dataset.open = ""
			token.setAttribute("aria-describedby", box.id)
			body.innerHTML = html
			box.style.left = "0px"
			box.style.top = "0px"
			box.hidden = false
			place()
			requestAnimationFrame(() => {
				if (current === token) box.dataset.open = ""
			})
		}

		const scheduleHide = () => {
			clearTimeout(showTimer)
			clearTimeout(hideTimer)
			hideTimer = setTimeout(hide, hideDelay)
		}

		const holdsFocus = () =>
			!!current &&
			(current.contains(document.activeElement) ||
				box.contains(document.activeElement))

		const onPointerOver = (e: PointerEvent) => {
			if (e.pointerType === "touch") return
			if (box.contains(e.target as Node)) {
				clearTimeout(hideTimer)
				return
			}
			const token = tokenOf(e.target)
			if (!token) return
			clearTimeout(showTimer)
			clearTimeout(hideTimer)
			if (current !== token)
				showTimer = setTimeout(() => show(token), current ? 0 : showDelay)
		}

		const onPointerOut = (e: PointerEvent) => {
			if (e.pointerType === "touch" || !current) return
			const from = box.contains(e.target as Node) ? box : tokenOf(e.target)
			if (!from) return
			const to = e.relatedTarget as Node | null
			if (to && (from.contains(to) || box.contains(to) || current.contains(to)))
				return
			if (from === box || from === current) {
				if (!holdsFocus()) scheduleHide()
			} else clearTimeout(showTimer)
		}

		const onPointerDown = (e: PointerEvent) => {
			pointerToken = tokenOf(e.target) ?? undefined
			tapped = e.pointerType !== "mouse"
			if (!pointerToken && !box.contains(e.target as Node)) hide()
		}

		const onClick = (e: MouseEvent) => {
			const token = tokenOf(e.target)
			if (!token) return
			e.preventDefault()
			if (current === token && pointerToken === token && tapped) hide()
			else show(token)
			pointerToken = undefined
		}

		const onFocusIn = (e: FocusEvent) => {
			const token = tokenOf(e.target)
			// a click or tap decides for itself once it lands
			if (token && token !== pointerToken) show(token)
		}

		const onFocusOut = (e: FocusEvent) => {
			if (!current) return
			const from = e.target as Node
			if (tokenOf(from) !== current && !box.contains(from)) return
			const to = e.relatedTarget as Node | null
			if (!to || !(box.contains(to) || current.contains(to))) hide()
		}

		const scrollStep = (key: string) =>
			key === "ArrowDown" ? lineStep
			: key === "ArrowUp" ? -lineStep
			: key === "PageDown" ? body.clientHeight * 0.9
			: key === "PageUp" ? -body.clientHeight * 0.9
			: 0

		const onKeyDown = (e: KeyboardEvent) => {
			if (!current) return
			if (e.key === "Escape") {
				// back to the token, which is already showing, before hiding
				if (box.contains(document.activeElement))
					current.focus({ preventScroll: true })
				return hide()
			}
			const step = scrollStep(e.key)
			if (
				step &&
				tokenOf(e.target) === current &&
				body.scrollHeight > body.clientHeight
			) {
				e.preventDefault()
				body.scrollBy({ top: step })
			}
		}

		const onScroll = () => {
			if (current && !current.isConnected) hide()
			else place()
		}

		document.addEventListener("pointerover", onPointerOver)
		document.addEventListener("pointerout", onPointerOut)
		document.addEventListener("pointerdown", onPointerDown)
		document.addEventListener("click", onClick)
		document.addEventListener("focusin", onFocusIn)
		document.addEventListener("focusout", onFocusOut)
		document.addEventListener("keydown", onKeyDown)
		window.addEventListener(closePopupsEvent, hide)
		window.addEventListener("scroll", onScroll, {
			capture: true,
			passive: true
		})
		window.addEventListener("resize", place, { passive: true })
		return () => {
			hide()
			document.removeEventListener("pointerover", onPointerOver)
			document.removeEventListener("pointerout", onPointerOut)
			document.removeEventListener("pointerdown", onPointerDown)
			document.removeEventListener("click", onClick)
			document.removeEventListener("focusin", onFocusIn)
			document.removeEventListener("focusout", onFocusOut)
			document.removeEventListener("keydown", onKeyDown)
			window.removeEventListener(closePopupsEvent, hide)
			window.removeEventListener("scroll", onScroll, { capture: true })
			window.removeEventListener("resize", place)
		}
	}, [])

	return (
		<div ref={qi} id="qi" className="qi" role="tooltip" hidden>
			<span className="qi-caret" aria-hidden />
			<div className="qi-body" tabIndex={-1} />
		</div>
	)
}
