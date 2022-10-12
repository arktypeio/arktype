import { useColorMode } from "@docusaurus/theme-common"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { Stack, ThemeProvider, Typography } from "@mui/material"
import Layout from "@theme/Layout"
import { motion } from "framer-motion"
import React from "react"
import { StackBlitzDemo } from "../../docs/demos"
import { getTheme } from "../components"
import { Boat } from "../components/svg/boat"
import { JS } from "../components/svg/js"
import { TS } from "../components/svg/ts"

const Contents = () => {
    const { siteConfig } = useDocusaurusContext()
    const { colorMode } = useColorMode()
    const isDark = colorMode === "dark"
    return (
        <ThemeProvider theme={getTheme({ isDark })}>
            <Logo title={siteConfig.title} tagline={siteConfig.tagline} />
            <main>
                <StackBlitzDemo embedId="type" />
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

// eslint-disable-next-line max-lines-per-function
const Logo = ({ title, tagline }: Record<string, string>) => (
    <header
        style={{
            paddingTop: 20,
            height: 180,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
        }}
    >
        <Typography component="h1" variant="h2" color="common.white">
            {title}
        </Typography>
        <Stack
            direction="row"
            sx={{
                width: 600,
                justifyContent: "space-between",
                alignContent: "center"
            }}
        >
            <TS />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 6, duration: 1.5 }}
            >
                <Typography component="h2" variant="h5" color="common.white">
                    {tagline}
                </Typography>
            </motion.div>
            <JS />
        </Stack>
        <Boat />
    </header>
)
