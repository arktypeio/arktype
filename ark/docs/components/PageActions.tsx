"use client"

import { SiClaude, SiMarkdown, SiOpenai } from "@icons-pack/react-simple-icons"
import { CheckIcon, CopyIcon, MousePointerClickIcon } from "lucide-react"
import { useState } from "react"

export type PageActionsProps = {
	/** site-relative path to the page's Markdown, e.g. /docs/intro/setup.md */
	markdownUrl: string
}

const actionClassName =
	"inline-flex items-center gap-1.5 rounded-full border border-fd-border px-3 py-1 text-xs text-fd-muted-foreground transition-colors hover:border-white/60 hover:text-fd-foreground [&_svg]:size-3.5"

export const PageActions = ({ markdownUrl }: PageActionsProps) => {
	const [copied, setCopied] = useState(false)

	const copyMarkdown = async () => {
		const markdown = await fetch(markdownUrl).then(res => res.text())
		await navigator.clipboard.writeText(markdown)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	const prompt = `Read https://arktype.io${markdownUrl}, I want to ask questions about it.`

	const openIn = {
		Claude: {
			href: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`,
			icon: <SiClaude />
		},
		ChatGPT: {
			href: `https://chatgpt.com/?${new URLSearchParams({ prompt, hints: "search" })}`,
			icon: <SiOpenai />
		},
		Cursor: {
			href: `https://cursor.com/link/prompt?${new URLSearchParams({ text: prompt })}`,
			icon: <MousePointerClickIcon />
		}
	}

	return (
		<div className="not-prose flex flex-wrap gap-2">
			<button type="button" className={actionClassName} onClick={copyMarkdown}>
				{copied ?
					<CheckIcon />
				:	<CopyIcon />}
				Copy Markdown
			</button>
			<a className={actionClassName} href={markdownUrl}>
				<SiMarkdown />
				View Markdown
			</a>
			{Object.entries(openIn).map(([name, { href, icon }]) => (
				<a
					key={name}
					className={actionClassName}
					href={href}
					target="_blank"
					rel="noreferrer"
				>
					{icon}
					Open in {name}
				</a>
			))}
		</div>
	)
}
