import Collapse from "@mui/icons-material/ExpandLess"
import Expand from "@mui/icons-material/ExpandMore"
import Terminal from "@mui/icons-material/Terminal"
import {
    Button,
    Container,
    Grid,
    Stack,
    Typography,
    useTheme
} from "@mui/material"
import React, { useRef, useState } from "react"
import { StackBlitzDemo } from "../../docs/type/demos/index"
import { MemoizedLoadingAnimation } from "./LoadingAnimation/LoadingAnimation"
import * as Svgs from "./svg"

type ToolSummaryData = {
    name: string
    illustration: JSX.Element
    description: JSX.Element
    demoElement?: JSX.Element
    comingSoon?: boolean
}

type ToolSummaryProps = ToolSummaryData & {
    buttonColor: "info"
    activeDemo: JSX.Element | null
    setActiveDemo: (demo: JSX.Element | null) => void
    setLoading: (isLoading: boolean) => void
    demoRef: React.MutableRefObject<null | HTMLSpanElement>
}

const toolSummaries: ToolSummaryData[] = [
    {
        name: "Type",
        illustration: <Svgs.Type />,
        description: <>One definition from editor to runtime</>,
        demoElement: <StackBlitzDemo embedId="type" />
    },
    {
        name: "Assert",
        illustration: <Svgs.Assert />,
        description: <>Seamless testing for types and code</>,
        comingSoon: true
    }
]

export const ToolSummaries = () => {
    const [activeDemo, setActiveDemo] = useState<null | JSX.Element>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const ref = useRef<null | HTMLSpanElement>(null)
    return (
        <Container maxWidth="xl">
            <Grid container direction="row">
                {toolSummaries.map((summaryData, index) => (
                    <Grid item key={index} xs={12} md={6}>
                        <ToolSummary
                            {...summaryData}
                            buttonColor={"info"}
                            setActiveDemo={setActiveDemo}
                            setLoading={setLoading}
                            activeDemo={activeDemo}
                            demoRef={ref}
                        />
                    </Grid>
                ))}
            </Grid>
            <Container style={{ height: "100%", position: "relative" }}>
                {loading && <MemoizedLoadingAnimation />}
                <span ref={ref} style={{ opacity: loading ? 0 : 100 }}>
                    {activeDemo}
                </span>
            </Container>
        </Container>
    )
}
const ToolSummary = (props: ToolSummaryProps) => {
    return (
        <div className="text--center" style={{ marginBottom: "1em" }}>
            <div>{props.illustration}</div>
            <ToolText {...props} />
            <ToolActions {...props} />
        </div>
    )
}

const ToolText = (props: ToolSummaryProps) => {
    const theme = useTheme()
    return (
        <>
            <Typography
                component="h3"
                variant="h5"
                fontWeight="700"
                color={theme.palette.info.main}
            >
                {`${props.name}${props.comingSoon ? " (coming soon)" : ""}`}
            </Typography>
            <Typography
                component="p"
                variant="body1"
                fontWeight="300"
                style={{ whiteSpace: "nowrap" }}
            >
                {props.description}
            </Typography>
            <br />
        </>
    )
}

const ToolActions = (props: ToolSummaryProps) => {
    return (
        <Stack spacing={2} direction="row" justifyContent="center">
            <Button
                variant="outlined"
                color={props.buttonColor}
                href={`/${props.name.toLowerCase()}`}
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
                        md: props.demoElement ? "inherit" : "none"
                    }
                }}
            >
                <Typography component="p" variant="h6" fontWeight="300">
                    or
                </Typography>
                <DemoButton {...props} />
            </Stack>
        </Stack>
    )
}

const DemoButton = (props: ToolSummaryProps) => {
    const isActiveDemo = props.activeDemo === props.demoElement
    return (
        <Button
            color={props.buttonColor}
            variant="contained"
            sx={{ whiteSpace: "nowrap" }}
            onClick={() => {
                setTimeout(() => {
                    props.setLoading(false)
                }, 3000)
                props.setLoading(isActiveDemo ? false : true)
                props.setActiveDemo(isActiveDemo ? null : props.demoElement!)
                setTimeout(() => {
                    props.demoRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "end"
                    })
                }, 1)
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
    )
}
