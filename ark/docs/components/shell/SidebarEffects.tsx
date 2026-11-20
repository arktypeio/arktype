"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

/** scrolls the current page's link in the server-rendered sidebar into view */
export const SidebarEffects = () => {
	const pathname = usePathname()

	useEffect(() => {
		const container = document.querySelector<HTMLElement>(".docs-sidebar")
		const link = container?.querySelector<HTMLElement>(
			".side-nav [aria-current='page']"
		)
		// on phones the sidebar is the drawer, which scrolls itself when it opens
		if (
			!container ||
			!link ||
			getComputedStyle(container).position !== "sticky"
		)
			return
		const top = link.offsetTop - container.scrollTop
		if (top < 72 || top > container.clientHeight - link.offsetHeight - 24)
			container.scrollTop = link.offsetTop - container.clientHeight / 3
	}, [pathname])

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const anchor =
				e.target instanceof Element ?
					e.target.closest<HTMLAnchorElement>(".prose .anchor")
				:	null
			if (!anchor) return
			const href = anchor.getAttribute("href")
			if (!href?.startsWith("#")) return
			const url = new URL(href, location.href).href
			void navigator.clipboard?.writeText(url).then(() => {
				anchor.dataset.copied = ""
				anchor.textContent = "✓"
				setTimeout(() => {
					delete anchor.dataset.copied
					anchor.textContent = "#"
				}, 1400)
			})
		}
		document.addEventListener("click", onClick)
		return () => document.removeEventListener("click", onClick)
	}, [])

	return null
}
