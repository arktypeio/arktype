import React from "react"
import { ThemeProvider } from "@material-ui/core"
import { defaultTheme } from "../styles"
import { Card } from "../cards"
import { Row, Column, AppContents } from "."

export default {
    title: "Layouts"
}

const argTypes = {
    align: {
        control: {
            type: "radio",
            options: ["stretch", "center", "flex-start", "flex-end", "baseline"]
        }
    },
    grow: { control: "boolean" },
    height: { control: "number" },
    width: { control: "number" },
    reverse: { control: "boolean" },
    full: { control: "boolean" },
    justify: {
        control: {
            type: "radio",
            options: [
                "center",
                "flex-start",
                "flex-end",
                "space-between",
                "space-around",
                "space-evenly"
            ]
        }
    }
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
            components: {
                MuiGrid: {
                    styleOverrides: {
                        container: {
                            border: `solid ${defaultTheme.palette.primary.main}`
                        }
                    }
                }
            }
        }}
    >
        <AppContents>{children}</AppContents>
    </ThemeProvider>
)

export const SingleRow = (props: any) => (
    <Context>
        <Row {...props}>{cards}</Row>
    </Context>
)

SingleRow.argTypes = argTypes

export const SingleColumn = (props: any) => (
    <Context>
        <Column {...props}>{cards}</Column>
    </Context>
)

SingleColumn.argTypes = argTypes

export const RowOfColumns = (props: any) => (
    <Context>
        <Row {...props}>
            <Column {...props}>{cards}</Column>
            <Column {...props}>{cards}</Column>
            <Column {...props}>{cards}</Column>
        </Row>
    </Context>
)

RowOfColumns.argTypes = argTypes

export const RowOfRows = (props: any) => (
    <Context>
        <Row>
            <Row {...props}>{cards}</Row>
            <Row {...props}>{cards}</Row>
            <Row {...props}>{cards}</Row>
        </Row>
    </Context>
)

RowOfRows.argTypes = argTypes

export const ColumnOfRows = (props: any) => (
    <Context>
        <Column {...props}>
            <Row {...props}>{cards}</Row>
            <Row {...props}>{cards}</Row>
            <Row {...props}>{cards}</Row>
        </Column>
    </Context>
)

ColumnOfRows.argTypes = argTypes

export const ColumnOfColumns = (props: any) => (
    <Context>
        <Column {...props}>
            <Column {...props}>{cards}</Column>
            <Column {...props}>{cards}</Column>
            <Column {...props}>{cards}</Column>
        </Column>
    </Context>
)

ColumnOfColumns.argTypes = argTypes

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
