import React from "react"
import clsx from "clsx"
import Layout from "@theme/Layout"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { useColorMode } from "@docusaurus/theme-common"
import styles from "./index.module.css"
import { getTheme, ToolSummaries } from "../components"
import { ThemeProvider, Typography } from "@mui/material"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    const { isDarkTheme } = useColorMode()
    return (
        <ThemeProvider theme={getTheme({ isDark: isDarkTheme })}>
            <header className={clsx("hero hero--primary", styles.heroBanner)}>
                <div className="container">
                    <Typography
                        component="h1"
                        variant="h2"
                        className="hero__title"
                        color="primary.light"
                        fontWeight="500"
                    >
                        {siteConfig.title}
                    </Typography>
                    <Typography
                        component="h2"
                        variant="h5"
                        className="hero__subtitle"
                        color="primary.light"
                    >
                        {siteConfig.tagline}
                    </Typography>
                </div>
            </header>
            <main>
                <ToolSummaries />
            </main>
        </ThemeProvider>
    )
}

export default () => {
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
