import { AbstractInputSuggest, App } from "obsidian";

export abstract class TextInputSuggest<T> extends AbstractInputSuggest<T> {
  protected inputEl: HTMLInputElement;

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.inputEl = inputEl;
  }

  abstract getSuggestions(inputStr: string): T[];
  abstract renderSuggestion(item: T, el: HTMLElement): void;
  abstract selectSuggestion(item: T): void;

  onChooseSuggestion(item: T, _evt: MouseEvent | KeyboardEvent): void {
    this.selectSuggestion(item);
  }
}
