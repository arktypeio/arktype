import React from "react"
import { select, boolean, number } from "@storybook/addon-knobs"
import { defaultTheme, ThemeProvider } from "../styles"
import { Card } from "../cards"
import { Row, Column } from "."

export default {
    title: "Layouts"
}

const getKnobProps = () => ({
    align: select(
        "align",
        {
            stretch: "stretch",
            center: "center",
            "flex-start": "flex-start",
            "flex-end": "flex-end",
            baseline: "baseline"
        },
        "flex-start"
    ),
    grow: boolean("grow", false),
    height: number("height", undefined as any),
    width: number("width", undefined as any),
    reverse: boolean("reverse", false),
    full: boolean("full", false),
    justify: select(
        "justify",
        {
            "flex-start": "flex-start",
            center: "center",
            "flex-end": "flex-end",
            "space-between": "space-between",
            "space-around": "space-around",
            "space-evenly": "space-evenly"
        },
        "flex-start"
    )
})

const argTypes = {
    align: {
        control: {
            type: "radio",
            options: ["stretch", "center", "flex-start", "flex-end", "baseline"]
        }
    },
    fontSize: { control: "number" },
    color: { control: "color" },
    grow: boolean("grow", false),
    height: number("height", undefined as any),
    width: number("width", undefined as any),
    reverse: boolean("reverse", false),
    full: boolean("full", false),
    justify: select(
        "justify",
        {
            "flex-start": "flex-start",
            center: "center",
            "flex-end": "flex-end",
            "space-between": "space-between",
            "space-around": "space-around",
            "space-evenly": "space-evenly"
        },
        "flex-start"
    )
}

const cards = (
    <>
        <Card>One</Card>
        <Card>Two</Card>
        <Card>Three</Card>
    </>
)

const Context = ({ children }: any) => (
    <ThemeProvider
        theme={{
            ...defaultTheme,
            overrides: {
                MuiGrid: {
                    container: {
                        border: `solid ${defaultTheme.palette.primary.main}`
                    }
                }
            }
        }}
    >
        <div style={{ height: "95vh", width: "95vw" }}>{children}</div>
    </ThemeProvider>
)

export const SingleRow = (props: any) => (
    <Context>
        <Row {...getKnobProps()}>{cards}</Row>
    </Context>
)

export const SingleColumn = (props: any) => (
    <Context>
        <Column {...getKnobProps()}>{cards}</Column>
    </Context>
)

export const RowOfColumns = (props: any) => (
    <Context>
        <Row {...getKnobProps()}>
            <Column {...getKnobProps()}>{cards}</Column>
            <Column {...getKnobProps()}>{cards}</Column>
            <Column {...getKnobProps()}>{cards}</Column>
        </Row>
    </Context>
)

export const RowOfRows = (props: any) => (
    <Context>
        <Row>
            <Row {...getKnobProps()}>{cards}</Row>
            <Row {...getKnobProps()}>{cards}</Row>
            <Row {...getKnobProps()}>{cards}</Row>
        </Row>
    </Context>
)

export const ColumnofRows = (props: any) => (
    <Context>
        <Column {...getKnobProps()}>
            <Row {...getKnobProps()}>{cards}</Row>
            <Row {...getKnobProps()}>{cards}</Row>
            <Row {...getKnobProps()}>{cards}</Row>
        </Column>
    </Context>
)

export const ColumnOfColumns = (props: any) => (
    <Context>
        <Column {...getKnobProps()}>
            <Column {...getKnobProps()}>{cards}</Column>
            <Column {...getKnobProps()}>{cards}</Column>
            <Column {...getKnobProps()}>{cards}</Column>
        </Column>
    </Context>
)

export const StandardLayout = (props: any) => (
    <Context>
        <Row full>
            <Column width={100} full>
                Sidebar
            </Column>
            <Column grow full>
                <Row height={100}>Header</Row>
                <Row grow>
                    <Column full align="center" justify="space-between">
                        <p>Left content</p>
                        {cards}
                    </Column>
                    <Column full align="center">
                        <p>Right content</p>
                        <Row grow justify="center" align="center">
                            <Card>More content</Card>
                        </Row>
                    </Column>
                </Row>
                <Row height={50}>Footer</Row>
            </Column>
        </Row>
    </Context>
)

export const ResponsiveLayout = (props: any) => (
    <Context>
        <Row wrap="wrap">
            <Row md={4} justify="space-around">
                <Card>Try</Card>
            </Row>
            <Row md={4} justify="space-around">
                <Card>Resizing</Card>
            </Row>
            <Row md={4} justify="space-around">
                <Card>Your window</Card>
            </Row>
        </Row>
    </Context>
)
