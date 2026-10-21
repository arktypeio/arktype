import type { ReactNode } from "react"

/** numbered steps; each Step usually starts with a heading */
export const Steps = ({ children }: { children: ReactNode }) => (
	<ol className="steps">{children}</ol>
)

export const Step = ({ children }: { children: ReactNode }) => (
	<li className="step">{children}</li>
)
