import { InputManager } from "./inputManager";

const canvas = document.getElementById('GameRender') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

import Menu, { setupMenu } from "./menu";
import Game, { setupGame } from "./game/game";

export enum GameState {

    Menu,
    Pause,
    Playing,
    GameOver

}

const GameInfo = {

    state: GameState.Menu,

}

const UserSettings = {

    InputSettings: {

        left: "D",
        down: "F",
        up: "J",
        right: "K",

        SongOffset: 0,

    }

}

const GameStateManager = new EventTarget();

const GameInputManager = new InputManager();
GameInputManager.SetGameKeys(UserSettings.InputSettings.left, UserSettings.InputSettings.down, UserSettings.InputSettings.up, UserSettings.InputSettings.right);

const globalFunctions: any = {



}

declare global {

    interface Window {
        UserSettings: any;
        InputManager: InputManager;
        GameStateManager: EventTarget;
        GameInfo: any;
        globalFunctions: any;
        LoadedSongs: any;
        mapInfo: any;
    }

}

window.UserSettings = UserSettings;
window.InputManager = GameInputManager;
window.GameStateManager = GameStateManager;
window.GameInfo = GameInfo;
window.globalFunctions = globalFunctions;
window.LoadedSongs = {};
window.mapInfo = {};

canvas.width = 1080;
canvas.height = 1920;

setupGame();
setupMenu();

var LastFrame = Date.now();
setInterval(() => {

    let CurrentFrame = Date.now();
    let DeltaTime = CurrentFrame - LastFrame;
    LastFrame = CurrentFrame;

    switch (GameInfo.state) {

        case GameState.Menu:
            Menu(DeltaTime, ctx);
            break;
        case GameState.Playing:
            Game(DeltaTime, ctx);
            break;

    }

}, 1000 / 60)

GameStateManager.addEventListener("stateChange", (e: any) => {

    GameInfo.state = e.detail.state;

})

globalFunctions.changeState = (state: GameState) => {

    GameStateManager.dispatchEvent(new CustomEvent("stateChange", { detail: { state } }))

}

globalFunctions.startGame = (BeatmapURL: string, Difficulty: number) => {

    GameStateManager.dispatchEvent(new CustomEvent("startgame", { detail: { BeatmapURL, Difficulty } }))

}

import { downloadBeatmapFromID } from "./menu";

globalFunctions.downloadBeatmapFromID = downloadBeatmapFromID;