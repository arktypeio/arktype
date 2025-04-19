import type { Morph } from "@ark/schema"
import type { ErrorType, mapParamNames, merge } from "@ark/util"
import type {
	distill,
	inferIntersection,
	inferMorph,
	inferMorphOut,
	inferNaryIntersection,
	inferNaryMerge,
	inferNaryPipe
} from "./attributes.ts"
import type { TypedFn } from "./fn.ts"
import type { type } from "./keywords/keywords.ts"
import type { instantiateType } from "./methods/instantiate.ts"
import type { NonObjectMergeErrorMessage } from "./methods/object.ts"
import type { Type } from "./type.ts"

export type NaryUnionParser<$> = {
	(): Type<never, $>
	<const a, r = Type<type.infer<a, $>, $>>(
		a: type.validate<a, $>
	): r extends infer _ ? _ : never
	<const a, const b, r = Type<type.infer<a, $> | type.infer<b, $>, $>>(
		a: type.validate<a, $>,
		b: type.validate<b, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		r = Type<type.infer<a, $> | type.infer<b, $> | type.infer<c, $>, $>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		r = Type<
			type.infer<a, $> | type.infer<b, $> | type.infer<c, $> | type.infer<d, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
			| type.infer<l, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
			| type.infer<l, $>
			| type.infer<m, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
			| type.infer<l, $>
			| type.infer<m, $>
			| type.infer<n, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
			| type.infer<l, $>
			| type.infer<m, $>
			| type.infer<n, $>
			| type.infer<o, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
			| type.infer<l, $>
			| type.infer<m, $>
			| type.infer<n, $>
			| type.infer<o, $>
			| type.infer<p, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		r = Type<
			| type.infer<a, $>
			| type.infer<b, $>
			| type.infer<c, $>
			| type.infer<d, $>
			| type.infer<e, $>
			| type.infer<f, $>
			| type.infer<g, $>
			| type.infer<h, $>
			| type.infer<i, $>
			| type.infer<j, $>
			| type.infer<k, $>
			| type.infer<l, $>
			| type.infer<m, $>
			| type.infer<n, $>
			| type.infer<o, $>
			| type.infer<p, $>
			| type.infer<q, $>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>,
		q: type.validate<q, $>
	): r extends infer _ ? _ : never
	<
		const defs extends readonly unknown[],
		r = Type<type.infer<defs[number], $>, $>
	>(
		...defs: { [i in keyof defs]: type.validate<defs[i], $> }
	): r extends infer _ ? _ : never
}

export type NaryIntersectionParser<$> = {
	(): Type<unknown, $>
	<const a, r = Type<type.infer<a, $>, $>>(
		a: type.validate<a, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		r = Type<inferIntersection<type.infer<a, $>, type.infer<b, $>>, $>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		r = Type<
			inferNaryIntersection<
				[type.infer<a, $>, type.infer<b, $>, type.infer<c, $>]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		r = Type<
			inferNaryIntersection<
				[type.infer<a, $>, type.infer<b, $>, type.infer<c, $>, type.infer<d, $>]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>,
					type.infer<l, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>,
					type.infer<l, $>,
					type.infer<m, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>,
					type.infer<l, $>,
					type.infer<m, $>,
					type.infer<n, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>,
					type.infer<l, $>,
					type.infer<m, $>,
					type.infer<n, $>,
					type.infer<o, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>,
					type.infer<l, $>,
					type.infer<m, $>,
					type.infer<n, $>,
					type.infer<o, $>,
					type.infer<p, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		r = Type<
			inferNaryIntersection<
				[
					type.infer<a, $>,
					type.infer<b, $>,
					type.infer<c, $>,
					type.infer<d, $>,
					type.infer<e, $>,
					type.infer<f, $>,
					type.infer<g, $>,
					type.infer<h, $>,
					type.infer<i, $>,
					type.infer<j, $>,
					type.infer<k, $>,
					type.infer<l, $>,
					type.infer<m, $>,
					type.infer<n, $>,
					type.infer<o, $>,
					type.infer<p, $>,
					type.infer<q, $>
				]
			>,
			$
		>
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: type.validate<i, $>,
		j: type.validate<j, $>,
		k: type.validate<k, $>,
		l: type.validate<l, $>,
		m: type.validate<m, $>,
		n: type.validate<n, $>,
		o: type.validate<o, $>,
		p: type.validate<p, $>,
		q: type.validate<q, $>
	): r extends infer _ ? _ : never
	<
		const defs extends readonly unknown[],
		r = Type<
			inferNaryIntersection<{ [i in keyof defs]: type.infer<defs[i], $> }>,
			$
		>
	>(
		...defs: { [i in keyof defs]: type.validate<defs[i], $> }
	): r extends infer _ ? _ : never
}

