import localforge from "localforage"
import { GetAllBeatmaps, GetOSZInfo } from "./game/osuMapReader";
import { GameState } from "./main";

var downloadedBeatmaps: any = {}

localforge.config({
    name: "osuWebPlayer",
    storeName: "beatmaps",
    driver: localforge.INDEXEDDB
})

var CursorIndex = 0
var DifficultyIndex = 0

var Diffs: any = {}

var SelectingDiff = false

export default function Render(deltaTime: number, ctx: CanvasRenderingContext2D) {

    // render black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 1080, 1920);

    Object.values(window.LoadedSongs).forEach((song: any, index: number) => {

        let x = 25
        let y = (index + 1) * 40

        if (SelectingDiff == false) {
            if (CursorIndex == index) {
                ctx.fillStyle = "#00FF00"
            } else {
                ctx.fillStyle = "#FFFFFF"
            }
        } else {
            ctx.fillStyle = "#FFFFFF"
            if (CursorIndex == index) {
                ctx.globalAlpha = 1
            } else {
                ctx.globalAlpha = 0.5
            }
        }
        ctx.font = "30px Arial"
        ctx.fillText(`${song.Info.metadata.Title} - ${song.Info.metadata.Artist}`, x, y)

        ctx.globalAlpha = 1

        if (CursorIndex == index) {
            ctx.fillStyle = "#ffffff"

            Diffs = song.AllBeatmaps
            song.AllBeatmaps.forEach((diff: any, index: number) => {

                if (DifficultyIndex == index && SelectingDiff) {
                    ctx.fillStyle = "#00FF00"
                } else {
                    ctx.fillStyle = "#FFFFFF"
                }

                let x = 650
                let y = (index + 1) * 40

                ctx.fillText(`${diff.Info.metadata.Version} - ${diff.Info.difficulty.OverallDifficulty}★`, x, y)


            })

        }

    })


}

function ReloadMaps() {

    localforge.keys().then((keys) => {

        keys.forEach((key) => {

            localforge.getItem(key).then(async (value) => {

                downloadedBeatmaps[key] = value

                let beatmaps = await GetAllBeatmaps(downloadedBeatmaps[key])
                let chartInfo = await GetOSZInfo(downloadedBeatmaps[key])

                window.LoadedSongs[key] = {

                    "OszData": downloadedBeatmaps[key],
                    "Info": chartInfo,
                    "AllBeatmaps": beatmaps

                }


            })

        })

    })

}

export async function setupMenu() {

    // get all entries in index.db

    window.InputManager.addEventListener("keydown", (e: any) => {

        if (e.detail.key == "ArrowDown") {

            if (SelectingDiff) {
                DifficultyIndex++
                if (DifficultyIndex > Diffs.length - 1) DifficultyIndex = 0
            } else {
                CursorIndex++
                if (CursorIndex > Object.values(window.LoadedSongs).length - 1) CursorIndex = 0
            }

        }

        if (e.detail.key == "ArrowUp") {

            if (SelectingDiff) {
                DifficultyIndex--
                if (DifficultyIndex < 0) DifficultyIndex = Diffs.length - 1
            } else {
                CursorIndex--
                if (CursorIndex < 0) CursorIndex = Object.values(window.LoadedSongs).length - 1
            }

        }

        if (e.detail.key == "ArrowRight") {

            if (SelectingDiff == false) {
                SelectingDiff = true
                DifficultyIndex = 0
            }

        }

        if (e.detail.key == "ArrowLeft") {

            if (SelectingDiff == true) {
                SelectingDiff = false
                DifficultyIndex = 0
            }

        }

        if (e.detail.key == "Enter") {

            if (SelectingDiff && window.GameInfo.state == GameState.Menu) {

                window.globalFunctions.changeState(2)
                let song: any = Object.values(window.LoadedSongs)[CursorIndex]
                window.globalFunctions.startGame(song.OszData, Diffs[DifficultyIndex].FileName)

            }

        }

    })


    ReloadMaps()

    document.getElementById("CloseSongs")?.addEventListener("click", () => {

        const SongSelect = document.getElementById("SongSelect") as HTMLDialogElement;
        SongSelect.close()

    })

    const SongSelect = document.getElementById("SongSelect") as HTMLDialogElement;
    SongSelect.showModal();

    (async () => {

        let beatmaps = await fetch("https://api.chimu.moe/v1/search?mode=3")
        let beatmapsJson = await beatmaps.json()

        let maps: any = {}

        beatmapsJson.data.forEach((map: any) => {

            if (map.ChildrenBeatmaps.filter((e: any) => e.CS == 4).length > 0) {

                maps[map.Title] = map
                map.ChildrenBeatmaps.forEach((diff: any) => {

                    if (diff.CS != 4) {
                        delete maps[map.Title]
                    }

                })

                // sort maps on star rating
                map.ChildrenBeatmaps.sort((a: any, b: any) => {

                    return b.StarRating - a.StarRating

                })


            }

        })

        Object.values(maps).forEach((map: any) => {

            let beatMapHTML = document.getElementById("TemplateBeatmap") as HTMLDivElement;
            let beatMap = beatMapHTML.cloneNode(true) as HTMLDivElement;

            beatMap.querySelector(".BeatMapTitle")!.innerHTML = map.Title
            beatMap.querySelector(".BeatMapArtist")!.innerHTML = map.Artist
            beatMap.querySelector(".BeatMapDifficulty")!.innerHTML = map.ChildrenBeatmaps.length + " Difficulties"
            beatMap.querySelector("img")!.src = `https://assets.ppy.sh/beatmaps/${map.SetId}/covers/list.jpg`
            beatMap.id = ""

            beatMap.querySelector(".DownloadButton")?.setAttribute("BeatmapID", map.SetId)
            beatMap.querySelector(".DownloadButton")?.addEventListener("click", async (e) => {

                // download the map osz file and save it to index.db
                let beatmapID = map.SetId
                let beatmap = await fetch("https://api.nerinyan.moe" + map.ChildrenBeatmaps[0].DownloadPath)
                let beatmapBlob = await beatmap.blob()
                let beatmapURL = URL.createObjectURL(beatmapBlob)

                localforge.config({
                    name: "osuWebPlayer",
                    storeName: "beatmaps",
                    driver: localforge.INDEXEDDB
                })

                localforge.setItem(beatmapID, beatmapBlob).then(() => {

                    console.log("beatmap downloaded and saved to index.db")
                    ReloadMaps()

                })

            })

            document.getElementById("BeatmapHolder")!.appendChild(beatMap)

        })

    })()

}

export async function downloadBeatmapFromID(id: number | string) {

    // download the map osz file and save it to index.db
    let beatmapID = id
    let beatmap = await fetch("https://api.nerinyan.moe/d/" + id)
    let beatmapBlob = await beatmap.blob()
    let beatmapURL = URL.createObjectURL(beatmapBlob)

    localforge.config({
        name: "osuWebPlayer",
        storeName: "beatmaps",
        driver: localforge.INDEXEDDB
    })

    localforge.setItem(String(beatmapID), beatmapBlob).then(() => {

        console.log("beatmap downloaded and saved to index.db")

    })

}