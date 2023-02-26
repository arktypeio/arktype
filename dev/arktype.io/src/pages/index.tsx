import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import useIsBrowser from "@docusaurus/useIsBrowser"
import { Stack, ThemeProvider, Typography } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { Boat } from "../components/boat"
import { Features } from "../components/features"
import { getTheme } from "../components/index"
import { InstallationBlock } from "../components/installationBlock"
import { LogoCloud } from "../components/logoCloud"
import { ToggleableDemo } from "../components/toggleableDemo"

const Contents = () => {
    return (
        <Stack
            justifyContent="center"
            alignItems="center"
            spacing={1}
            padding={2}
            width="100%"
            maxWidth="1600px"
        >
            <video
                autoPlay
                loop
                muted
                style={{
                    maxWidth: "60em",
                    width: "100%",
                    borderRadius: "1rem",
                    zIndex: -2
                }}
                src="/img/arktype.mp4"
            />
            <Features />
            <ToggleableDemo embedId="type" />
        </Stack>
    )
}

export default () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <ThemeProvider theme={getTheme()}>
                <Header title={siteConfig.title} tagline={siteConfig.tagline} />
                <InstallationBlock />
                <main style={{ display: "flex", justifyContent: "center" }}>
                    <Contents />
                </main>
            </ThemeProvider>
        </Layout>
    )
}

const Header = ({ title, tagline }: Record<string, string>) => {
    return (
        <header
            style={{
                height: "10rem",
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
                    variant={
                        useIsBrowser() && window.screen.width < 1000
                            ? "h6"
                            : "h5"
                    }
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
