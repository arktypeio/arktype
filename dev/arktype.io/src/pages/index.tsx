import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { Stack, ThemeProvider, Typography } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { Boat } from "../components/boat"
import { Features } from "../components/features"
import { Demo } from "../components/homepageDemo"
import { getTheme } from "../components/index"
import { LogoCloud } from "../components/logoCloud"
import { isMobile } from "../components/util"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <ThemeProvider theme={getTheme()}>
            <Header title={siteConfig.title} tagline={siteConfig.tagline} />
            <main>
                <Stack alignItems="center" spacing={1} padding={2}>
                    <img
                        style={{
                            maxWidth: "60em",
                            width: "100%",
                            borderRadius: 8
                        }}
                        src="/img/arktype.gif"
                    />
                    <Features />
                    <Demo />
                </Stack>
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
                <Typography
                    component="h2"
                    variant={isMobile() ? "h6" : "h5"}
                    color="common.white"
                    style={{
                        whiteSpace: "nowrap"
                    }}
                >
                    {tagline}
                </Typography>
            </Stack>
            <LogoCloud names={["javascript", "chromium", "node", "deno"]} />
            <Boat />
        </header>
    )
}
