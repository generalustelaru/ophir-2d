import { HTMLHandlerInterface } from '~/client_types';
import { Unique } from '~/shared_types';

export class TextInput implements Unique<HTMLHandlerInterface> {

    private element: HTMLInputElement;
    private inputCallback: () => void;

    constructor(id: string, input: () => void) {
        this.element = document.getElementById(id) as HTMLInputElement;
        this.inputCallback = input.bind(this);
    }

    public enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('input', this.inputCallback);
    };

    public disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('input', this.inputCallback);
    };

    public setValue = (value: string | null) => {
        this.element.value = value ?? '';
    };
}
