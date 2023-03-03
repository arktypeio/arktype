import { Card } from "@mui/material"
import Code from "@theme/CodeBlock"
import TabItem from "@theme/TabItem"
import Tabs from "@theme/Tabs"
import { motion, useAnimation, useScroll } from "framer-motion"
import React from "react"

export const FloatingInstallationBlock = () => {
    const { scrollY } = useScroll()
    const controls = useAnimation()
    const initial = {
        position: "absolute",
        top: 60,
        width: 386
    } as const satisfies Parameters<(typeof controls)["start"]>[0]
    scrollY.onChange((value) => {
        controls.start(
            value ? { position: "fixed", top: "50%", width: 250 } : initial
        )
    })
    return (
        <motion.div style={{ right: 0 }} initial={initial} animate={controls}>
            <InstallationBlock />
        </motion.div>
    )
}

export const MobileInstallationBlock = () => (
    <div style={{ width: "100%" }}>
        <InstallationBlock />
    </div>
)

export const InstallationBlock = () => (
    <Card
        style={{
            height: "8rem",
            margin: ".5rem",
            padding: ".7rem 1rem 0rem",
            backgroundColor: "#ffffff00",
            backdropFilter: "blur(1px)",
            borderRadius: "2rem",
            zIndex: 1,
            fontFamily: `"Cascadia Code", sans-serif`
        }}
        elevation={8}
    >
        <Tabs className="installationTabs">
            <TabItem value="node" default>
                <Tabs className="subTabs">
                    <TabItem value="npm" attributes={{ className: "npmTab" }}>
                        <Code language="bash">npm install arktype</Code>
                    </TabItem>
                    <TabItem value="pnpm" attributes={{ className: "pnpmTab" }}>
                        <Code language="bash">pnpm add arktype</Code>
                    </TabItem>
                    <TabItem value="yarn" attributes={{ className: "yarnTab" }}>
                        <Code language="bash">yarn add arktype</Code>
                    </TabItem>
                </Tabs>
            </TabItem>
            <TabItem value="bun" label="bun">
                <Code language="bash">bun install arktype</Code>
            </TabItem>
            <TabItem value="deno" label="deno">
                <Code language="typescript">
                    {`import { type } from "https://deno.land/x/arktype/main.ts"`}
                </Code>
            </TabItem>
        </Tabs>
    </Card>
)
