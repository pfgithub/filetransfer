const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const fs = require("fs").promises;
const fileUpload = require("express-fileupload");
const crypto = require("crypto");
const os = require("os");

app.set("view engine", "ejs");

app.use(fileUpload({ safeFileNames: false }));

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
resips = process.env.RAWIP
    ? [["env", process.env.RAWIP]]
    : resips.filter(([name, addr]) => {
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
if (resips.length < 1) {
    console.log("No ip address. Launch with `env RAWIP=localhost`");
}
console.log("Launching on " + resips[0].join(" - "));
console.log();
baseURL = "http://" + resips[0][1] + ":" + port;
console.log("   " + baseURL + "/");
console.log();

app.get("/", async (req, res) => {
    if (req.query.uploaded && /[^a-z0-9]/.exec(req.query.uploaded))
        return res.render("error", { msg: "bad url" });
    res.render("index", {
        uploaded: req.query.uploaded,
        baseURL,
        s: !!req.query.s,
    });
});

app.use("/public", express.static(path.join(__dirname, "client")));

function safeFileName(f) {
    return f.replace(/[^ -~\x80-\uFFFF]/g,"�").replace(/^([.\-])/,"_$1").split("/").join("\\");
}

// app.post("/") // for cli
app.post("/upload", async (req, res) => {
    if (!req || !req.files || !req.files.upload)
        return res.redirect("/error/upload-failed");
    let fileid;
    if(req.body && req.body.id && typeof req.body.id === "string" && !/[^0-9a-z]/.exec(req.body.id)) {
        fileid = req.body.id;
    }else{
        fileid = await randomName();
    }
    let foldername = "/data/" + fileid;
    let basedir = path.join(__dirname, "..");
    await fs.mkdir(path.join(basedir, foldername), { recursive: true });
    let filearr = Array.isArray(req.files.upload)
        ? req.files.upload
        : [req.files.upload];
    for (let file of filearr) {
        let filename = path.join(foldername, safeFileName(file.name) );
        file.mv(path.join(basedir, filename));
    }
    return res.redirect("/info/" + fileid);
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
            for (let i = 4; i < str.length; i++) {
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
        let ffiltered = files.filter(file => file === req.params.filename);
        if (files.length === 1 || ffiltered.length === 1) {
            let f = files.length === 1 ? files[0] : ffiltered[0];
            if (get || f !== req.params.filename)
                return res.redirect(
                    "/" + mode + "/" + fileid + "/" + encodeURIComponent(f),
                );
            let filepath = path.join(foldername, f);
            if (mode === "view") res.sendFile(filepath);
            else res.download(filepath);
        } else {
            res.render("listing", { id: fileid, baseURL, files });
        }
    };
}

function showFileList(deleteconfirm) {
    return async(req, res, next) => {
        let fileid = req.params.fileid ?? "";
        fileid = fileid.toLowerCase();
        if (!fileid || /[^0-9a-z]/.exec(fileid))
            return res.render("error", { msg: "bad id" });
        const foldername = path.join(__dirname, "..", "data", fileid);
        let files;
        try {
            files = await fs.readdir(foldername);
        } catch (e) {
            console.log(e);
            res.status(404);
            return res.render("error", {msg: "file not found"});
        }
        return res.render("listing", {id: fileid, baseURL, files, deleteconfirm: !!deleteconfirm});
    };
}

app.get("/info/:fileid", showFileList());
app.get("/delete/:fileid", showFileList("deleteconfirm"));
app.get("/info", (req, res, next) => {
    if(!req.query.id) return res.redirect("/");
    return res.redirect("/info/"+encodeURIComponent(req.query.id));
});
app.post("/delete/:fileid", async (req, res, next) => {
    let fileid = req.params.fileid ?? "";
    fileid = fileid.toLowerCase();
    if (!fileid || /[^0-9a-z]/.exec(fileid))
        return res.render("error", { msg: "bad id" });
    const foldername = path.join(__dirname, "..", "data", fileid);
    try {
        await fs.rm(foldername, {recursive: true});
    } catch(e) {
        console.log(e);
        res.status(404);
        return res.render("error", {msg: "file not found"});
    }
    return res.redirect("/");
})

app.get("/view/:fileid/:filename?", downloadFile("view"));
app.get("/download/:fileid/:filename?", downloadFile("download"));

app.use((req, res, next) => {
    res.status(404);
    res.render("error", { msg: "404 not found" });
});

http.listen(port, () => {
    console.log("Server started on port " + port);
});
