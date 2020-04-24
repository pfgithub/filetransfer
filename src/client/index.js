let uploadEl = document.getElementById("upload");
let dropAnywhereEl = document.getElementById("dropanywhere");
let formEl = document.getElementById("uploadform");
let uploadingEl = document.getElementById("uploading");

uploadEl.addEventListener("change", e => {
    uploading.classList.add("show");
    formEl.submit();
});
document.getElementById("jsdelete").remove();

let counter = 0;
document.addEventListener(
    "dragenter",
    e => {
        if (e.dataTransfer.types.includes("Files")) {
            counter++;
            uploadEl.classList.add("fullscreen");
            dropAnywhereEl.classList.add("fullscreen");
        }
    },
    { capture: true },
);
document.addEventListener(
    "dragleave",
    e => {
        if (e.dataTransfer.types.includes("Files")) {
            counter--;
            console.log(counter, name);
            if (counter <= 0) {
                counter = 0;
                uploadEl.classList.remove("fullscreen");
                dropAnywhereEl.classList.remove("fullscreen");
            }
        }
    },
    { capture: true },
);
