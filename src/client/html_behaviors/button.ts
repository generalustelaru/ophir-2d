import { HTMLHandlerInterface } from '~/client_types';
import { Unique } from '~/shared_types';

export class Button implements Unique<HTMLHandlerInterface> {

    private element: HTMLButtonElement;
    private callback: () => void;

    constructor(id: string, callback: () => void) {
        this.element = document.getElementById(id) as HTMLButtonElement;
        this.callback = callback.bind(this);
    }

    public enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('click', this.callback);
    };

    public disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('click', this.callback);
    };
}
