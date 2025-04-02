import { useCallback, useRef, useState } from "react"
import { typeJs } from "../bundles/type.ts"
import type { ValidationOutputProps } from "./ValidationOutput.tsx"

export const validationDelayMs = 500

// remove the package's exports since they will fail in with new Function()
// instead, they'll be defined directly in the scope being executed
export const ambientArktypeJs = typeJs.slice(0, typeJs.lastIndexOf("export {"))

export const useEditorState = () => {
	const [validationResult, setValidationResult] =
		useState<ValidationOutputProps>({})
	const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const lastValidationTimeRef = useRef<number>(0)

	const validateImmediately = useCallback((code: string) => {
		const isolatedUserCode = code
			.replaceAll(/^\s*import .*\n/g, "")
			.replaceAll(/^\s*export\s+const/gm, "const")

		try {
			const wrappedCode = `${ambientArktypeJs}
        ${isolatedUserCode}
        return { MyType, out }`

			const result = new Function(wrappedCode)()
			const { MyType, out } = result

			setValidationResult({
				definition: MyType?.expression,
				result: out
			})
		} catch (e) {
			setValidationResult({
				result: `❌ RuntimeError: ${e instanceof Error ? e.message : String(e)}`
			})
		}
	}, [])

	const validateCode = useCallback(
		(code: string) => {
			const now = Date.now()
			const timeSinceLastValidation = now - lastValidationTimeRef.current

			if (validationTimeoutRef.current) {
				clearTimeout(validationTimeoutRef.current)
				validationTimeoutRef.current = null
			}

			if (timeSinceLastValidation > validationDelayMs * 2) {
				lastValidationTimeRef.current = now
				validateImmediately(code)
			} else {
				validationTimeoutRef.current = setTimeout(() => {
					lastValidationTimeRef.current = Date.now()
					validateImmediately(code)
				}, validationDelayMs)
			}
		},
		[validateImmediately]
	)

	return { validationResult, validateCode, validateImmediately }
}
