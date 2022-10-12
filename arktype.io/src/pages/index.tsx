import { useColorMode } from "@docusaurus/theme-common"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { Container, Stack, ThemeProvider, Typography } from "@mui/material"
import Layout from "@theme/Layout"
import { motion } from "framer-motion"
import React, { useState } from "react"
import { StackBlitzDemo } from "../../docs/demos"
import { getTheme } from "../components"
import { AT } from "../components/svg/at"
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
const Logo = ({ title, tagline }: Record<string, string>) => {
    return (
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
                width={600}
                justifyContent="space-between"
                alignContent="center"
            >
                <motion.div
                    style={{ height: 75, width: 75 }}
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 0.5, 0]
                    }}
                    transition={{ delay: 1, duration: 3 }}
                >
                    <TS />
                </motion.div>
                <AnimatedTagline tagline={tagline} />
                <motion.div
                    style={{ height: 75, width: 75 }}
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 0.5, 0]
                    }}
                    transition={{ delay: 1, duration: 3 }}
                >
                    <JS />
                </motion.div>
            </Stack>
            <motion.div
                style={{ position: "absolute", height: 255 }}
                initial={{ y: -20, x: -100 }}
                animate={{
                    x: 125
                }}
                transition={{
                    delay: 1,
                    duration: 3,
                    ease: "easeInOut"
                }}
            >
                <motion.div
                    style={{ height: "100%" }}
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 0.5, 0]
                    }}
                    transition={{
                        delay: 1,
                        duration: 3
                    }}
                >
                    <Boat />
                </motion.div>
            </motion.div>
        </header>
    )
}

type AnimatedTaglineProps = {
    tagline: string
}

// eslint-disable-next-line max-lines-per-function
const AnimatedTagline = ({ tagline }: AnimatedTaglineProps) => {
    return (
        <div style={{ height: "100%" }}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{
                    opacity: 1
                }}
                transition={{ delay: 4 }}
            >
                <Typography component="h2" variant="h5" color="common.white">
                    {tagline}
                </Typography>
            </motion.div>
        </div>
    )
}
