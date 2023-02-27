import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { ThemeProvider } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { Contents } from "../components/contents.tsx"
import { Header } from "../components/header.tsx"
import { getTheme } from "../components/theme.tsx"

export default () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <ThemeProvider theme={getTheme()}>
                <Header title={siteConfig.title} tagline={siteConfig.tagline} />
                <Contents />
            </ThemeProvider>
        </Layout>
    )
}
