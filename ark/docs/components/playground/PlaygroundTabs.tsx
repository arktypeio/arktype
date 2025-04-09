"use client"

import { hasDomain, type dict } from "@ark/util"
import { cx } from "class-variance-authority"
import React, { Children, isValidElement, useMemo, useState } from "react"

interface TabProps {
	value: string
	children: React.ReactNode
}

export const Tab = (_: TabProps) => null

interface TabsProps {
	items: string[]
	children: React.ReactNode
	defaultTab?: string
	className?: string
	style?: React.CSSProperties
	tabListClassName?: string
	tabButtonClassName?: string
	activeTabButtonClassName?: string
	tabContentClassName?: string
}

export const Tabs = ({
	items,
	children,
	defaultTab,
	className,
	style,
	tabListClassName,
	tabButtonClassName,
	activeTabButtonClassName,
	tabContentClassName
}: TabsProps) => {
	const validChildren = useMemo(
		() =>
			Children.toArray(children).filter(
				(child): child is React.ReactElement<TabProps> =>
					isValidElement(child) &&
					hasDomain(child.props, "object") &&
					typeof (child.props as dict).value === "string"
			),
		[children]
	)

	const initialTab =
		defaultTab && items.includes(defaultTab) ? defaultTab : items[0]
	const [activeTab, setActiveTab] = useState<string>(initialTab)

	const activeTabContent = useMemo(() => {
		const activeChild = validChildren.find(
			child => child.props.value === activeTab
		)
		return activeChild ? activeChild.props.children : null
	}, [activeTab, validChildren])

	return (
		<div className={cx("flex flex-col", className)} style={style}>
			<div
				className={cx(
					"flex border-b border-border mb-4 flex-shrink-0",
					tabListClassName
				)}
				role="tablist"
			>
				{items.map(value => {
					const isActive = activeTab === value
					return (
						<button
							key={value}
							role="tab"
							aria-selected={isActive}
							aria-controls={`tabpanel-${value}`}
							id={`tab-${value}`}
							onClick={() => setActiveTab(value)}
							className={cx(
								"px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors duration-150 ease-in-out",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", // Focus styles
								isActive ?
									"border-primary text-primary"
								:	"border-transparent text-muted-foreground hover:border-border hover:text-foreground",
								tabButtonClassName,
								isActive && activeTabButtonClassName
							)}
						>
							{value}
						</button>
					)
				})}
			</div>
			<div
				role="tabpanel"
				id={`tabpanel-${activeTab}`}
				aria-labelledby={`tab-${activeTab}`}
				className={cx("flex-grow min-h-0 overflow-y-auto", tabContentClassName)}
			>
				{activeTabContent}
			</div>
		</div>
	)
}
