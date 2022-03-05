import React from "react"
import clsx from "clsx"
import * as Svgs from "./svg"
import styles from "./HomepageFeatures.module.css"

type ToolSummaryProps = {
    title: string
    illustration: JSX.Element
    description: JSX.Element
    upcoming?: boolean
}

const toolSummaries: ToolSummaryProps[] = [
    {
        title: "Model",
        illustration: <Svgs.Model />,
        description: <>Type-first validation from editor to runtime</>
    },
    {
        title: `State`,
        illustration: <Svgs.State />,
        description: <>Manageable states from simple shapes</>,
        upcoming: true
    },
    {
        title: "Test",
        illustration: <Svgs.Test />,
        description: <>Web testing that writes itself</>,
        upcoming: true
    }
]

const ToolSummary = ({
    title,
    illustration,
    description,
    upcoming
}: ToolSummaryProps) => (
    <div className={clsx("col col--4")}>
        <div className="text--center">{illustration}</div>
        <div className="text--center padding-horiz--md">
            <h3>
                {title}
                {upcoming ? <i> (coming soon)</i> : ""}
            </h3>
            <p>{description}</p>
        </div>
    </div>
)

export const ToolSummaries = () => (
    <section className={styles.features}>
        <div className="container">
            <div className="row">
                {toolSummaries.map((props, index) => (
                    <ToolSummary key={index} {...props} />
                ))}
            </div>
        </div>
    </section>
)
