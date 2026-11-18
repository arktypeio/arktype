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

	return null
}
