import { useColorMode } from "@docusaurus/theme-common"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { ThemeProvider, Typography } from "@mui/material"
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

const Logo = ({ title, tagline }: Record<string, string>) => (
    <header>
        <div className="logo">
            <motion.div className="logoContainer">
                <motion.div
                    animate={{ y: 50 }}
                    transition={{ duration: 2, delay: 6, ease: "easeIn" }}
                >
                    <Typography
                        component="h1"
                        variant="h3"
                        color="common.white"
                        id="title"
                    >
                        {title}
                    </Typography>
                    <Typography
                        component="h2"
                        variant="h5"
                        color="common.white"
                        id="tagline"
                    >
                        {tagline}
                    </Typography>
                </motion.div>
                <Animation />
            </motion.div>
        </div>
    </header>
)

const Animation = () => (
    <motion.div animate={{ opacity: 0 }} transition={{ delay: 7 }}>
        <TS />
        <JS />
        <Boat />
    </motion.div>
)
