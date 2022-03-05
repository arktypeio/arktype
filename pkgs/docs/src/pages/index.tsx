import React from "react"
import clsx from "clsx"
import Layout from "@theme/Layout"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import styles from "./index.module.css"
import { ToolSummaries } from "../components/ToolSummaries"
import { theme } from "./Theme"
import { ThemeProvider } from "@mui/material"

// TODO: Add
// https://docusaurus.io/docs/api/themes/configuration#use-color-mode

function HomepageHeader() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <header className={clsx("hero hero--primary", styles.heroBanner)}>
            <div className="container">
                <h1 className="hero__title">{siteConfig.title}</h1>
                <p className="hero__subtitle">{siteConfig.tagline}</p>
                <div className={styles.buttons}>
                    <Link
                        className="button button--secondary button--lg"
                        to="/docs/model/intro"
                    >
                        Tutorial - 5min ⏱️
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <ThemeProvider theme={theme}>
            <Layout
                title={`Hello from ${siteConfig.title}`}
                description="Description will go into a meta tag in <head />"
            >
                <HomepageHeader />
                <main>
                    <ToolSummaries />
                </main>
            </Layout>
        </ThemeProvider>
    )
}
