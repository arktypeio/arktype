import { cx } from "class-variance-authority"
import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { CopyButton } from "./CopyButton.tsx"

export type CodeFrameProps = {
	title?: string | undefined
	className?: string | undefined
	style?: CSSProperties | undefined
	children: ReactNode
}

/**
 * The frame around a code block. With a title, a header holds it and the
 * copy button; without one, the copy button floats over the code.
 */
export const CodeFrame = ({
	title,
	className,
	style,
	children
}: CodeFrameProps) => (
	<figure className={cx("cb", className)} style={style}>
		{title ?
			<div className="cb-head">
				<span className="cb-title">{title}</span>
				<CopyButton />
			</div>
		:	<CopyButton />}
		{children}
	</figure>
)

export type PreProps = ComponentProps<"pre"> & {
	"data-title"?: string
	"data-lang"?: string
}

/**
 * MDX's `pre`, already highlighted by lib/content/highlight.ts. Only code
 * blocks get a frame; the `pre`s inside twoslash popups have no data-lang.
 */
export const Pre = ({
	"data-title": title,
	"data-lang": lang,
	...props
}: PreProps) =>
	lang ?
		<CodeFrame title={title}>
			<pre data-lang={lang} {...props} />
		</CodeFrame>
	:	<pre {...props} />
