
export class Button {
    constructor(id, callback) {
        this.element = document.getElementById(id);
        this.callback = callback;
    }

    enable = () => {
        this.element.disabled = false;
        this.element.addEventListener('click', () => this.callback());
    }

    disable = () => {
        this.element.disabled = true;
        this.element.removeEventListener('click', () => this.callback());
    }
}
