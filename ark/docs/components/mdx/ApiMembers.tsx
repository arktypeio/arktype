import { Children, type ReactNode } from "react"

// <ApiTable group="..." /> is expanded into these by lib/content/expand.ts,
// with a heading per member so each has an id, a TOC entry and search hits

export const ApiMembers = ({ children }: { children: ReactNode }) => (
	<div className="api-members">{children}</div>
)

export type ApiMemberProps = {
	name: string
	group: string
	/** the last child is an example code block */
	example?: "true"
	children: ReactNode
}

export const ApiMember = ({ group, example, children }: ApiMemberProps) => {
	const [heading, ...rest] = Children.toArray(children).filter(
		child => typeof child !== "string" || child.trim()
	)
	const body = example ? rest.slice(0, -1) : rest
	return (
		<section className="api-row">
			<div className="api-head">
				{heading}
				<span className="api-group">{group}</span>
			</div>
			{body}
			{example && (
				<details className="api-ex">
					<summary>example</summary>
					{rest.at(-1)}
				</details>
			)}
		</section>
	)
}

export type ApiSignatureProps = {
	name: string
	/** a method's parameters; omitted for properties */
	params?: string | undefined
}

/** `.name(params)`, as a member reads after a Type */
export const ApiSignature = ({ name, params }: ApiSignatureProps) => (
	<code className="api-sig">
		<span className="api-dot">.</span>
		<span className="api-name">{name}</span>
		{params !== undefined && (
			<>
				<span className="api-paren">(</span>
				<i>{params}</i>
				<span className="api-paren">)</span>
			</>
		)}
	</code>
)
