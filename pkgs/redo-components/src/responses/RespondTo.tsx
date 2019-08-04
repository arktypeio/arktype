import React, { useState } from "react"
import { Theme, CircularProgress } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Column } from "../layouts"
import { ErrorText } from "../text"
import deepmerge from "deepmerge"
import { ValueOf } from "../../../redo-utils/dist"

const styles = makeStyles((theme: Theme) => {})

export type RespondToProps<T = any> = {
    response: ResponseState<T>
    children?: JSX.Element
    options?: ResponseOptions<T>
}

export type ResponseState<T = any> = {
    data?: T
    loading?: boolean
    errors?: string[]
}

export type ResponseOptions<T> = {
    data?: ResponseItemOptions<T>
    errors?: ResponseItemOptions<string[]>
    loading?: ResponseItemOptions<boolean>
}

type ResponseItemOptions<T> = {
    hideContent?: boolean
    // TODO determine whether this should be included as part of API
    onChange?: (value: T | undefined) => void
    displayAs?: (props: ResponseStateProps<T>) => JSX.Element | null
}

type ResponseStateProps<T> = {
    value: T
}
const defaultRespondToOptions: ResponseOptions<any> = {
    errors: {
        displayAs: ({ value }) => (
            <>
                {value.map((message, key) => (
                    <ErrorText key={key}>{message}</ErrorText>
                ))}
            </>
        )
    },
    loading: {
        displayAs: ({ value }) => (value ? <CircularProgress /> : null)
    }
}

const isStateActiveMap: Record<string, (value: any) => boolean> = {
    data: (_?: any) => _,
    errors: (_?: string[]) => !!_ && !!_.length,
    loading: (_?: boolean) => _ === true
}

export const RespondTo = <T extends any = any>({
    children,
    response,
    options = {}
}: RespondToProps<T>) => {
    const opts = deepmerge(defaultRespondToOptions, options)
    const [lastResponse, setLastResponse] = useState<ResponseState<T>>({})
    const hideChildren = Object.entries(opts).some(
        ([key, { hideContent }]: [string, ResponseItemOptions<any>]) => {
            const k = key as keyof ResponseOptions<any>
            if (hideContent === true) {
                return isStateActiveMap[k](response[k])
            }
            return false
        }
    )
    handleChanges(response, lastResponse, setLastResponse, opts)
    const displayResponseAs = Object.entries(response).map(([k, v]) => {
        const key = k as keyof ResponseOptions<T>
        if (opts && opts[key] && opts[key]!.displayAs) {
            const DisplayAs = opts[key]!.displayAs!
            return <DisplayAs key={key} value={v as any} />
        }
        return null
    })
    return (
        <Column align="center">
            {displayResponseAs}
            {hideChildren ? null : children}
        </Column>
    )
}

const handleChanges = <T extends any>(
    currentResponse: ResponseState<T>,
    lastResponse: ResponseState<T>,
    setLastResponse: React.Dispatch<React.SetStateAction<ResponseState<T>>>,
    options: ResponseOptions<T>
) => {
    Object.entries(currentResponse).forEach(([k, v]) => {
        const key = k as keyof ResponseState<T>
        if (lastResponse[key] !== v) {
            const option = options[key]
            if (option && option.onChange) {
                option.onChange(v as any)
            }

            setLastResponse({
                ...lastResponse,
                [k]: v
            })
        }
    })
}
