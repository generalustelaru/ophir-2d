
interface HTMLHandlerInterface {
    enable(): void,
    disable(): void,
}
export class TextInput implements HTMLHandlerInterface {

    element: HTMLInputElement;
    callback: () => void;

    constructor(id: string, callback: () => void) {
        this.element = document.getElementById(id) as HTMLInputElement;
        this.callback = callback.bind(this);
    }

    enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('input', this.callback);
    }

    disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('input', this.callback);
    }

    setValue = (value: string | null) => {
        this.element.value = value ?? '';
    }

    flushValue = () => {
        const value = this.element.value;
        this.element.value = '';

        return value;
    }
}
