import { useColorMode } from "@docusaurus/theme-common"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { ThemeProvider, Typography } from "@mui/material"
import sdk from "@stackblitz/sdk"
import Layout from "@theme/Layout"

import React from "react"
import { AnimatedLogo, getTheme, ToolSummaries } from "../components"

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
                    background: "#1b1b1b"
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
            <main style={{ background: isDark ? "#242424" : "white" }}>
                <ToolSummaries />
            </main>
        </ThemeProvider>
    )
}
export default () => {
    const { siteConfig } = useDocusaurusContext()
    enum Template {
        ts = "typescript",
        js = "javascript",
        html = "html"
    }
    const getEmbedOptions: any = () => {
        return {
            clickToLoad: false,
            view: "preview",
            height: "100%",
            width: "100%"
        }
    }
    const createStackblitzDemo = (
        files: Record<string, string>,
        title: string,
        description: string,
        template: Template,
        component: any
    ) => {
        sdk.openProject(
            {
                files,
                title,
                description,
                template,
                dependencies: {
                    "@re-/tools": "2.1.1",
                    "@re-/model": "2.0.3-alpha"
                }
            },
            getEmbedOptions()
        )
    }
    return (
        <Layout
            title={siteConfig.title}
            description="Type-first web development without limits"
        >
            <Contents />
        </Layout>
    )
}
