"use client"

import { CheckIcon, ChevronDownIcon, CopyIcon, XIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

const resultFor = 1600

export type CopyResult = "copied" | "failed" | undefined

const fetchMarkdown = async (markdownUrl: string) => {
	const res = await fetch(markdownUrl)
	if (!res.ok) throw new Error(`${markdownUrl} responded ${res.status}`)
	return new Blob([await res.text()], { type: "text/plain" })
}

/**
 * Safari only allows a clipboard write within the click, which an awaited
 * fetch would outlast, so the fetch is handed to the clipboard as a promise
 */
const writeMarkdown = async (markdownUrl: string) => {
	const markdown = fetchMarkdown(markdownUrl)
	try {
		await navigator.clipboard.write([
			new ClipboardItem({ "text/plain": markdown })
		])
	} catch {
		await navigator.clipboard.writeText(await (await markdown).text())
	}
}

/** copies the page's Markdown, reporting the result for a moment after */
export const useCopyMarkdown = (markdownUrl: string) => {
	const [result, setResult] = useState<CopyResult>()
	const timeout = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(timeout.current), [])

	const copy = async () => {
		const next = await writeMarkdown(markdownUrl).then(
			() => "copied" as const,
			() => "failed" as const
		)
		setResult(next)
		clearTimeout(timeout.current)
		timeout.current = setTimeout(() => setResult(undefined), resultFor)
	}

	return { result, copy }
}

/** every state of "Copy page" in one grid cell, so the button never resizes */
export const CopyFace = ({ result }: { result: CopyResult }) => (
	<span className="copy-face" data-state={result}>
		<span className="copy-idle">
			<CopyIcon aria-hidden />
			<span className="copy-label">Copy page</span>
		</span>
		<span className="copy-done" aria-hidden>
			<CheckIcon aria-hidden />
			<span className="copy-label">Copied</span>
		</span>
		<span className="copy-failed" aria-hidden>
			<XIcon aria-hidden />
			<span className="copy-label">Failed</span>
		</span>
	</span>
)

export type CopyPageProps = {
	/** site-relative path to the page's Markdown, e.g. /docs/intro/setup.md */
	markdownUrl: string
}

const statusText = {
	copied: "Copied the page as Markdown",
	failed: "Couldn't copy the page"
}

export const CopyStatus = ({ result }: { result: CopyResult }) => (
	<span role="status" className="visually-hidden">
		{result && statusText[result]}
	</span>
)

/** a split button: copy the page as Markdown, or pick another way to read it */
export const CopyPage = ({ markdownUrl }: CopyPageProps) => {
	const { result, copy } = useCopyMarkdown(markdownUrl)
	const [open, setOpen] = useState(false)
	const root = useRef<HTMLDivElement>(null)
	const toggle = useRef<HTMLButtonElement>(null)
	const menu = useRef<HTMLDivElement>(null)
	const menuId = useId()

	const items = () => [...(menu.current?.querySelectorAll("a") ?? [])]

	const close = (refocus: boolean) => {
		setOpen(false)
		if (refocus) toggle.current?.focus()
	}

	useEffect(() => {
		if (!open) return
		items()[0]?.focus({ preventScroll: true })
		const onPointerDown = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener("pointerdown", onPointerDown)
		return () => document.removeEventListener("pointerdown", onPointerDown)
	}, [open])

	const prompt = `Read https://arktype.io${markdownUrl}, I want to ask questions about it.`

	const links = [
		{ name: "View as Markdown", hint: markdownUrl, href: markdownUrl },
		{
			name: "Open in Claude",
			hint: "ask about this page",
			href: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`
		},
		{
			name: "Open in ChatGPT",
			hint: "ask about this page",
			href: `https://chatgpt.com/?${new URLSearchParams({ prompt, hints: "search" })}`
		},
		{
			name: "Open in Cursor",
			hint: "add as context",
			href: `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt })}`
		}
	]

	return (
		<div className="copy-page" ref={root}>
			<button
				type="button"
				className="cp-main"
				aria-label="Copy page as Markdown"
				onClick={copy}
			>
				<CopyFace result={result} />
			</button>
			<button
				ref={toggle}
				type="button"
				className="cp-more"
				aria-label="More ways to use this page"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => setOpen(!open)}
			>
				<ChevronDownIcon aria-hidden />
			</button>
			<div
				ref={menu}
				id={menuId}
				role="menu"
				className="cp-menu"
				hidden={!open}
				onKeyDown={e => {
					const all = items()
					const i = all.indexOf(document.activeElement as HTMLAnchorElement)
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault()
						const step = e.key === "ArrowDown" ? 1 : -1
						all[(i + step + all.length) % all.length]?.focus()
					} else if (e.key === "Escape") close(true)
					else if (e.key === "Tab") close(false)
				}}
			>
				{links.map(link => (
					<a
						key={link.name}
						role="menuitem"
						href={link.href}
						tabIndex={-1}
						onClick={() => close(false)}
						{...(link.href.startsWith("http") && {
							target: "_blank",
							rel: "noreferrer"
						})}
					>
						<b>{link.name}</b>
						<span>{link.hint}</span>
					</a>
				))}
			</div>
			<CopyStatus result={result} />
		</div>
	)
}
