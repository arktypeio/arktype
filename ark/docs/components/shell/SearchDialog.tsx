"use client"

import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { SearchInput } from "./SearchInput.tsx"
import { closePopups, openSearchEvent } from "./searchEvents.ts"

const loadPanel = () => import("./SearchPanel.tsx")

/** starts loading the panel and index early, e.g. when a pointer nears a search button */
export const preloadSearch = (): void =>
	void loadPanel().then(module => module.load().catch(() => {}))

const SearchPanel = lazy(() =>
	loadPanel().then(module => ({ default: module.SearchPanel }))
)

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

const focusableSelector =
	"input, button:not([tabindex='-1']), a[href]:not([tabindex='-1'])"

/**
 * The site-wide search dialog, opened by ⌘K, Ctrl+K, / or a search button,
 * and on load by a `?search` query. Its panel, MiniSearch and the index load
 * on first open.
 */
export const SearchDialog = () => {
	const dialog = useRef<HTMLDialogElement>(null)
	const opener = useRef<Element | null>(null)
	// the panel keeps its query between opens, unless one is opened with a new one
	const [session, setSession] = useState<{ id: number; query: string }>()
	// what is typed while the panel loads, which it starts from
	const [draft, setDraft] = useState("")
	const [entered, setEntered] = useState(false)
	const [moved, setMoved] = useState(0)

	useEffect(() => {
		const open = (query = "") => {
			const element = dialog.current
			if (!element || element.open) return
			closePopups()
			opener.current = document.activeElement
			setSession(previous =>
				previous && !query ? previous : { id: (previous?.id ?? 0) + 1, query }
			)
			setDraft(query)
			setEntered(false)
			setMoved(0)
			element.showModal()
		}
		const onOpen = (e: Event) =>
			open((e as CustomEvent<string | null>).detail ?? "")
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				if (dialog.current?.open) dialog.current.close()
				else open()
			} else if (e.key === "/" && !isTyping(e.target)) {
				e.preventDefault()
				open()
			}
		}
		window.addEventListener(openSearchEvent, onOpen)
		window.addEventListener("keydown", onKeyDown)
		if (new URLSearchParams(location.search).has("search")) open()
		return () => {
			window.removeEventListener(openSearchEvent, onOpen)
			window.removeEventListener("keydown", onKeyDown)
		}
	}, [])

	const close = () => dialog.current?.close()

	return (
		<dialog
			ref={dialog}
			className="search"
			aria-label="Search docs"
			onClose={() => {
				if (opener.current instanceof HTMLElement)
					opener.current.focus({ preventScroll: true })
			}}
			onClick={e => {
				// a click on the backdrop targets the dialog itself
				if (e.target === e.currentTarget) close()
			}}
			onKeyDown={e => {
				// handled here: a search input would clear itself on Escape instead
				if (e.key === "Escape") {
					e.preventDefault()
					close()
				}
				if (e.key !== "Tab") return
				const focusable = [
					...e.currentTarget.querySelectorAll<HTMLElement>(focusableSelector)
				]
				const i = focusable.indexOf(document.activeElement as HTMLElement)
				const next =
					e.shiftKey ?
						i <= 0 ?
							focusable.at(-1)
						:	undefined
					: i === focusable.length - 1 ? focusable[0]
					: undefined
				if (next) {
					e.preventDefault()
					next.focus()
				}
			}}
		>
			{session && (
				<Suspense
					fallback={
						<div className="search-panel">
							<SearchInput
								value={draft}
								onChange={e => {
									setDraft(e.target.value)
									setEntered(false)
									setMoved(0)
								}}
								onKeyDown={e => {
									if (e.key === "Enter") setEntered(true)
									else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
										e.preventDefault()
										setMoved(n => n + (e.key === "ArrowDown" ? 1 : -1))
									}
								}}
								autoFocus
							/>
							<p className="sr-empty">Loading…</p>
						</div>
					}
				>
					<SearchPanel
						key={session.id}
						initialQuery={draft}
						entered={entered}
						moved={moved}
						close={close}
					/>
				</Suspense>
			)}
		</dialog>
	)
}
