import { HTMLHandlerInterface } from "../client_types";

export class TextInput implements HTMLHandlerInterface {

    element: HTMLInputElement;
    inputCallback: () => void;

    constructor(id: string, input: () => void) {
        this.element = document.getElementById(id) as HTMLInputElement;
        this.inputCallback = input.bind(this);
    }

    enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('input', this.inputCallback);
    }

    disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('input', this.inputCallback);
    }

    setValue = (value: string | null) => {
        this.element.value = value ?? '';
    }
}
