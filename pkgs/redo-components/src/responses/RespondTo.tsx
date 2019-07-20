import React from "react"
import { Theme, CircularProgress } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Column } from "../layouts"
import { ErrorText, InfoText } from "../typography"
import { FormText } from "forms"

const styles = makeStyles((theme: Theme) => {})

export type RespondToProps<T> = {
    children: JSX.Element
    response: Response<T>
    options: ResponseOptions<T>
}

export type Response<T> = {
    data?: T
    loading?: boolean
    errors?: string[]
}

export type ResponseOptions<T> = {
    data?: ResponseItemOptions<T>
    errors?: ResponseItemOptions<string[]>
    loading?: ResponseItemOptions<boolean>
}

export type ResponseItemOptions<T> = {
    showContent?: boolean
    onChange?: (value: T) => void
    displayAs?: (props: ResponseStateProps<T>) => JSX.Element
}

export type ResponseStateProps<T> = {
    value: T
}

export const RespondTo = <T extends any>({
    children,
    response,
    options
}: RespondToProps<T>) => {
    const showContent = Object.values(options).some(
        options => options && options.showContent === false
    )
    const results = Object.entries(response).reduce(
        (displayElements, [responseItemType, responseItemValue]) => {
            return displayElements
        },
        [] as JSX.Element[]
    )
    return (
        <Column align="center">
            {results}
            {showContent ? children : null}
        </Column>
    )
}

// export const Response = ({
//     contentOnError = true,
//     children,
//     loading = false,
//     errors,
//     data,
//     loadingMessage,
//     contentOnLoading = false
// }: ResponseProps) => {
//     const results: JSX.Element[] = []
//     if ((!errors || contentOnError) && (!isLoading || contentOnLoading)) {
//         results.push(children)
//     }
//     if (isLoading) {
//         results.push(<CircularProgress key="loading" />)
//         if (loadingMessage) {
//             results.push(<InfoText>{loadingMessage}</InfoText>)
//         }
//     } else {
//         if (errors) {
//             errors.forEach((message, key) =>
//                 results.push(<ErrorText key={key}>{message}</ErrorText>)
//             )
//         }
//     }
//     return <Column align="center">{results}</Column>
// }
