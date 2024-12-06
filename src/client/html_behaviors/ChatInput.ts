
interface HTMLHandlerInterface {
    enable(): void,
    disable(): void,
}
export class ChatInput implements HTMLHandlerInterface {

    element: HTMLTextAreaElement;
    inputCallback: (toSubmit: boolean) => void;

    constructor(id: string, input: (toSubmit: boolean) => void) {
        this.element = document.getElementById(id) as HTMLTextAreaElement;
        this.inputCallback = input.bind(this);
    }

    enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('keyup', event => this.inputCallback(event.key === 'Enter'));
    }

    disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('keyup', event => this.inputCallback(event.key === 'Enter'));
    }

    setValue = (value: string | null) => {
        this.element.value = value ?? '';
    }

    public flushValue = () => {
        const value = this.element.value;
        this.element.value = '';

        return value;
    }
}
