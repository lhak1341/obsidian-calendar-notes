import { onMount } from "svelte";
import { writable, type Writable } from "svelte/store";

export function useFieldValidation(
  getValue: () => string,
  validate: (value: string) => string
): { error: Writable<string>; onChange: () => void; onInput: () => void } {
  const error = writable("");

  function revalidate() {
    error.set(validate(getValue()));
  }

  onMount(revalidate);

  return { error, onChange: revalidate, onInput: () => error.set("") };
}
