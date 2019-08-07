import React, { FC } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { defaultTheme } from "../themes"
import { Row, Column } from "."
import { Card } from "../cards"

const cards = (
    <>
        <Card>One</Card>
        <Card>Two</Card>
        <Card>Three</Card>
    </>
)

const C: FC = ({ children }) => (
    <div style={{ border: `solid black`, height: 500, width: 500 }}>
        {children}
    </div>
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
    .add("Combo", () => (
        <C>
            <Column>
                <Row>
                    <Column>{cards}</Column>
                    <Column>{cards}</Column>
                    <Column>{cards}</Column>
                </Row>
                <Column>
                    <Row>{cards}</Row>
                    <Row>{cards}</Row>
                    <Row>{cards}</Row>
                </Column>
            </Column>
        </C>
    ))
