"use client"

import { useMonaco } from "@monaco-editor/react"
import { useEffect, useState } from "react"

/** highlights code with the playground's own Monaco, which is already loaded */
export const ColorizedCode = ({
	code,
	lang
}: {
	code: string
	lang: string
}) => {
	const monaco = useMonaco()
	const [html, setHtml] = useState<string>()

	useEffect(() => {
		if (!monaco) return
		let current = true
		monaco.editor
			.colorize(
				code,
				lang === "js" ? "javascript"
				: lang === "ts" ? "typescript"
				: lang,
				{}
			)
			.then(result => current && setHtml(result))
		return () => {
			current = false
		}
	}, [monaco, code, lang])

	return (
		<pre className="colorized-code" tabIndex={0}>
			{html ?
				<code dangerouslySetInnerHTML={{ __html: html }} />
			:	<code>{code}</code>}
		</pre>
	)
}
