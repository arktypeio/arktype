import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { defaultTheme } from "../styles"
import { Row, Column } from "."
import { Card } from "../cards"
import { Text } from "../text"

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
    .add("Row of cards", () => (
        <C>
            <Row>{cards}</Row>
        </C>
    ))
    .add("Column of cards", () => (
        <C>
            <Column>{cards}</Column>
        </C>
    ))
    .add("Row of columns", () => (
        <C>
            <Row>
                <Column>{cards}</Column>
                <Column>{cards}</Column>
                <Column>{cards}</Column>
            </Row>
        </C>
    ))
    .add("Row of rows", () => (
        <C>
            <Row>
                <Row>{cards}</Row>
                <Row>{cards}</Row>
                <Row>{cards}</Row>
            </Row>
        </C>
    ))
    .add("Column of rows", () => (
        <C>
            <Column>
                <Row>{cards}</Row>
                <Row>{cards}</Row>
                <Row>{cards}</Row>
            </Column>
        </C>
    ))
    .add("Column of columns", () => (
        <C>
            <Column>
                <Column>{cards}</Column>
                <Column>{cards}</Column>
                <Column>{cards}</Column>
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
        <div style={{ height: "100vh", width: "100vw" }}>
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
        </div>
    ))
