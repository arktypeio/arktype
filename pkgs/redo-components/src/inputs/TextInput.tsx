import React, { FC, useState } from "react"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"
import { BaseTextFieldProps as MuiTextFieldProps } from "@material-ui/core/TextField"
import { TextField } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { makeKinds, KindFrom } from "../common"

// Mui's theme overrides these styles unless !important is specified
const stylize = makeStyles((theme: Theme) => ({
    defaultClass: { borderColor: `${theme.palette.primary.dark} !important` },
    errorClass: { borderColor: `${theme.palette.error.main} !important` },
    focusedClass: { borderColor: `${theme.palette.secondary.main} !important` },
    hoveredClass: { borderColor: `${theme.palette.primary.light} !important` }
}))

const getBorderClass = (state: TextInputState) => {
    const { defaultClass, errorClass, focusedClass, hoveredClass } = stylize()
    const { focused, hovered, error } = state
    return focused
        ? focusedClass
        : error
        ? errorClass
        : hovered
        ? hoveredClass
        : defaultClass
}

const useKind = makeKinds<MuiTextFieldProps>()((state: TextInputState) => ({
    outlined: {
        variant: "outlined",
        InputProps: {
            classes: {
                notchedOutline: getBorderClass(state)
            }
        }
    },
    underlined: {
        variant: "standard"
    }
}))

type TextInputState = {
    focused: boolean
    hovered: boolean
    error: boolean
}

export type TextInputProps = MuiTextFieldProps & {
    kind?: KindFrom<typeof useKind>
}

export const TextInput: FC<TextInputProps> = ({
    kind = "outlined",
    onFocus,
    onBlur,
    onError,
    onReset,
    onMouseOver,
    onMouseOut,
    ...rest
}) => {
    const theme = useTheme<Theme>()
    const [state, setState] = useState({
        focused: false,
        error: false,
        hovered: false
    })
    const kindProps = useKind(kind, state)
    return (
        <TextField
            margin="dense"
            onFocus={e => {
                setState({ ...state, focused: true })
                onFocus && onFocus(e)
            }}
            onBlur={e => {
                setState({ ...state, focused: false })
                onBlur && onBlur(e)
            }}
            onError={e => {
                setState({ ...state, error: true })
                onError && onError(e)
            }}
            onReset={e => {
                setState({ ...state, error: false })
                onReset && onReset(e)
            }}
            onMouseOver={e => {
                setState({ ...state, hovered: true })
                onMouseOver && onMouseOver(e)
            }}
            onMouseOut={e => {
                setState({ ...state, hovered: false })
                onMouseOut && onMouseOut(e)
            }}
            InputLabelProps={{
                style: {
                    color: state.focused
                        ? theme.palette.primary.dark
                        : theme.palette.primary.light
                }
            }}
            {...kindProps as any}
            {...rest}
        />
    )
}
