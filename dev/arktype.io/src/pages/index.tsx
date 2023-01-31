import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { Box, Container, Stack, ThemeProvider, Typography } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { Boat } from "../components/boat"
import { Features } from "../components/features"
import { Demo } from "../components/homepageDemo"
import { getTheme } from "../components/index"
import { LogoCloud } from "../components/logoCloud"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    return (
        <ThemeProvider theme={getTheme()}>
            <Header title={siteConfig.title} tagline={siteConfig.tagline} />
            <main
                style={{
                    position: "relative",
                    padding: "0 24px",
                    width: "100%"
                }}
            >
                <Container
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        minWidth: "100%",
                        position: "relative",
                        justifyContent: "center"
                    }}
                >
                    <Box
                        sx={{
                            margin: "0 auto",
                            minWidth: "500px",
                            maxWidth: "800px",
                            display: "flex",
                            justifyContent: {
                                xs: "center",
                                lg: "right"
                            },
                            flex: 3
                        }}
                    >
                        <img
                            style={{
                                height: "500px",
                                width: "800px"
                            }}
                            src="https://via.placeholder.com/800x500?text=Arktype.io+is+super+POOGERS"
                        />
                    </Box>
                </Container>
                <Features />
                <Demo />
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
            <Boat />
        </header>
    )
}
