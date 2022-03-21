import React from "react"
import clsx from "clsx"
import * as Svgs from "./svg"
import { Box, Button, Stack, Typography } from "@mui/material"
import { modelDemo } from "./demos"

type ToolSummaryProps = {
    name: string
    illustration: JSX.Element
    description: JSX.Element
    upcoming?: boolean
    demo?: string
}

const toolSummaries: ToolSummaryProps[] = [
    {
        name: "Model",
        illustration: <Svgs.Model />,
        description: <>Type-first validation from editor to runtime</>,
        demo: "https://stackblitz.com/edit/re-model?embed=1&file=model.ts&hideDevTools=1&hideExplorer=1&hideNavigation=1&theme=dark"
    },
    {
        name: "State",
        illustration: <Svgs.State />,
        description: <>Manageable states from simple shapes</>,
        upcoming: true
    },
    {
        name: "Test",
        illustration: <Svgs.Test />,
        description: (
            <>
                Web testing that writes itself
                <br />
                <br />
            </>
        ),
        upcoming: true
    }
]

const ToolSummary = ({
    name,
    illustration,
    description,
    upcoming,
    demo
}: ToolSummaryProps) => (
    <Box
        className={clsx("col col--4")}
        style={
            demo
                ? {
                      marginBottom: -20,
                      borderRadius: 8
                  }
                : {}
        }
        sx={
            demo
                ? {
                      bgcolor: "activeDemo.activeColor"
                  }
                : {}
        }
    >
        <div className="text--center">{illustration}</div>
        <div className="text--center padding-horiz--md">
            <Typography
                component="h3"
                variant="h5"
                color={demo && "activeDemo.activeText"}
                fontWeight="700"
            >
                {name}
                {upcoming ? <i> (coming soon)</i> : ""}
            </Typography>
            <Typography
                component="p"
                variant="h6"
                color={demo && "activeDemo.activeText"}
                fontWeight="300"
            >
                {description}
            </Typography>
            <br />
            <Stack spacing={2} direction="row" justifyContent="center">
                <Button
                    variant="outlined"
                    href={`/docs/${name}/intro`}
                    style={{ whiteSpace: "nowrap" }}
                >
                    Learn more
                </Button>
                {demo ? (
                    <>
                        <Typography
                            component="p"
                            color={demo && "activeDemo.activeText"}
                            variant="h6"
                            fontWeight="300"
                        >
                            or
                        </Typography>
                        <Button
                            variant="contained"
                            style={{ whiteSpace: "nowrap" }}
                            onClick={() =>
                                document
                                    .getElementById("demo")
                                    ?.scrollIntoView({ behavior: "smooth" })
                            }
                        >
                            Try it out ⬇️
                        </Button>
                    </>
                ) : null}
            </Stack>
        </div>
    </Box>
)

export const ToolSummaries = () => (
    <section
        style={{
            display: "flex",
            alignItems: "center",
            padding: "2rem 0",
            width: "100%",
            fontSize: "larger"
        }}
    >
        <div className="container">
            <div className="row" style={{ padding: 8 }}>
                {toolSummaries.map((props, index) => (
                    <ToolSummary key={index} {...props} />
                ))}
            </div>
            {modelDemo}
        </div>
    </section>
)