export type NaryMergeParser<$> = {
	(): Type<object, $>
	<const a, inferredA = type.infer<a, $>, r = Type<inferredA, $>>(
		a: type.validate<a, $> &
			// if you can figure out a way to avoid inlining this without
			// breaking autocomplete and error display, do it!
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		r = Type<merge<inferredA, inferredB>, $>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<"Merged type must be an object", [actual: inferredB]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		r = Type<inferNaryMerge<[inferredA, inferredB, inferredC]>, $>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		r = Type<inferNaryMerge<[inferredA, inferredB, inferredC, inferredD]>, $>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		r = Type<
			inferNaryMerge<[inferredA, inferredB, inferredC, inferredD, inferredE]>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		r = Type<
			inferNaryMerge<
				[inferredA, inferredB, inferredC, inferredD, inferredE, inferredF]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		inferredL = type.infer<l, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredL]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		inferredL = type.infer<l, $>,
		inferredM = type.infer<m, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredM]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		inferredL = type.infer<l, $>,
		inferredM = type.infer<m, $>,
		inferredN = type.infer<n, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredN]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		inferredL = type.infer<l, $>,
		inferredM = type.infer<m, $>,
		inferredN = type.infer<n, $>,
		inferredO = type.infer<o, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN,
					inferredO
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredN]>),
		o: type.validate<o, $> &
			(inferredO extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredO]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		inferredL = type.infer<l, $>,
		inferredM = type.infer<m, $>,
		inferredN = type.infer<n, $>,
		inferredO = type.infer<o, $>,
		inferredP = type.infer<p, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN,
					inferredO,
					inferredP
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredN]>),
		o: type.validate<o, $> &
			(inferredO extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredO]>),
		p: type.validate<p, $> &
			(inferredP extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredP]>)
	): r extends infer _ ? _ : never
	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i,
		const j,
		const k,
		const l,
		const m,
		const n,
		const o,
		const p,
		const q,
		inferredA = type.infer<a, $>,
		inferredB = type.infer<b, $>,
		inferredC = type.infer<c, $>,
		inferredD = type.infer<d, $>,
		inferredE = type.infer<e, $>,
		inferredF = type.infer<f, $>,
		inferredG = type.infer<g, $>,
		inferredH = type.infer<h, $>,
		inferredI = type.infer<i, $>,
		inferredJ = type.infer<j, $>,
		inferredK = type.infer<k, $>,
		inferredL = type.infer<l, $>,
		inferredM = type.infer<m, $>,
		inferredN = type.infer<n, $>,
		inferredO = type.infer<o, $>,
		inferredP = type.infer<p, $>,
		inferredQ = type.infer<q, $>,
		r = Type<
			inferNaryMerge<
				[
					inferredA,
					inferredB,
					inferredC,
					inferredD,
					inferredE,
					inferredF,
					inferredG,
					inferredH,
					inferredI,
					inferredJ,
					inferredK,
					inferredL,
					inferredM,
					inferredN,
					inferredO,
					inferredP,
					inferredQ
				]
			>,
			$
		>
	>(
		a: type.validate<a, $> &
			(inferredA extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredA]>),
		b: type.validate<b, $> &
			(inferredB extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredB]>),
		c: type.validate<c, $> &
			(inferredC extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredC]>),
		d: type.validate<d, $> &
			(inferredD extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredD]>),
		e: type.validate<e, $> &
			(inferredE extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredE]>),
		f: type.validate<f, $> &
			(inferredF extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredF]>),
		g: type.validate<g, $> &
			(inferredG extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredG]>),
		h: type.validate<h, $> &
			(inferredH extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredH]>),
		i: type.validate<i, $> &
			(inferredI extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredI]>),
		j: type.validate<j, $> &
			(inferredJ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredJ]>),
		k: type.validate<k, $> &
			(inferredK extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredK]>),
		l: type.validate<l, $> &
			(inferredL extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredL]>),
		m: type.validate<m, $> &
			(inferredM extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredM]>),
		n: type.validate<n, $> &
			(inferredN extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredN]>),
		o: type.validate<o, $> &
			(inferredO extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredO]>),
		p: type.validate<p, $> &
			(inferredP extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredP]>),
		q: type.validate<q, $> &
			(inferredQ extends object ? unknown
			:	ErrorType<NonObjectMergeErrorMessage, [actual: inferredQ]>)
	): r extends infer _ ? _ : never
	<
		const defs extends readonly unknown[],
		r = Type<inferNaryMerge<{ [i in keyof defs]: type.infer<defs[i], $> }>, $>
	>(
		...defs: {
			[i in keyof defs]: type.validate<defs[i], $> &
				(type.infer<defs[i], $> extends object ? unknown
				:	ErrorType<
						NonObjectMergeErrorMessage,
						[actual: type.infer<defs[i], $>]
					>)
		}
	): r extends infer _ ? _ : never
}

