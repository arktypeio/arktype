import { Card } from "@mui/material"
import Code from "@theme/CodeBlock"
import TabItem from "@theme/TabItem"
import Tabs from "@theme/Tabs"
import React from "react"

export const FloatingInstallationBlock = () => (
    <div style={{ position: "fixed", right: 0, top: 60 }}>
        <InstallationBlock />
    </div>
)

export const InstallationBlock = () => (
    <Card
        style={{
            height: "9rem",
            margin: ".5rem",
            padding: ".7rem .5rem 0rem",
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
                <Code language="bash">https://deno.land/x/arktype/main.ts</Code>
            </TabItem>
        </Tabs>
    </Card>
)
