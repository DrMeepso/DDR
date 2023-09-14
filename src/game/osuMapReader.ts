import { Note, LaneType, Slider } from "./game";
import * as zip from "@zip.js/zip.js"

export async function readFile(url: string | Blob, difficulty: string): Promise<any> {

    return new Promise(async (resolve, reject) => {

        let oszData
        if (typeof url == "string") {
            oszData = new zip.HttpReader(url)
        } else {
            oszData = new zip.BlobReader(url)
        }

        let oszReader = new zip.ZipReader(oszData)
        let files = await oszReader.getEntries()

        let osuFile: zip.Entry | undefined = files.filter((file) => file.filename.indexOf(".osu") != -1 && file.filename == difficulty)[0]

        if (osuFile == undefined || osuFile.getData == undefined) {

            reject("No osu file found in osz file")
            return

        }

        console.log(osuFile.filename)

        let osuData = await osuFile.getData(new zip.TextWriter())
        console.log(osuData)

        let info = getBeatmapInfo(osuData)

        let songFile: zip.Entry | undefined = files.find((file) => file.filename == info.general.AudioFilename)
        if (songFile == undefined || songFile.getData == undefined) {
            reject("No song file found in osz file")
            return
        }
        let songData = await songFile.getData(new zip.BlobWriter())

        let data = { "HitObjects": parseOsu(osuData), "SongData": songData }
        console.log(data)

        resolve(data)

    })

}

function parseOsu(osuContent: string) {

    let info = getBeatmapInfo(osuContent)
    console.log(info)

    var HitObjects: string[] = osuContent.split("[HitObjects]")[1].replaceAll("\r", "").split("\n").filter((line: string) => line != "")

    var Notes: Note[] = []

    var SliderVelo: number = info.difficulty.SliderMultiplier as unknown as number
    var BPM = info.timeingPoints[0].bpm as unknown as number
    
    HitObjects.forEach((HitObject: string) => {

        let thisHitObject = HitObject.split(",")
        let x = thisHitObject[0] as unknown as number
        let lane = Math.floor(x * 4 / 512)

        let time = thisHitObject[2] as unknown as number

        let sliderEnd = (thisHitObject[5].split(":")[0] as unknown as number)

        let dist = ((1920/480) * 100) * SliderVelo
        let bpmTime = 60/BPM

        const velocity = dist / bpmTime

        if (sliderEnd > 0) {

            let durration = sliderEnd - time

            let localSlider = new Slider(time, velocity, lane as LaneType, durration)
            Notes.push(localSlider)

        } else {

            let localNote = new Note(time, velocity, lane as LaneType)
            Notes.push(localNote)

        }


    })

    return Notes

}

export function getBeatmapInfo(beatmapText: string): { metadata: any, difficulty?: any, general: any, timeingPoints: any } {
    const sections = beatmapText.split(/\n\s*\[([^\]]+)\]\s*\n/);

    const metadataSection = sections.find(section => section.startsWith("Metadata"))
    const difficultySection = sections.find(section => section.startsWith("Difficulty"));
    const generalSection = sections.find(section => section.startsWith("General"));
    const timeingPointsSection = sections.find(section => section.startsWith("TimingPoints"));

    if (!metadataSection || !difficultySection || !generalSection || !timeingPointsSection) {
        throw new Error("Missing required sections in the beatmap file.");
    }

    const metadata = parseSection(sections[sections.indexOf(metadataSection) + 1]);
    const difficulty = parseSection(sections[sections.indexOf(difficultySection) + 1]);
    const general = parseSection(sections[sections.indexOf(generalSection) + 1]);
    const timeingPoints = parseTimingPoints(sections[sections.indexOf(timeingPointsSection) + 1]);

    return {
        metadata,
        difficulty,
        general,
        timeingPoints,
    };
}

function parseSection(sectionText: string) {
    const lines = sectionText.split("\n");

    const sectionData: Record<string, string> = {};

    for (const line of lines) {
        const [key, value] = line.split(":");
        if (key && value) {
            sectionData[key.trim()] = value.trim();
        }
    }

    return sectionData;
}

function parseTimingPoints(timingPoints: string) {

    let timingPointsArray = timingPoints.split("\n").filter((line: string) => line != "")

    let timingPointsObject: any[] = []

    timingPointsArray.forEach((timingPoint: string) => {

        let timingPointArray = timingPoint.split(",")

        let time = timingPointArray[0] as unknown as number
        let bpm = timingPointArray[1] as unknown as number

        timingPointsObject.push({ "time": time, "bpm": bpm })

    })

    return timingPointsObject

}

export function GetAllBeatmaps(url: string | Blob) {

    return new Promise(async (resolve, reject) => {

        let oszData 
        if (typeof url == "string") {
            oszData = new zip.HttpReader(url)
        } else {
            oszData = new zip.BlobReader(url)
        }

        let oszReader = new zip.ZipReader(oszData)
        let files = await oszReader.getEntries()

        let filesToRead: zip.Entry[] = files.filter(e => e.filename.indexOf(".osu") != -1)

        const beatmaps: any[] = []

        var prom = new Promise(async (resolve, reject) => {
            filesToRead.forEach(async (file, index) => {

                if (file.getData == undefined) return

                let osuData = await file.getData(new zip.TextWriter())

                let info = getBeatmapInfo(osuData)

                let songFile: zip.Entry | undefined = files.find((file) => file.filename == info.general.AudioFilename)
                if (songFile == undefined || songFile.getData == undefined) {
                    reject("No song file found in osz file")
                    return
                }
                let songData = await songFile.getData(new zip.BlobWriter())

                let data = { "SongData": songData, "Info": info, "Difficulty": index, "FileName": file.filename }
                beatmaps.push(data)

                if (index == filesToRead.length - 1) resolve(beatmaps)
            })
        })

        prom.then((beatmaps) => {
            resolve(beatmaps)
        })

    })

}

export function GetOSZInfo(url: string | Blob){

    return new Promise(async (resolve, reject) => {

        let oszData
        if (typeof url == "string") {
            oszData = new zip.HttpReader(url)
        } else {
            oszData = new zip.BlobReader(url)
        }

        let oszReader = new zip.ZipReader(oszData)
        let files = await oszReader.getEntries()

        let filetoread: zip.Entry | undefined = files.find(e => e.filename.indexOf(".osu") != -1)

        if (filetoread == undefined || filetoread.getData == undefined) return

        let osuData = await filetoread.getData(new zip.TextWriter())

        let info = getBeatmapInfo(osuData)
        delete info.difficulty

        resolve(info)

    })


}