export type NaryPipeParser<$, initial = unknown> = {
	(): Type<initial, $>
	<
		a extends Morph<distill.Out<initial>>,
		r = instantiateType<inferMorph<initial, a>, $>
	>(
		a: a
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b]>, $>
	>(
		a: a,
		b: b
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c]>, $>
	>(
		a: a,
		b: b,
		c: c
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d, e]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d, e, f]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		r = instantiateType<inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g]>, $>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		r = instantiateType<
			inferNaryPipe<[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n]>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		o extends Morph<inferMorphOut<n>>,
		r = instantiateType<
			inferNaryPipe<
				[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o]
			>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n,
		o: o
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		o extends Morph<inferMorphOut<n>>,
		p extends Morph<inferMorphOut<o>>,
		r = instantiateType<
			inferNaryPipe<
				[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p]
			>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n,
		o: o,
		p: p
	): r extends infer _ ? _ : never
	<
		a extends Morph<distill.Out<initial>>,
		b extends Morph<inferMorphOut<a>>,
		c extends Morph<inferMorphOut<b>>,
		d extends Morph<inferMorphOut<c>>,
		e extends Morph<inferMorphOut<d>>,
		f extends Morph<inferMorphOut<e>>,
		g extends Morph<inferMorphOut<f>>,
		h extends Morph<inferMorphOut<g>>,
		i extends Morph<inferMorphOut<h>>,
		j extends Morph<inferMorphOut<i>>,
		k extends Morph<inferMorphOut<j>>,
		l extends Morph<inferMorphOut<k>>,
		m extends Morph<inferMorphOut<l>>,
		n extends Morph<inferMorphOut<m>>,
		o extends Morph<inferMorphOut<n>>,
		p extends Morph<inferMorphOut<o>>,
		q extends Morph<inferMorphOut<p>>,
		r = instantiateType<
			inferNaryPipe<
				[Type<initial>, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q]
			>,
			$
		>
	>(
		a: a,
		b: b,
		c: c,
		d: d,
		e: e,
		f: f,
		g: g,
		h: h,
		i: i,
		j: j,
		k: k,
		l: l,
		m: m,
		n: n,
		o: o,
		p: p,
		q: q
	): r extends infer _ ? _ : never
	<const morphs extends readonly Morph[], r = Type<inferNaryPipe<morphs>, $>>(
		...defs: morphs
	): r extends infer _ ? _ : never
}

export type NaryFnParser<$> = {
	(): <implementation extends () => unknown>(
		implementation: implementation
	) => TypedFn<implementation, $>

	<const returns>(
		_: ":",
		returns: type.validate<returns, $>
	): <implementation extends () => type.infer<returns, $>>(
		implementation: implementation
	) => TypedFn<implementation, $>

	<const arg0>(
		arg0: type.validate<arg0, $>
	): <
		implementation extends signature,
		signature extends (arg0: type.infer<arg0, $>) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<const arg0, const returns>(
		arg0: type.validate<arg0, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (arg0: type.infer<arg0, $>) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<const arg0, const arg1>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<const arg0, const arg1, const returns>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<const arg0, const arg1, const arg2>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<const arg0, const arg1, const arg2, const returns>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<const arg0, const arg1, const arg2, const arg3>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<const arg0, const arg1, const arg2, const arg3, const returns>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<const arg0, const arg1, const arg2, const arg3, const arg4>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<const arg0, const arg1, const arg2, const arg3, const arg4, const returns>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<const arg0, const arg1, const arg2, const arg3, const arg4, const arg5>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15,
		const arg16
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>,
		arg16: type.validate<arg16, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>,
			arg16: type.infer<arg16, $>
		) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<
		const arg0,
		const arg1,
		const arg2,
		const arg3,
		const arg4,
		const arg5,
		const arg6,
		const arg7,
		const arg8,
		const arg9,
		const arg10,
		const arg11,
		const arg12,
		const arg13,
		const arg14,
		const arg15,
		const arg16,
		const returns
	>(
		arg0: type.validate<arg0, $>,
		arg1: type.validate<arg1, $>,
		arg2: type.validate<arg2, $>,
		arg3: type.validate<arg3, $>,
		arg4: type.validate<arg4, $>,
		arg5: type.validate<arg5, $>,
		arg6: type.validate<arg6, $>,
		arg7: type.validate<arg7, $>,
		arg8: type.validate<arg8, $>,
		arg9: type.validate<arg9, $>,
		arg10: type.validate<arg10, $>,
		arg11: type.validate<arg11, $>,
		arg12: type.validate<arg12, $>,
		arg13: type.validate<arg13, $>,
		arg14: type.validate<arg14, $>,
		arg15: type.validate<arg15, $>,
		arg16: type.validate<arg16, $>,
		_: ":",
		returns: type.validate<returns, $>
	): <
		implementation extends signature,
		signature extends (
			arg0: type.infer<arg0, $>,
			arg1: type.infer<arg1, $>,
			arg2: type.infer<arg2, $>,
			arg3: type.infer<arg3, $>,
			arg4: type.infer<arg4, $>,
			arg5: type.infer<arg5, $>,
			arg6: type.infer<arg6, $>,
			arg7: type.infer<arg7, $>,
			arg8: type.infer<arg8, $>,
			arg9: type.infer<arg9, $>,
			arg10: type.infer<arg10, $>,
			arg11: type.infer<arg11, $>,
			arg12: type.infer<arg12, $>,
			arg13: type.infer<arg13, $>,
			arg14: type.infer<arg14, $>,
			arg15: type.infer<arg15, $>,
			arg16: type.infer<arg16, $>
		) => type.infer<returns, $>
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$
	>
}
