import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { ThemeProvider, useMediaQuery } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { Contents } from "../components/contents"
import { Header } from "../components/header"
import { getTheme } from "../components/index"
import {
    FloatingInstallationBlock,
    InstallationBlock
} from "../components/installationBlock"

export default () => {
    const { siteConfig } = useDocusaurusContext()
    // Based on Docusaurus's mobile cutoff:
    // https://docusaurus.io/docs/styling-layout#mobile-view
    const isMobile = useMediaQuery("(max-width:996px)")
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <ThemeProvider theme={getTheme()}>
                <Header title={siteConfig.title} tagline={siteConfig.tagline} />
                {isMobile ? (
                    <InstallationBlock />
                ) : (
                    <FloatingInstallationBlock />
                )}
                <Contents />
            </ThemeProvider>
        </Layout>
    )
}
