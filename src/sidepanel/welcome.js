const permissions = { origins: ["*://*/*"] }
document.getElementById('premissions').addEventListener('click', async() => {
  await browser.permissions.request(permissions)
  location.reload()
})

browser.permissions.contains(permissions).then((hasPermission) => {
  if(hasPermission) location.replace(browser.runtime.getURL('/sidepanel/sidepanel.html'))
})