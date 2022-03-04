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
        title: "Model",
        image: "/img/model.svg",
        description: <>Type-first validation from editor to runtime</>
    },
    {
        title: `State`,
        image: "/img/state.svg",
        description: <>Coming soon</>
    },
    {
        title: "Test",
        image: "/img/test.svg",
        description: <>Coming soon</>
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
