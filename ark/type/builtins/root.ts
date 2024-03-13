import { Scope } from "../scope.js"

export const root: Scope<{
	exports: {}
	locals: {}
	ambient: {}
}> = new Scope({})
