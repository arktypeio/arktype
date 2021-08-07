import React, { useState } from "react"
import { usePalette } from "../styles"
import {
    TextField,
    StandardTextFieldProps as BaseMuiTextFieldProps
} from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { makeKinds, KindFrom } from "../common"

// Create a type definition that allows us to use different variants
type MuiTextFieldProps = Omit<BaseMuiTextFieldProps, "variant">

// Mui's theme overrides these styles unless !important is specified
const getBorderStyles = (color: string) => ({
    borderColor: `${color} !important`,
    "&:after": { borderColor: `${color} !important` },
    "&:before": { borderColor: `${color} !important` }
})

const stylize = makeStyles(() => {
    return {
        baseClass: ({ border: { base } }: TextInputColors) =>
            getBorderStyles(base),
        errorClass: ({ border: { error } }: TextInputColors) =>
            getBorderStyles(error),
        focusedClass: ({ border: { focused } }: TextInputColors) =>
            getBorderStyles(focused),
        hoveredClass: ({ border: { hovered } }: TextInputColors) =>
            getBorderStyles(hovered),
        textClass: ({ text }: TextInputColors) => ({
            color: text
        })
    }
})

type UseKindOptions = {
    state: TextInputState
    colors: TextInputColors
}

const useKind = makeKinds<MuiTextFieldProps>()(
    ({ state, colors }: UseKindOptions) => {
        const { baseClass, errorClass, focusedClass, hoveredClass, textClass } =
            stylize(colors)
        const { focused, hovered, error } = state
        const borderClass = focused
            ? focusedClass
            : error
            ? errorClass
            : hovered
            ? hoveredClass
            : baseClass
        return {
            outlined: {
                variant: "outlined",
                InputProps: {
                    classes: {
                        root: textClass,
                        notchedOutline: borderClass
                    },
                    style: {
                        maxHeight: 40
                    }
                }
            },
            underlined: {
                variant: "standard",
                InputProps: {
                    classes: {
                        root: textClass,
                        underline: borderClass
                    },
                    style: {
                        maxHeight: 40
                    }
                }
            }
        }
    }
)

const useColors = makeKinds<TextInputColors>()(() => {
    const { primary, secondary, error, common, text } = usePalette()
    return {
        standard: {
            border: {
                base: primary.dark,
                hovered: primary.light,
                error: error.main,
                focused: secondary.main
            },
            text: text.primary
        },
        light: {
            border: {
                base: common.white,
                hovered: secondary.light,
                error: error.main,
                focused: secondary.main
            },
            text: common.white
        }
    }
})

type ColorTemplate = KindFrom<typeof useColors>

type TextInputState = {
    focused: boolean
    hovered: boolean
    error: boolean
}

type BorderColors = {
    focused: string
    hovered: string
    error: string
    base: string
}

type TextInputColors = {
    border: BorderColors
    text: string
}

export const useTextFieldProps = ({
    kind = "outlined",
    colorTemplate = "standard",
    borderColors = {},
    textColor,
    onFocus,
    onBlur,
    onError,
    onReset,
    onMouseOver,
    onMouseOut,
    ...rest
}: TextInputProps): MuiTextFieldProps => {
    const { primary } = usePalette()
    const [state, setState] = useState({
        focused: false,
        error: false,
        hovered: false
    })
    const { border: paletteBorderColors, text: paletteTextColor } =
        useColors(colorTemplate)
    const kindProps = useKind(kind, {
        state,
        colors: {
            border: { ...paletteBorderColors, ...borderColors } as BorderColors,
            text: textColor ? textColor : paletteTextColor!
        }
    })
    return {
        margin: "dense",
        onFocus: (e) => {
            setState({ ...state, focused: true })
            onFocus && onFocus(e)
        },
        onBlur: (e) => {
            setState({ ...state, focused: false })
            onBlur && onBlur(e)
        },
        onError: (e) => {
            setState({ ...state, error: true })
            onError && onError(e)
        },
        onReset: (e) => {
            setState({ ...state, error: false })
            onReset && onReset(e)
        },
        onMouseOver: (e) => {
            setState({ ...state, hovered: true })
            onMouseOver && onMouseOver(e)
        },
        onMouseOut: (e) => {
            setState({ ...state, hovered: false })
            onMouseOut && onMouseOut(e)
        },
        InputLabelProps: {
            style: {
                color: state.focused ? primary.dark : primary.light
            }
        },
        ...kindProps,
        ...rest
    }
}

export type TextInputProps = Omit<MuiTextFieldProps, "variant"> & {
    kind?: KindFrom<typeof useKind>
    colorTemplate?: ColorTemplate
    borderColors?: Partial<BorderColors>
    textColor?: string
}

export const TextInput = (props: TextInputProps) => {
    const textFieldProps = useTextFieldProps(props)
    return <TextField {...textFieldProps} />
}
