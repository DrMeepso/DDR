import { InputManager } from "../inputManager";
import { readFile, getBeatmapInfo } from "./osuMapReader";

const canvas = document.getElementById("GameRender") as HTMLCanvasElement;

const DownKeys: any = {

    left: false,
    down: false,
    up: false,
    right: false

}

export enum LaneType {

    Left,
    Down,
    Up,
    Right

}

const SongInfo = {

    Speed: 1,
    Durration: 1000,

}

export class Note {

    time: number;
    speed: number;
    lane: LaneType;

    constructor(time: number, speed: number, lane: LaneType = LaneType.Down) {

        this.time = time;
        this.speed = speed;
        this.lane = lane;

    }

    isOnScreen(time: number): boolean {

        let distane = Math.sqrt(Math.pow(NoteStartingHeight, 2) + Math.pow(judgeMentLine, 2));
        let StartTime = this.time - ((distane / this.speed) * 1000);

        let distance2 = 125 + 100;
        let EndTime = this.time + ((distance2 / this.speed) * 1000);
        return time >= StartTime && time <= EndTime;

    }

    getY(time: number): number {

        let distane = Math.sqrt(Math.pow(NoteStartingHeight, 2) + Math.pow(judgeMentLine, 2));
        let StartTime = this.time - ((distane / this.speed) * 1000);
        let EndTime = this.time;

        function lerp(a: number, b: number, t: number) {
            return a + (b - a) * t;
        }

        let t = (time - StartTime) / (EndTime - StartTime)

        return lerp(NoteStartingHeight, judgeMentLine, t);

    }

}

export class Slider extends Note {

    durration: number;
    missed: boolean = false;
    isBeingHeld: boolean = false;

    constructor(time: number, speed: number, lane: LaneType = LaneType.Down, durration: number) {

        super(time, speed, lane);
        this.durration = durration;
        this.missed = false;

    }

    isOnScreen(time: number): boolean {

        let distane = Math.sqrt(Math.pow(NoteStartingHeight, 2) + Math.pow(judgeMentLine, 2));
        let StartTime = this.time - ((distane / this.speed) * 1000);

        let EndTime = this.time + this.durration

        return time >= StartTime && time <= EndTime;

    }

    getLength(): number {

        if (this.isBeingHeld) {
            let len = (-(this.durration / 1000) * this.speed) - -(this.getY(time) - judgeMentLine);
            return len < 0 ? len : 0;
        } else {
            return (this.durration / 1000) * this.speed;
        }

    }


}

var MapNotes: Note[] = []

var time = 0;

const SongPlayer = document.createElement("audio") as HTMLAudioElement;

export function setupGame() {

    var GameInput = window.InputManager

    document.body.append(SongPlayer)
    SongPlayer.volume = 0.2

    GameInput.addEventListener("gamekeydown", (e: any) => {

        DownKeys[e.detail] = true;

        let Lane = Object.values(LaneType).indexOf(e.detail.charAt(0).toUpperCase() + e.detail.slice(1))
        let closestNote = MapNotes.filter((note) => note.lane == Lane && note.isOnScreen(time)).sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0]

        if (closestNote instanceof Slider) {

            let MaxTimeOut = (300 / closestNote.speed) * 1000
            if (Math.abs(closestNote.time - time) < MaxTimeOut) {
                closestNote.isBeingHeld = true;
                AddToScore(MaxTimeOut, Math.abs(closestNote.time - time))
            }

        } else {

            let MaxTimeOut = (300 / closestNote.speed) * 1000
            if (Math.abs(closestNote.time - time) < MaxTimeOut) {
                // remove note
                MapNotes.splice(MapNotes.indexOf(closestNote), 1)
                AddToScore(MaxTimeOut, Math.abs(closestNote.time - time))
            }

        }

    });

    GameInput.addEventListener("gamekeyup", (e: any) => {

        DownKeys[e.detail] = false;

        let Lane = Object.values(LaneType).indexOf(e.detail.charAt(0).toUpperCase() + e.detail.slice(1))
        let closestNote = MapNotes.filter((note) => note instanceof Slider && note.isBeingHeld && note.lane == Lane).sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0]

        if (closestNote instanceof Slider) {

            let MaxTimeOut = (300 / closestNote.speed) * 1000

            if (Math.abs((parseFloat(closestNote.time.toString()) + closestNote.durration) - time) < MaxTimeOut) {
                // remove note
                MapNotes.splice(MapNotes.indexOf(closestNote), 1)
                AddToScore(MaxTimeOut, Math.abs((parseFloat(closestNote.time.toString()) + closestNote.durration) - time), false, false)
            } else {
                closestNote.isBeingHeld = false;
                closestNote.missed = true;
                AddToScore(1, 0, true)
            }

        }

    });

    window.GameStateManager.addEventListener("startgame", (e: any) => {

        GameInfo.Score = 0;
        GameInfo.Accuaracy = 0;
        GameInfo.AccuaracyInfo.GrossAccuaracy = 0;
        GameInfo.AccuaracyInfo.Count = 0;
        GameInfo.Combo = 0;

        SongPlayer.currentTime = 0;

        let URL = e.detail.BeatmapURL;
        let Difficulty = e.detail.Difficulty;

        readFile(URL, Difficulty).then((data) => {

            MapNotes = data.HitObjects;

            function blobToDataURL(blob: Blob, callback: Function) {
                var a = new FileReader();
                a.onload = function (e: any) { callback(e.target.result); }
                a.readAsDataURL(blob);
            }

            blobToDataURL(data.SongData, (dataURI: string) => {
                let uri = dataURI.replace("application/octet-stream", "audio/mpeg")
                SongPlayer.src = uri;
                SongPlayer.play();
            })


        })


    })


}

