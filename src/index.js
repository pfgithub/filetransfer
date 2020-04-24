const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const fs = require("fs").promises;
const fileUpload = require("express-fileupload");
const crypto = require("crypto");
const os = require("os");

app.set("view engine", "ejs");

app.use(fileUpload({ safeFileNames: true, preserveExtension: true }));

let port = +(process.env.PORT || "3000");
let ifaces = os.networkInterfaces();
let resips = [];
for (let [name, faces] of Object.entries(ifaces)) {
    let indx = 0;
    for (let face of faces) {
        if (face.family !== "IPv4" || face.internal) {
            continue; // ipv4 only, exclude internal
        }
        resips.push([name + ":" + indx, face.address]);
        indx++;
    }
}
resips = resips.filter(([name, addr]) => {
    if (process.env.IPADDR) return addr === process.env.IPADDR;
    if (process.env.IFACE) return name === process.env.IFACE;
    return true;
});
if (resips.length > 1) {
    console.log(
        "Too many ip addresses. Launch with a listed env command to select correct address.",
    );
    console.log(
        "Address will be used to show links and QR codes to download files.",
    );
    console.log();
    for (let [name, addr] of resips) {
        console.log("env IPADDR=" + addr + " (or) env IFACE=" + name);
    }
    process.exit(1);
}
console.log("Launching on " + resips[0].join(" - "));
console.log();
baseURL = "http://" + resips[0][1] + ":" + port;
console.log("   " + baseURL + "/");
console.log();

app.get("/", async (req, res) => {
    if (req.query.uploaded && /[^a-z0-9]/.exec(req.query.uploaded))
        return res.render("error", { msg: "bad url" });
    res.render("index", { uploaded: req.query.uploaded, baseURL });
});

app.use("/public", express.static(path.join(__dirname, "client")));

// app.post("/") // for cli
app.post("/upload", async (req, res) => {
    if (!req || !req.files || !req.files.upload)
        return res.redirect("/error/upload-failed");
    let fileid = await randomName();
    let foldername = "/data/" + fileid;
    let filename = path.join(foldername, req.files.upload.name /*safe*/);
    let basedir = path.join(__dirname, "..");
    await fs.mkdir(path.join(basedir, foldername), { recursive: true });
    req.files.upload.mv(path.join(basedir, filename));
    return res.redirect("/?uploaded=" + fileid);
});

// this is unnecessarily complicated
function randomName() {
    return new Promise(resolve => {
        crypto.randomBytes(16, async (err, buffer) => {
            let str = buffer
                .toString("hex")
                .replace(/[0-9]/g, char =>
                    String.fromCodePoint(
                        char.codePointAt() +
                            ("g".codePointAt() - "0".codePointAt()),
                    ),
                );
            for (let i = 4; i < str.length - 3; i++) {
                let strv = str.substring(0, i);
                try {
                    await fs.access(path.join(__dirname, "..", "data", strv));
                    continue;
                } catch (e) {}
                resolve(strv);
                break;
            }
        });
    });
}

function downloadFile(mode, get) {
    return async (req, res, next) => {
        if (get && !req.query.id)
            return res.render("error", { msg: "missing id" });
        let fileid = get ? req.query.id : req.params.fileid.toLowerCase();
        if (/[^0-9a-z]/.exec(fileid))
            return res.render("error", { msg: "bad id" });
        let foldername = path.join(__dirname, "..", "data", fileid);
        let files;
        try {
            files = await fs.readdir(foldername);
        } catch (e) {
            res.status(404);
            return res.render("error", { msg: "file not found" });
        }
        if (files.length > 1) throw new Error("too many files");
        if (files.length < 1) throw new Error("too few files");
        if (get || files[0] !== req.params.filename)
            return res.redirect(
                "/" + mode + "/" + fileid + "/" + encodeURIComponent(files[0]),
            );
        let filepath = path.join(foldername, files[0]);
        if (mode === "view") res.sendFile(filepath);
        else res.download(filepath);
    };
}

app.get("/view/:fileid/:filename?", downloadFile("view"));
app.get("/view", downloadFile("view", "url"));
app.get("/download/:fileid/:filename?", downloadFile("download"));
app.get("/download", downloadFile("download", "url"));

app.use((req, res, next) => {
    res.status(404);
    res.render("error", { msg: "404 not found" });
});

http.listen(port, () => {
    console.log("Server started on port " + port);
});
