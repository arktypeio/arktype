import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { defaultTheme } from "../styles"
import { Row, Column } from "."
import { Card } from "../cards"
import { withKnobs, select, boolean, number } from "@storybook/addon-knobs"

const getKnobProps = () => ({
    align: select("align", [
        "stretch",
        "center",
        "flex-start",
        "flex-end",
        "baseline"
    ]),
    grow: boolean("grow", false),
    height: number("height"),
    width: number("width"),
    reverse: boolean("reverse", false),
    full: boolean("full", false),
    justify: select("justify", [
        "flex-start",
        "center",
        "flex-end",
        "space-between",
        "space-around",
        "space-evenly"
    ])
})

const cards = (
    <>
        <Card>One</Card>
        <Card>Two</Card>
        <Card>Three</Card>
    </>
)

const C: FC = ({ children }) => (
    <div style={{ height: "95vh", width: "95vw" }}>{children}</div>
)

storiesOf("Layout", module)
    .addDecorator(withKnobs)
    .addDecorator(
        withTheme({
            ...defaultTheme,
            overrides: {
                MuiGrid: {
                    container: {
                        border: `solid ${defaultTheme.palette.primary.main}`
                    }
                }
            }
        })
    )
    .add("Row with knobs", () => (
        <C>
            <Row {...getKnobProps()}>{cards}</Row>
        </C>
    ))
    .add("Column with knobs", () => (
        <C>
            <Column {...getKnobProps()}>{cards}</Column>
        </C>
    ))
    .add("Row of cards", () => (
        <C>
            <Row {...getKnobProps()}>{cards}</Row>
        </C>
    ))
    .add("Column of cards", () => (
        <C>
            <Column {...getKnobProps()}>{cards}</Column>
        </C>
    ))
    .add("Row of columns", () => (
        <C>
            <Row {...getKnobProps()}>
                <Column {...getKnobProps()}>{cards}</Column>
                <Column {...getKnobProps()}>{cards}</Column>
                <Column {...getKnobProps()}>{cards}</Column>
            </Row>
        </C>
    ))
    .add("Row of rows", () => (
        <C>
            <Row>
                <Row {...getKnobProps()}>{cards}</Row>
                <Row {...getKnobProps()}>{cards}</Row>
                <Row {...getKnobProps()}>{cards}</Row>
            </Row>
        </C>
    ))
    .add("Column of rows", () => (
        <C>
            <Column {...getKnobProps()}>
                <Row {...getKnobProps()}>{cards}</Row>
                <Row {...getKnobProps()}>{cards}</Row>
                <Row {...getKnobProps()}>{cards}</Row>
            </Column>
        </C>
    ))
    .add("Column of columns", () => (
        <C>
            <Column {...getKnobProps()}>
                <Column {...getKnobProps()}>{cards}</Column>
                <Column {...getKnobProps()}>{cards}</Column>
                <Column {...getKnobProps()}>{cards}</Column>
            </Column>
        </C>
    ))
    .add("Page", () => (
        <C>
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
        </C>
    ))
    .add("Responsive", () => (
        <C>
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
        </C>
    ))
