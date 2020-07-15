import React from "react"
import clsx from "clsx"
import Layout from "@theme/Layout"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { Column, DefaultTheme } from "@re-do/components"
import styles from "./styles.module.css"
import { Features, HowItWorks } from "../components"
import { features } from "../content"

export const Home = () => {
    const context = useDocusaurusContext()
    const { siteConfig = {} } = context
    return (
        <DefaultTheme>
            <Layout
                title={`Hello from ${siteConfig.title}`}
                description="Description will go into a meta tag in <head />"
            >
                <header
                    className={clsx("hero hero--primary", styles.heroBanner)}
                >
                    <div className="container">
                        <h1 className="hero__title">{siteConfig.title}</h1>
                        <p className="hero__subtitle">{siteConfig.tagline}</p>
                        <div className={styles.buttons}>
                            <Link
                                className={clsx(
                                    "button button--outline button--secondary button--lg",
                                    styles.getStarted
                                )}
                                to={useBaseUrl("docs/")}
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </header>
                <main style={{ display: "flex", justifyContent: "center" }}>
                    <Column width={1200}>
                        <Features content={features} />
                        <HowItWorks />
                    </Column>
                </main>
            </Layout>
        </DefaultTheme>
    )
}

export default Home
