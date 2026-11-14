/**
 * Set while precompile is unreleased: the copy says "next release", the chart
 * carries a preview pill and the footnote a draft tag. Remove it (and every
 * tag goes with it) once precompile ships and the bench is rerun. Publishing a
 * stable arktype fails while it's set, which is why it has a module of its own:
 * ark/repo/publish.ts imports it without the rest of the bench.
 */
export const preview:
	| {
			/** a public commit holding an earlier ark/repo/bench, until the harness is published */
			harnessRef: string
	  }
	| undefined = {
	harnessRef: "4262bc88a138b88a1aa9b56e8150c9422f6de950"
}
