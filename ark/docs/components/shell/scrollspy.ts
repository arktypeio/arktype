import { useEffect, useState } from "react"

/**
 * The index of the heading being read: the last one whose top has reached
 * the anchor offset, or the last one at the very bottom of the page, where
 * a short final section can't scroll that far.
 */
const activeIndexOf = (headings: (HTMLElement | null)[]): number => {
	const root = document.documentElement
	if (innerHeight + scrollY >= root.scrollHeight - 4) return headings.length - 1
	const line = parseFloat(getComputedStyle(root).scrollPaddingTop) + 8
	let active = 0
	for (const [i, heading] of headings.entries()) {
		if (!heading) continue
		if (heading.getBoundingClientRect().top > line) break
		active = i
	}
	return active
}

/** tracks which of the elements with these ids is being read */
export const useScrollspy = (ids: readonly string[]): number => {
	const [active, setActive] = useState(0)

	useEffect(() => {
		const headings = ids.map(id => document.getElementById(id))
		if (!headings.some(Boolean)) return
		let frame = 0
		const update = () => {
			cancelAnimationFrame(frame)
			frame = requestAnimationFrame(() => setActive(activeIndexOf(headings)))
		}
		update()
		addEventListener("scroll", update, { passive: true })
		addEventListener("resize", update)
		void document.fonts.ready.then(update)
		return () => {
			cancelAnimationFrame(frame)
			removeEventListener("scroll", update)
			removeEventListener("resize", update)
		}
	}, [ids])

	return active
}
