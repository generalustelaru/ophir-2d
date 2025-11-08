import { HTMLHandlerInterface, Unique } from '~/client_types';

export class Button implements Unique<HTMLHandlerInterface> {

    element: HTMLButtonElement;
    callback: () => void;

    constructor(id: string, callback: () => void) {
        this.element = document.getElementById(id) as HTMLButtonElement;
        this.callback = callback.bind(this);
    }

    enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('click', this.callback);
    };

    disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('click', this.callback);
    };
}
