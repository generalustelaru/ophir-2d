import { HTMLHandlerInterface } from '~/client_types';
import { Unique } from '~/shared_types';

export class ChatInput implements Unique<HTMLHandlerInterface> {

    public element: HTMLTextAreaElement;
    public inputCallback: (toSubmit: boolean) => void;

    constructor(id: string, input: (toSubmit: boolean) => void) {
        this.element = document.getElementById(id) as HTMLTextAreaElement;
        this.inputCallback = input.bind(this);
    }

    public enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('keyup', event => this.inputCallback(event.key === 'Enter'));
    };

    public disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('keyup', event => this.inputCallback(event.key === 'Enter'));
    };

    public setValue = (value: string | null) => {
        this.element.value = value ?? '';
    };

    public flushValue = () => {
        const value = this.element.value;
        this.element.value = '';

        return value;
    };
}
