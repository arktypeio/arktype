import React from "react"
import clsx from "clsx"
import styles from "./HomepageFeatures.module.css"

type FeatureItem = {
    title: string
    image: string
    description: JSX.Element
}

const FeatureList: FeatureItem[] = [
    {
        title: "Type-first validation",
        image: "/img/fast.svg",
        description: (
            <>Even the most complex TypeScript types are inferred accurately.</>
        )
    },
    {
        title: `JS/TS integrations "just work"`,
        image: "/img/integrations.svg",
        description: (
            <>Integrates seamlessly with the tools you're already using.</>
        )
    },
    {
        title: "100% open source",
        image: "/img/openSource.svg",
        description: <>Stop in any time and star our GitHub repo 😉</>
    }
]

function Feature({ title, image, description }: FeatureItem) {
    return (
        <div className={clsx("col col--4")}>
            <div className="text--center">
                <img className={styles.featureSvg} alt={title} src={image} />
            </div>
            <div className="text--center padding-horiz--md">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    )
}

export default function HomepageFeatures(): JSX.Element {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    )
}
