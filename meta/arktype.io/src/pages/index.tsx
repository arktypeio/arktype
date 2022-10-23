import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { Stack, ThemeProvider, Typography } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { StackBlitzDemo } from "../../docs/demos/index"
import { Ark } from "../components/ark"
import { Features } from "../components/features"
import { getTheme } from "../components/index"
import { LogoCloud } from "../components/logoCloud"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <ThemeProvider theme={getTheme()}>
            <Header title={siteConfig.title} tagline={siteConfig.tagline} />
            <main style={{ maxWidth: "100vw" }}>
                <StackBlitzDemo embedId="type" />
                <Features />
            </main>
        </ThemeProvider>
    )
}

export default () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <Contents />
        </Layout>
    )
}

const Header = ({ title, tagline }: Record<string, string>) => {
    return (
        <header
            style={{
                height: 180,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <LogoCloud names={["typescript", "vscode", "intellij", "vim"]} />
            <Stack flexGrow={1}>
                <Typography component="h1" variant="h2" color="secondary">
                    {title}
                </Typography>
                <Typography component="h2" variant="h5" color="common.white">
                    {tagline}
                </Typography>
            </Stack>
            <LogoCloud names={["javascript", "chromium", "node", "deno"]} />
            <Ark />
        </header>
    )
}
