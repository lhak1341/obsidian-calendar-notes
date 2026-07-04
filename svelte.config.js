import sveltePreprocess from "svelte-preprocess";

export default {
  preprocess: sveltePreprocess({
    scss: { silenceDeprecations: ["legacy-js-api"] },
    sass: { silenceDeprecations: ["legacy-js-api"] },
  }),
};
