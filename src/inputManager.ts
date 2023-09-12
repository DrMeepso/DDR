export class InputManager extends EventTarget {

    GameKeys: any = {

        left: "D",
        down: "F",
        up: "J",
        right: "K"

    }

    constructor() {

        super();

        document.addEventListener("keydown", (e) => {

            if (e.repeat) return;

            this.dispatchEvent(new CustomEvent("keydown", { detail: e }));

            for (let key in this.GameKeys) {

                let thisKey:string = this.GameKeys[key]
                if (e.key == thisKey.toLocaleLowerCase()) {

                    this.dispatchEvent(new CustomEvent("gamekeydown", { detail: key }));

                }

            }

        });

        document.addEventListener("keyup", (e) => {

            this.dispatchEvent(new CustomEvent("keyup", { detail: e }));

            for (let key in this.GameKeys) {

                let thisKey:string = this.GameKeys[key]
                if (e.key == thisKey.toLocaleLowerCase()) {

                    this.dispatchEvent(new CustomEvent("gamekeyup", { detail: key }));

                }

            }

        });

    }

    SetGameKeys(left: string, down: string, up: string, right: string) {
        this.GameKeys.left = left;
        this.GameKeys.down = down;
        this.GameKeys.up = up;
        this.GameKeys.right = right;
    }

}