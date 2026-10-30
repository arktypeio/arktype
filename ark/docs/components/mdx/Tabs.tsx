import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode
} from "react"
import { Pre, type PreProps } from "./CodeFrame.tsx"
import { TabGroup } from "./TabGroup.tsx"

export type TabsProps = {
	/** tab labels, in order */
	items: readonly string[]
	/** tabs with the same groupId switch together */
	groupId?: string
	/** remember the group's choice across pages and visits (needs groupId) */
	persist?: boolean
	children: ReactNode
}

export type TabProps = {
	/** the label from `items` this tab is for; defaults to the tab's position */
	value?: string
	children: ReactNode
}

/** a tab's content, only meaningful inside Tabs */
export const Tab = ({ children }: TabProps) => <>{children}</>

/**
 * A panel's code block without its frame, when the panel is nothing else,
 * so a group of code blocks shares one frame with the tabs in its header.
 */
const bareCodeOf = (content: ReactNode): ReactElement | undefined => {
	const nodes = Children.toArray(content).filter(
		node => typeof node !== "string" || node.trim()
	)
	const [only] = nodes
	if (nodes.length !== 1 || !isValidElement<PreProps>(only)) return
	if (only.type !== Pre || !only.props["data-lang"]) return
	const { "data-title": _, ...props } = only.props
	return <pre {...props} />
}

/** panels as code-only content when every one of them is a lone code block */
export const tabPanelsOf = (contents: readonly ReactNode[]) => {
	const bare = contents.map(bareCodeOf)
	return bare.every(Boolean) ?
			{ code: true, panels: bare }
		:	{ code: false, panels: contents }
}

export const Tabs = ({ items, groupId, persist, children }: TabsProps) => {
	const tabs = Children.toArray(children).filter(
		(child): child is ReactElement<TabProps> => isValidElement(child)
	)
	const contents = items.map(
		(item, i) =>
			(tabs.find(tab => tab.props.value === item) ?? tabs[i])?.props.children
	)
	const { code, panels } = tabPanelsOf(contents)
	return (
		<TabGroup
			labels={items}
			groupId={groupId}
			persist={persist}
			code={code}
			panels={panels}
		/>
	)
}
