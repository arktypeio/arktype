import React from "react"
import clsx from "clsx"
import * as Svgs from "./svg"
import { Button, Stack } from "@mui/material"

type ToolSummaryProps = {
    name: string
    illustration: JSX.Element
    description: JSX.Element
    upcoming?: boolean
}

const toolSummaries: ToolSummaryProps[] = [
    {
        name: "Model",
        illustration: <Svgs.Model />,
        description: <>Type-first validation from editor to runtime</>
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
        description: <>Web testing that writes itself</>,
        upcoming: true
    }
]

const ToolSummary = ({
    name,
    illustration,
    description,
    upcoming
}: ToolSummaryProps) => (
    <div className={clsx("col col--4")}>
        <div className="text--center">{illustration}</div>
        <div className="text--center padding-horiz--md">
            <h3>
                {name}
                {upcoming ? <i> (coming soon)</i> : ""}
            </h3>
            <p>{description}</p>
            <Stack spacing={2} direction="row" justifyContent="center">
                <Button variant="outlined" href={`/docs/${name}/intro`}>
                    Learn more
                </Button>
                {upcoming ? null : (
                    // TODO: Add live demo
                    <Button variant="contained" href={`/docs/${name}/intro`}>
                        Try it in 30 seconds ⏱️
                    </Button>
                )}
            </Stack>
        </div>
    </div>
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
            <div className="row">
                {toolSummaries.map((props, index) => (
                    <ToolSummary key={index} {...props} />
                ))}
            </div>
        </div>
    </section>
)
