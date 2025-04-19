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
}

export declare namespace Return {
	export interface introspectable {
		introspectableReturn: true
	}
}

export type NaryFnParser<$> = {
	(): <implementation extends () => unknown>(
		implementation: implementation
	) => TypedFn<implementation, $>

	<const a>(
		a: type.validate<a, $>
	): <
		implementation extends signature,
		signature extends (a: type.infer<a, $>) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<implementation>,
		$
	>

	<const a, const b>(
		a: a extends ":" ? ":" : type.validate<a, $>,
		b: type.validate<b, $>
	): <
		implementation extends signature,
		signature extends a extends ":" ? () => type.infer<b, $>
		:	(a: type.infer<a, $>, b: type.infer<b, $>) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<a extends ":" ? signature : implementation>,
		$,
		a extends ":" ? Return.introspectable : {}
	>

	<const a, const b, const c>(
		a: type.validate<a, $>,
		b: b extends ":" ? ":" : type.validate<b, $>,
		c: type.validate<c, $>
	): <
		implementation extends signature,
		signature extends b extends ":" ? (a: type.infer<a, $>) => type.infer<c, $>
		:	(a: type.infer<a, $>, b: type.infer<b, $>, c: type.infer<c, $>) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		b extends ":" ? Return.introspectable : {}
	>

	<const a, const b, const c, const d>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: c extends ":" ? ":" : type.validate<c, $>,
		d: type.validate<d, $>
	): <
		implementation extends signature,
		signature extends c extends ":" ?
			(a: type.infer<a, $>, b: type.infer<b, $>) => type.infer<d, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		c extends ":" ? Return.introspectable : {}
	>

	<const a, const b, const c, const d, const e>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: d extends ":" ? ":" : type.validate<d, $>,
		e: type.validate<e, $>
	): <
		implementation extends signature,
		signature extends d extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>
			) => type.infer<e, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		d extends ":" ? Return.introspectable : {}
	>

	<const a, const b, const c, const d, const e, const f>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: e extends ":" ? ":" : type.validate<e, $>,
		f: type.validate<f, $>
	): <
		implementation extends signature,
		signature extends e extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>
			) => type.infer<f, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		e extends ":" ? Return.introspectable : {}
	>

	<const a, const b, const c, const d, const e, const f, const g>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: f extends ":" ? ":" : type.validate<f, $>,
		g: type.validate<g, $>
	): <
		implementation extends signature,
		signature extends f extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>
			) => type.infer<g, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		f extends ":" ? Return.introspectable : {}
	>

	<const a, const b, const c, const d, const e, const f, const g, const h>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: g extends ":" ? ":" : type.validate<g, $>,
		h: type.validate<h, $>
	): <
		implementation extends signature,
		signature extends g extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>
			) => type.infer<h, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		g extends ":" ? Return.introspectable : {}
	>

	<
		const a,
		const b,
		const c,
		const d,
		const e,
		const f,
		const g,
		const h,
		const i
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: h extends ":" ? ":" : type.validate<h, $>,
		i: type.validate<i, $>
	): <
		implementation extends signature,
		signature extends h extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>
			) => type.infer<i, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		h extends ":" ? Return.introspectable : {}
	>

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
		const j
	>(
		a: type.validate<a, $>,
		b: type.validate<b, $>,
		c: type.validate<c, $>,
		d: type.validate<d, $>,
		e: type.validate<e, $>,
		f: type.validate<f, $>,
		g: type.validate<g, $>,
		h: type.validate<h, $>,
		i: i extends ":" ? ":" : type.validate<i, $>,
		j: type.validate<j, $>
	): <
		implementation extends signature,
		signature extends i extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>
			) => type.infer<j, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		i extends ":" ? Return.introspectable : {}
	>

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
		const k
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
		j: j extends ":" ? ":" : type.validate<j, $>,
		k: type.validate<k, $>
	): <
		implementation extends signature,
		signature extends j extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>
			) => type.infer<k, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		j extends ":" ? Return.introspectable : {}
	>

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
		const l
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
		k: k extends ":" ? ":" : type.validate<k, $>,
		l: type.validate<l, $>
	): <
		implementation extends signature,
		signature extends k extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>
			) => type.infer<l, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		k extends ":" ? Return.introspectable : {}
	>

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
		const m
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
		l: l extends ":" ? ":" : type.validate<l, $>,
		m: type.validate<m, $>
	): <
		implementation extends signature,
		signature extends l extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>
			) => type.infer<m, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		l extends ":" ? Return.introspectable : {}
	>

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
		const n
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
		m: m extends ":" ? ":" : type.validate<m, $>,
		n: type.validate<n, $>
	): <
		implementation extends signature,
		signature extends m extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>
			) => type.infer<n, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>,
				n: type.infer<n, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		m extends ":" ? Return.introspectable : {}
	>

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
		const o
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
		n: n extends ":" ? ":" : type.validate<n, $>,
		o: type.validate<o, $>
	): <
		implementation extends signature,
		signature extends n extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>
			) => type.infer<o, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>,
				n: type.infer<n, $>,
				o: type.infer<o, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		n extends ":" ? Return.introspectable : {}
	>

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
		const p
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
		o: o extends ":" ? ":" : type.validate<o, $>,
		p: type.validate<p, $>
	): <
		implementation extends signature,
		signature extends o extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>,
				n: type.infer<n, $>
			) => type.infer<p, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>,
				n: type.infer<n, $>,
				o: type.infer<o, $>,
				p: type.infer<p, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		o extends ":" ? Return.introspectable : {}
	>

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
		const q
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
		p: p extends ":" ? ":" : type.validate<p, $>,
		q: type.validate<q, $>
	): <
		implementation extends signature,
		signature extends p extends ":" ?
			(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>,
				n: type.infer<n, $>,
				o: type.infer<o, $>
			) => type.infer<q, $>
		:	(
				a: type.infer<a, $>,
				b: type.infer<b, $>,
				c: type.infer<c, $>,
				d: type.infer<d, $>,
				e: type.infer<e, $>,
				f: type.infer<f, $>,
				g: type.infer<g, $>,
				h: type.infer<h, $>,
				i: type.infer<i, $>,
				j: type.infer<j, $>,
				k: type.infer<k, $>,
				l: type.infer<l, $>,
				m: type.infer<m, $>,
				n: type.infer<n, $>,
				o: type.infer<o, $>,
				p: type.infer<p, $>,
				q: type.infer<q, $>
			) => unknown
	>(
		implementation: implementation
	) => TypedFn<
		(
			...args: mapParamNames<implementation, signature>
		) => ReturnType<signature>,
		$,
		p extends ":" ? Return.introspectable : {}
	>
}
