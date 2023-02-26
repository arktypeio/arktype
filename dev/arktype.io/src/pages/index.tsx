import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import useIsBrowser from "@docusaurus/useIsBrowser"
import { Grid, Stack, ThemeProvider, Typography, useTheme } from "@mui/material"
import useMediaQuery from "@mui/material/useMediaQuery"
import Layout from "@theme/Layout"
import React from "react"
import { Boat } from "../components/boat"
import { Features } from "../components/features"
import { getTheme } from "../components/index"
import { InstallationBlock } from "../components/installationBlock"
import { LogoCloud } from "../components/logoCloud"
import { ToggleableDemo } from "../components/toggleableDemo"

const Contents = () => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down("md"))
    return (
        <Stack
            justifyContent="center"
            alignItems="center"
            spacing={1}
            padding={2}
            width="100%"
            maxWidth="1600px"
        >
            <Grid container>
                <Grid xs={12} md={9}>
                    <video
                        autoPlay
                        loop
                        muted
                        style={{
                            maxWidth: "60em",
                            width: "100%",
                            borderRadius: "1rem"
                        }}
                        src="/img/arktype.mp4"
                    />
                </Grid>
                <Grid xs={12} md={3}>
                    <Stack
                        height="100%"
                        alignItems="center"
                        justifyContent="center"
                        spacing={4}
                    >
                        <div style={{ height: "auto" }} className="card">
                            <InstallationBlock />
                        </div>
                        <ToggleableDemo embedId="type" />
                    </Stack>
                </Grid>
            </Grid>
            <Features />
        </Stack>
    )
}

export default () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout title={siteConfig.title} description={siteConfig.tagline}>
            <ThemeProvider theme={getTheme()}>
                <Header title={siteConfig.title} tagline={siteConfig.tagline} />
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
                height: 180,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <Stack direction="row">
                <LogoCloud
                    names={["typescript", "vscode", "intellij", "vim"]}
                />
                {/* Invisible, uninteractable mirror of right to keep title center-aligned */}
                <div style={{ opacity: 0, zIndex: -1, marginLeft: "4rem" }}>
                    <InstallationBlock />
                </div>
            </Stack>
            <Stack
                direction="row"
                flexGrow={1}
                alignItems="center"
                justifyContent="center"
            >
                <Stack>
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
            </Stack>
            <Stack direction="row">
                <div style={{ marginRight: "4rem" }}>
                    <InstallationBlock />
                </div>
                <LogoCloud names={["javascript", "chromium", "node", "deno"]} />
            </Stack>
            <Boat />
        </header>
    )
}
