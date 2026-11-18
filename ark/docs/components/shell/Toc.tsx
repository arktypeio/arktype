"use client"

import { ChevronDownIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { TocEntry } from "../../lib/content/headings.ts"
import { CopyFace, CopyStatus, useCopyMarkdown } from "./CopyPage.tsx"
import { useScrollspy } from "./scrollspy.ts"

const useActiveEntry = (entries: TocEntry[]) =>
	useScrollspy(useMemo(() => entries.map(entry => entry.id), [entries]))

/** the shallowest heading depth, so a page of only H3s doesn't render as all subs */
const topDepth = (entries: TocEntry[]) =>
	Math.min(...entries.map(entry => entry.depth))

const TocLinks = ({
	entries,
	active,
	onSelect
}: {
	entries: TocEntry[]
	active: number
	onSelect?: () => void
}) => {
	const top = topDepth(entries)
	return entries.map((entry, i) => (
		<li key={entry.id} className={entry.depth > top ? "sub" : undefined}>
			<a
				href={`#${entry.id}`}
				aria-current={i === active ? "true" : undefined}
				onClick={onSelect}
			>
				{entry.title}
			</a>
		</li>
	))
}

export type TocProps = {
	entries: TocEntry[]
	markdownUrl: string
	editUrl: string
}

/** the desktop "On this page" column, with a rail on the heading being read */
export const Toc = ({ entries, markdownUrl, editUrl }: TocProps) => {
	const active = useActiveEntry(entries)
	const list = useRef<HTMLOListElement>(null)
	const rail = useRef<HTMLSpanElement>(null)
	const { result, copy } = useCopyMarkdown(markdownUrl)

	useLayoutEffect(() => {
		const link = list.current?.querySelectorAll("a")[active]
		if (!link || !rail.current) return
		rail.current.style.setProperty("--y", `${link.offsetTop + 4}px`)
		rail.current.style.setProperty("--h", `${link.offsetHeight - 8}px`)
		const container = link.closest<HTMLElement>(".docs-toc")
		if (!container) return
		const top =
			link.getBoundingClientRect().top - container.getBoundingClientRect().top
		if (top < 72 || top > container.clientHeight - link.offsetHeight - 24)
			container.scrollTop += top - container.clientHeight / 3
	}, [active])

	return (
		<nav className="toc" aria-labelledby="toc-label">
			{entries.length > 0 && (
				<>
					<p className="toc-label" id="toc-label">
						On this page
					</p>
					<div className="toc-track">
						<ol className="toc-list" ref={list}>
							<TocLinks entries={entries} active={active} />
						</ol>
						<span className="toc-rail" ref={rail} aria-hidden />
					</div>
				</>
			)}
			<div className="toc-foot">
				<button type="button" onClick={copy}>
					<CopyFace result={result} />
				</button>
				<a href={markdownUrl}>View as Markdown</a>
				<a className="ext" href={editUrl} target="_blank" rel="noreferrer">
					Edit on GitHub
				</a>
				<a href="#main">Back to top ↑</a>
				<CopyStatus result={result} />
			</div>
		</nav>
	)
}

/** the "On this page" bar above the article below the desktop breakpoint */
export const MobileToc = ({ entries }: { entries: TocEntry[] }) => {
	const active = useActiveEntry(entries)
	const [open, setOpen] = useState(false)
	const bar = useRef<HTMLDivElement>(null)
	const button = useRef<HTMLButtonElement>(null)
	const list = useRef<HTMLOListElement>(null)
	const pathname = usePathname()

	useEffect(() => setOpen(false), [pathname])

	useEffect(() => {
		const article = document.querySelector<HTMLElement>(".docs-article")
		const element = bar.current
		if (!article || !element) return
		const update = () => {
			const rect = article.getBoundingClientRect()
			const read = -rect.top / Math.max(1, rect.height - innerHeight)
			element.style.setProperty(
				"--progress",
				Math.min(1, Math.max(0, read)).toFixed(3)
			)
		}
		update()
		addEventListener("scroll", update, { passive: true })
		addEventListener("resize", update)
		return () => {
			removeEventListener("scroll", update)
			removeEventListener("resize", update)
		}
	}, [])

	useLayoutEffect(() => {
		const element = list.current
		const link = element?.querySelector<HTMLElement>("[aria-current]")
		if (!open || !element || !link) return
		element.scrollTop =
			link.offsetTop - (element.clientHeight - link.offsetHeight) / 2
	}, [open])

	useEffect(() => {
		if (!open) return
		const onPointerDown = (e: PointerEvent) => {
			if (!bar.current?.contains(e.target as Node)) setOpen(false)
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return
			if (bar.current?.contains(document.activeElement)) button.current?.focus()
			setOpen(false)
		}
		document.addEventListener("pointerdown", onPointerDown)
		document.addEventListener("keydown", onKeyDown)
		return () => {
			document.removeEventListener("pointerdown", onPointerDown)
			document.removeEventListener("keydown", onKeyDown)
		}
	}, [open])

	const top = topDepth(entries)
	const entry = entries[active]
	let parent = active
	while (parent > 0 && entries[parent].depth > top) parent--
	const current =
		entry && entry.depth > top && parent !== active ?
			`${entries[parent].title} · ${entry.title}`
		:	entry?.title

	return (
		<div className="mtoc" ref={bar}>
			<button
				ref={button}
				type="button"
				className="mtoc-btn"
				aria-expanded={open}
				aria-controls="mtoc-list"
				onClick={() => setOpen(!open)}
			>
				<span className="mtoc-label">On this page</span>
				<span className="mtoc-current">{current}</span>
				<ChevronDownIcon aria-hidden />
			</button>
			<ol className="mtoc-list" id="mtoc-list" ref={list} hidden={!open}>
				<TocLinks
					entries={entries}
					active={active}
					onSelect={() => setOpen(false)}
				/>
			</ol>
			<span className="mtoc-progress" aria-hidden />
		</div>
	)
}