var NoteStartingHeight = -100;
var judgeMentLine = canvas.height - 125;

const GameInfo = {

    Score: 0,
    Accuaracy: 0,
    AccuaracyInfo: {
        GrossAccuaracy: 0,
        Count: 0,
    },
    Combo: 0

}

function AddToScore(maxDistance: number, distance: number, miss: boolean = false, countAsCombo: boolean = true) {

    if (miss) {
        GameInfo.Combo = 0;
    } else {
        let thisScore = Math.round(300 - (300 * (distance / maxDistance)))
        GameInfo.Score += thisScore;
        GameInfo.Combo += countAsCombo ? 1 : 0;
    }

    GameInfo.AccuaracyInfo.Count += 1;
    GameInfo.AccuaracyInfo.GrossAccuaracy += miss ? 0 : 1;
    GameInfo.Accuaracy = GameInfo.AccuaracyInfo.GrossAccuaracy / GameInfo.AccuaracyInfo.Count;

}

export default function Render(deltaTime: number, ctx: CanvasRenderingContext2D) {

    time = SongPlayer.currentTime * 1000;

    judgeMentLine = canvas.height - 125;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw input keys as circles at the bottom of the screen
    ctx.fillStyle = "#ffffff";

    let missedSliders: any = MapNotes.filter((note) => note instanceof Slider && note.missed == true)
    for (let i = 0; i < missedSliders.length; i++) {

        let note: Slider = missedSliders[i];

        ctx.globalAlpha = 0.5;

        let x = note.lane * (canvas.width / 4) + (canvas.width / 8);

        // draw line between start and end
        ctx.beginPath();
        ctx.moveTo(x, note.getY(time));
        ctx.lineTo(x, note.getY(time) - note.getLength());
        ctx.stroke();

        ctx.globalAlpha = 1;

    }

    let pos = canvas.width / 4
    var i = 0;
    for (let key in DownKeys) {

        if (DownKeys[key] == true) {
            ctx.fillStyle = "#ff0000";
        } else {
            ctx.fillStyle = "#ffffff";
        }

        ctx.beginPath();
        ctx.arc(((pos) * i) + (pos / 2), judgeMentLine, 100, 0, 2 * Math.PI);
        ctx.fill();

        i++

    }

    // render notes
    ctx.fillStyle = "#ffffff";

    for (let note of MapNotes) {

        if (note instanceof Slider) {

            ctx.globalAlpha = 1;

            if (!note.isOnScreen(time) || note.getLength() == 0) continue;

            // make stroke thicker
            ctx.lineWidth = 200;
            // round line ends
            ctx.lineCap = "round";
            ctx.fillStyle = "#0000ff";
            ctx.strokeStyle = "#0000ff";

            if (note.missed == true) {
                continue;
            }

            let missTime = (200 / note.speed) * 1000
            if (time - missTime > note.time && !note.isBeingHeld && note.missed == false) {
                note.missed = true;
                AddToScore(1, 0, true)
            }

            if (note.isBeingHeld) {

                let x = note.lane * (canvas.width / 4) + (canvas.width / 8);

                // draw line between start and end
                ctx.beginPath();
                ctx.moveTo(x, judgeMentLine);
                ctx.lineTo(x, judgeMentLine + note.getLength());
                ctx.stroke();

            } else {

                let x = note.lane * (canvas.width / 4) + (canvas.width / 8);

                // draw line between start and end
                ctx.beginPath();
                ctx.moveTo(x, note.getY(time));
                ctx.lineTo(x, note.getY(time) - note.getLength());
                ctx.stroke();

            }

        } else {

            ctx.fillStyle = "#ffffff";

            let missTime = (200 / note.speed) * 1000
            if (time - missTime > note.time) {
                MapNotes.splice(MapNotes.indexOf(note), 1)
                AddToScore(1, 0, true)
            }

            if (!note.isOnScreen(time)) continue;

            let x = note.lane * (canvas.width / 4) + (canvas.width / 8);

            ctx.beginPath();
            ctx.arc(x, note.getY(time), 100, 0, 2 * Math.PI);
            ctx.fill();

        }

    }

    // draw stats on screen
    ctx.fillStyle = "#ffffff";
    ctx.font = "30px Arial";
    ctx.fillText("Score: " + GameInfo.Score, 10, 30);
    ctx.fillText("Accuaracy: " + (GameInfo.Accuaracy * 100).toFixed(2) + "%", 10, 60);
    ctx.fillText("Combo: " + GameInfo.Combo, 10, 90);

}