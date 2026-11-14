"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

/** parts of a twoslash block that aren't the code itself */
const decorations =
	".twoslash-popup-container, .twoslash-meta-line, .twoslash-completion-list, .query-block"

const visibleCodeOf = (frame: Element) =>
	[...frame.querySelectorAll(":scope > pre, :scope > .tab-panel > pre")].find(
		pre => pre.checkVisibility()
	)

/** copies the code a frame is showing, without hovers or `^?` results */
export const CopyButton = () => {
	const [copied, setCopied] = useState(false)
	const button = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!copied) return
		const timer = setTimeout(() => setCopied(false), 1600)
		return () => clearTimeout(timer)
	}, [copied])

	const copy = async () => {
		const frame = button.current?.closest(".cb")
		const pre = frame && visibleCodeOf(frame)
		if (!pre) return
		const clone = pre.cloneNode(true) as HTMLElement
		for (const node of clone.querySelectorAll(decorations)) node.remove()
		for (const node of clone.querySelectorAll<HTMLElement>("[data-indent]"))
			node.textContent = node.dataset.indent!
		await navigator.clipboard.writeText(clone.textContent ?? "")
		setCopied(true)
	}

	return (
		<button
			ref={button}
			type="button"
			className="cb-copy"
			data-state={copied ? "copied" : undefined}
			aria-label="Copy code"
			onClick={copy}
		>
			<span className="copy-face">
				<span className="copy-idle">
					<CopyIcon aria-hidden />
				</span>
				<span className="copy-done">
					<CheckIcon aria-hidden />
					copied
				</span>
			</span>
			<span role="status" className="visually-hidden">
				{copied ? "Copied" : ""}
			</span>
		</button>
	)
}
