import React from "react"
import Layout from "@theme/Layout"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { useColorMode } from "@docusaurus/theme-common"
import { AnimatedLogo, getTheme, ToolSummaries } from "../components"
import { ThemeProvider, Typography } from "@mui/material"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    const { colorMode } = useColorMode()
    const isDark = colorMode === "dark"
    return (
        <ThemeProvider theme={getTheme({ isDark })}>
            <header
                style={{
                    padding: "2rem 0",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                    background: isDark ? "#141414" : "#1b1b1b"
                }}
            >
                <AnimatedLogo style={{ height: 120 }} />
                <Typography
                    component="h2"
                    variant="h5"
                    className="hero__subtitle"
                    color="common.white"
                >
                    {siteConfig.tagline}
                </Typography>
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
