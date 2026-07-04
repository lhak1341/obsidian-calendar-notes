import sveltePreprocess from "svelte-preprocess";

const SUPPRESSED = new Set([
  "a11y_click_events_have_key_events",
  "a11y_no_static_element_interactions",
  "a11y_no_noninteractive_element_interactions",
  "element_invalid_self_closing_tag",
]);

export default {
  onwarn: (warning, handler) => {
    if (SUPPRESSED.has(warning.code)) return;
    handler(warning);
  },
  preprocess: sveltePreprocess({
    scss: { silenceDeprecations: ["legacy-js-api"] },
    sass: { silenceDeprecations: ["legacy-js-api"] },
  }),
};
