import localforge from "localforage"
import { GetAllBeatmaps, GetOSZInfo } from "./game/osuMapReader";

var downloadedBeatmaps: any = {}

localforge.config({
    name: "osuWebPlayer",
    storeName: "beatmaps",
    driver: localforge.INDEXEDDB
})

export default function Render(deltaTime: number, ctx: CanvasRenderingContext2D) {

    // render black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 1080, 1920);


}

function blobToDataURL(blob: Blob, callback: Function) {
    var a = new FileReader();
    a.onload = function (e: any) { callback(e.target.result); }
    a.readAsDataURL(blob);
}

function ReloadMaps() {

    localforge.keys().then((keys) => {

        keys.forEach((key) => {

            localforge.getItem(key).then(async (value) => {

                downloadedBeatmaps[key] = value

                blobToDataURL(downloadedBeatmaps[key], async (dataURI: string) => {

                    let beatmaps = await GetAllBeatmaps(dataURI)
                    let chartInfo = await GetOSZInfo(dataURI)

                    window.LoadedSongs[key] = {

                        "OszData": dataURI,
                        "Info": chartInfo,
                        "AllBeatmaps": beatmaps

                    }

                })


            })

        })

    })

}

export async function setupMenu() {

    // get all entries in index.db

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

                })

            })

            document.getElementById("BeatmapHolder")!.appendChild(beatMap)

        })

    })()

}