const permissions = { origins: ["*://*/*"] }
document.getElementById('premissions').addEventListener('click', async() => {
  await browser.permissions.request(permissions)
  location.reload()
})

// ref: https://stackoverflow.com/questions/64330672/referenceerror-browser-is-not-defined
if (typeof browser === "undefined") {
    var browser = chrome;
}

browser.permissions.contains(permissions).then((hasPermission) => {
  if(hasPermission) location.replace(browser.runtime.getURL('/sidepanel/sidepanel.html'))
})