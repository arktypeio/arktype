import React from "react"
import clsx from "clsx"
import Layout from "@theme/Layout"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { useColorMode } from "@docusaurus/theme-common"
import styles from "./index.module.css"
import { getTheme, ToolSummaries } from "../components"
import { ThemeProvider } from "@mui/material"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    const { isDarkTheme } = useColorMode()
    return (
        <ThemeProvider theme={getTheme({ isDark: isDarkTheme })}>
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
            <main>
                <ToolSummaries />
            </main>
        </ThemeProvider>
    )
}

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`Hello from ${siteConfig.title}`}
            description="Description will go into a meta tag in <head />"
        >
            <Contents />
        </Layout>
    )
}
