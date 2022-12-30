import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { Stack, ThemeProvider, Typography, Box, Container } from "@mui/material"
import Layout from "@theme/Layout"
import React from "react"
import { Ark } from "../components/ark"
import { Demo } from "../components/homepageDemo"
import { getTheme } from "../components/index"
import { LogoCloud } from "../components/logoCloud"
import { Features2 } from "../components/features2"
import { Features } from "../components/features"

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
                            marginRight: "0 auto",
                            padding: "10px",
                            minWidth: "500px",
                            maxWidth: "850px",
                            flex: 1
                        }}
                    >
                        <Typography component="h1" variant="h2">
                            Taking <b>Type Safety</b> to new limits!
                        </Typography>
                        <Typography component="h1" variant="h5">
                            Arktype utilizes TypeScript-like syntax to perform a
                            variety of tasks, including inferring, validating,
                            and more, from a single definition. It allows
                            developers to define the structure and behavior of
                            their code in a clear and concise manner, making it
                            easier to create and maintain complex software
                            systems.
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            margin: "0 auto",
                            minWidth: "500px",
                            maxWidth: "800px",
                            display: "flex",
                            //TODOSHAWN: investigate up()
                            justifyContent: {
                                xs: "center",
                                sm: "center",
                                md: "center",
                                lg: "right",
                                xl: "right"
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
                {/* <Features/> */}
                <Features2 />
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
            <Ark />
        </header>
    )
}
