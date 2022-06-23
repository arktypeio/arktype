import { useColorMode } from "@docusaurus/theme-common"
import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import Terminal from "@mui/icons-material/Terminal"
import { Button, Container, Grid, Stack, Typography } from "@mui/material"
import React, { useState } from "react"
import { modelDemo } from "./demos/model"
import * as Svgs from "./svg"

type ToolSummaryData = {
    name: string
    illustration: JSX.Element
    description: JSX.Element
    demoElement?: JSX.Element
}

type ToolSummaryProps = ToolSummaryData & {
    activeDemo: JSX.Element | null
    setActiveDemo: (demo: JSX.Element | null) => void
}

const toolSummaries: ToolSummaryData[] = [
    {
        name: "Model",
        illustration: <Svgs.Model />,
        description: <>One definition from editor to runtime</>,
        demoElement: modelDemo
    },
    {
        name: "State (coming soon)",
        illustration: <Svgs.State />,
        description: <>Self-validating states from simple shapes</>
    },
    {
        name: "Test (coming soon)",
        illustration: <Svgs.Test />,
        description: <>Web testing that writes itself</>
    }
]

const ToolSummary = ({
    name,
    illustration,
    description,
    demoElement,
    setActiveDemo,
    activeDemo
}: ToolSummaryProps) => {
    const { colorMode } = useColorMode()
    const buttonColor = colorMode === "dark" ? "secondary" : "primary"
    const isActiveDemo = activeDemo === demoElement
    return (
        <>
            <div className="text--center">{illustration}</div>
            <div className="text--center">
                <Typography
                    component="h3"
                    variant="h5"
                    fontWeight="700"
                    color="primary"
                >
                    {name}
                </Typography>
                <Typography
                    component="p"
                    variant="body1"
                    fontWeight="300"
                    style={{ whiteSpace: "nowrap" }}
                >
                    {description}
                </Typography>
                <br />
                <Stack spacing={2} direction="row" justifyContent="center">
                    <Button
                        variant="outlined"
                        color={buttonColor}
                        href={`/${name}/intro`}
                        sx={{
                            whiteSpace: "nowrap"
                        }}
                    >
                        Learn more
                    </Button>
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                            display: {
                                xs: "none",
                                md: demoElement ? "inherit" : "none"
                            }
                        }}
                    >
                        <Typography component="p" variant="h6" fontWeight="300">
                            or
                        </Typography>
                        <Button
                            color={buttonColor}
                            variant="contained"
                            sx={{ whiteSpace: "nowrap" }}
                            onClick={() => {
                                setActiveDemo(
                                    isActiveDemo ? null : demoElement!
                                )
                            }}
                            endIcon={
                                <div style={{ display: "flex" }}>
                                    <Terminal />
                                    {isActiveDemo ? <Collapse /> : <Expand />}
                                </div>
                            }
                        >
                            {isActiveDemo ? "All done?" : "Try it here!"}
                        </Button>
                    </Stack>
                </Stack>
            </div>
        </>
    )
}

export const ToolSummaries = () => {
    const [activeDemo, setActiveDemo] = useState<null | JSX.Element>(null)
    return (
        <Container>
            <Grid container maxWidth="lg" direction="row">
                {toolSummaries.map((props, index) => (
                    <Grid item key={index} xs={12} md={4}>
                        <ToolSummary
                            {...props}
                            setActiveDemo={setActiveDemo}
                            activeDemo={activeDemo}
                        />
                    </Grid>
                ))}
            </Grid>
            {activeDemo}
        </Container>
    )
}
