import React from "react"
import { Theme, CircularProgress } from "@material-ui/core"
import { component } from "../meta/Component"
import { createStyles } from "@material-ui/styles"
import { Column } from "../layouts"
import { ErrorText, InfoText } from "../typography"

const styles = (theme: Theme) => createStyles({})

export type ResponseProps = {
    isLoading: boolean
    errors?: string[]
    children: JSX.Element
    loadingMessage?: string
    contentOnError?: boolean
    contentOnLoading?: boolean
}

export const Response = component({
    name: "Response",
    defaultProps: {
        contentOnError: true,
        contentOnLoading: false
    } as Partial<ResponseProps>,
    styles
})(
    ({
        classes,
        contentOnError,
        children,
        isLoading,
        errors,
        loadingMessage,
        contentOnLoading
    }) => {
        const results: JSX.Element[] = []
        if ((!errors || contentOnError) && (!isLoading || contentOnLoading)) {
            results.push(children)
        }
        if (isLoading) {
            results.push(<CircularProgress key="loading" />)
            if (loadingMessage) {
                results.push(<InfoText>{loadingMessage}</InfoText>)
            }
        } else {
            if (errors) {
                errors.forEach((message, key) =>
                    results.push(<ErrorText key={key}>{message}</ErrorText>)
                )
            }
        }
        return <Column align="center">{results}</Column>
    }
)
