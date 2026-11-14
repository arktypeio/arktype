"use client"

import { MenuIcon, XIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Brand } from "./Brand.tsx"
import { menuButtonId, setDrawerOpen, useDrawerOpen } from "./drawer.ts"
import { closePopups } from "./searchEvents.ts"

const phoneQuery = "(max-width: 900px)"

const useIsPhone = () => {
	const [phone, setPhone] = useState(false)
	useEffect(() => {
		const query = matchMedia(phoneQuery)
		const update = () => setPhone(query.matches)
		update()
		query.addEventListener("change", update)
		return () => query.removeEventListener("change", update)
	}, [])
	return phone
}

/** the top nav's menu button, which opens the drawer on phones */
export const MenuButton = () => (
	<button
		type="button"
		id={menuButtonId}
		className="tb-icon tb-menu"
		aria-label="Open navigation"
		aria-controls="drawer"
		aria-expanded={useDrawerOpen()}
		onClick={() => setDrawerOpen(true)}
	>
		<MenuIcon aria-hidden />
	</button>
)

/** what the open drawer covers, which can't take focus while it is open */
const backgroundSelector = ".skip, .topbar, #main"

/**
 * The docs sidebar, which becomes a modal drawer on phones. Closed, it is
 * hidden and inert there, so its links never take focus off screen.
 */
export const Drawer = ({ children }: { children: ReactNode }) => {
	const open = useDrawerOpen()
	const phone = useIsPhone()
	const modal = phone && open
	const pathname = usePathname()
	const closeButton = useRef<HTMLButtonElement>(null)
	const drawer = useRef<HTMLElement>(null)
	const refocusMenuButton = useRef(false)

	const close = () => {
		refocusMenuButton.current = true
		setDrawerOpen(false)
	}

	useEffect(() => setDrawerOpen(false), [pathname])

	useEffect(() => {
		if (!phone) setDrawerOpen(false)
	}, [phone])

	useEffect(() => {
		document.documentElement.toggleAttribute("data-drawer-open", open)
		if (!open) return
		closePopups()
		drawer.current
			?.querySelector(".side-nav [aria-current='page']")
			?.scrollIntoView({ block: "nearest" })
		closeButton.current?.focus({ preventScroll: true })
	}, [open])

	useEffect(() => {
		if (!modal) return
		const background = [
			...document.querySelectorAll<HTMLElement>(backgroundSelector)
		]
		for (const element of background) element.inert = true
		return () => {
			for (const element of background) element.inert = false
			if (!refocusMenuButton.current) return
			refocusMenuButton.current = false
			document.getElementById(menuButtonId)?.focus({ preventScroll: true })
		}
	}, [modal])

	return (
		<>
			<aside
				ref={drawer}
				id="drawer"
				className="docs-sidebar"
				aria-label="Docs navigation"
				role={modal ? "dialog" : undefined}
				aria-modal={modal || undefined}
				data-open={open || undefined}
				inert={phone && !open}
				onKeyDown={e => {
					if (e.key === "Escape" && open) close()
				}}
			>
				<div className="drawer-head">
					<Brand />
					<button
						ref={closeButton}
						type="button"
						className="tb-icon"
						aria-label="Close navigation"
						onClick={close}
					>
						<XIcon aria-hidden />
					</button>
				</div>
				{children}
			</aside>
			<div className="scrim" data-open={open || undefined} onClick={close} />
		</>
	)
}
