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
                        ArkType is a validation library that can infer
                        TypeScript definitions 1:1 and reuse them as
                        highly-optimized validators for your data at runtime.
                        With each character your type, your editor will show you
                        either: - a list of completions - a detailed ParseError
                        - a type-safe validator All powered by ArkType's
                        lightning-fast type-level parser- no plugins or
                        dependencies required.
                    </p>

                    {/* @blockEnd (these extra spaces are here so it stays on its own line) */}
                </Typography>
                <Features />
            </Stack>
        </main>
    )
}
