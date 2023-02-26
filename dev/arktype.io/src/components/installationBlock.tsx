import Code from "@theme/CodeBlock"
import TabItem from "@theme/TabItem"
import Tabs from "@theme/Tabs"
import React from "react"

export const InstallationBlock = () => (
    <Tabs className="codeBlock">
        <TabItem value="npm" label="npm" default>
            <Code language="bash">npm install arktype</Code>
        </TabItem>
        <TabItem value="pnpm" label="pnpm">
            <Code language="bash">pnpm add arktype</Code>
        </TabItem>
        <TabItem value="yarn" label="yarn">
            <Code language="bash">yarn add arktype</Code>
        </TabItem>
        <TabItem value="bun" label="bun">
            <Code language="bash">bun install arktype</Code>
        </TabItem>
        <TabItem value="deno" label="deno">
            <Code language="typescript">{`import { type } from "https://deno.land/x/arktype/main.ts"`}</Code>
        </TabItem>
    </Tabs>
)
