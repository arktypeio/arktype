import React from "react"
import clsx from "clsx"
import styles from "./HomepageFeatures.module.css"

type ToolSummaryProps = {
    title: string
    image: string
    description: JSX.Element
    upcoming?: boolean
}

const toolSummaries: ToolSummaryProps[] = [
    {
        title: "Model",
        image: "/img/model.svg",
        description: <>Type-first validation from editor to runtime</>
    },
    {
        title: `State`,
        image: "/img/state.svg",
        description: <>Manageable states from simple shapes</>,
        upcoming: true
    },
    {
        title: "Test",
        image: "/img/test.svg",
        description: <>Web testing that writes itself</>,
        upcoming: true
    }
]

const ToolSummary = ({
    title,
    image,
    description,
    upcoming
}: ToolSummaryProps) => (
    <div className={clsx("col col--4")}>
        <div className="text--center">
            <img className={styles.featureSvg} alt={title} src={image} />
        </div>
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
