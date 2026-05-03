const button = document.querySelector("#submit");
const from = document.querySelector("#from");
const email = document.querySelector("#email");
const theme = document.querySelector("#theme");
const start = document.querySelector("#start");
var output = document.querySelector("#output");
const copy = document.querySelector("#copy");
const folder = document.querySelector("#folder");
const setFolder = document.querySelector("#setFolder");

button.addEventListener("click", () => {
    const valueFrom = from.value;
    const valueEmail = email.value;
    const valueTheme = theme.value;
    const valueStart = start.value;
    const values = [valueFrom, valueEmail, valueTheme, valueStart];
    const json = JSON.stringify(values);
    console.log(from, valueFrom, values, json)
    output.innerHTML = json;
});

copy.addEventListener("click", () => {
    navigator.clipboard.writeText(output.innerHTML);
});

setFolder.addEventListener("click", () => {
    const valueFolder = folder.value;
    chrome.storage.sync.set({ "folder": valueFolder});
})
