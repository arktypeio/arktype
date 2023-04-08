import { useColorMode } from "@docusaurus/theme-common"
import { Stack, Typography } from "@mui/material"
import React from "react"
import { Features } from "../components/features"
import { HomeDemo } from "./homeDemo"
import {
    FloatingInstallationBlock,
    MobileInstallationBlock
} from "./installationBlock"
import { useInstallationBlockShouldFloat } from "./useWindowSize"

export const Contents = () => {
    const { colorMode } = useColorMode()
    return (
        <main style={{ display: "flex", justifyContent: "center" }}>
            <Stack
                justifyContent="center"
                alignItems="center"
                padding="1rem 0rem 1rem"
                spacing={1}
                width="100%"
                maxWidth="60rem"
            >
                <HomeDemo />
                {useInstallationBlockShouldFloat() ? (
                    <FloatingInstallationBlock />
                ) : (
                    <MobileInstallationBlock />
                )}
                <Typography
                    color={
                        colorMode === "dark" ? "primary.light" : "primary.dark"
                    }
                    style={{ marginTop: "2rem", marginBottom: "2rem" }}
                    fontSize="1.3rem"
                >
                    {/* @blockFrom:README.md:intro */}

                    <p>
                        ArkType is a runtime validation library that can infer{" "}
                        <b>TypeScript definitions 1:1</b> and reuse them as{" "}
                        <b>highly-optimized validators</b> for your data.
                    </p>

                    <p>
                        With each character you type, you'll get{" "}
                        <b>immediate feedback from your editor</b> in the form
                        of either a fully-inferred <code>Type</code> or a
                        specific and helpful <code>ParseError</code>.
                    </p>

                    <p>
                        This result exactly mirrors what you can expect to
                        happen at runtime down to the punctuation of the error
                        message- <b>no plugins required</b>.
                    </p>

                    {/* @blockEnd (these extra spaces are here so it stays on its own line) */}
                </Typography>
                <Features />
            </Stack>
        </main>
    )
}
