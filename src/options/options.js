const permissions = { origins: ["*://*/*"] }
const checkbox = document.getElementById("permission")
checkbox.onchange = async () => {
  if(checkbox.checked) {
    if(!(await browser.permissions.request(permissions)))
      checkbox.checked = false; // Denied by user
  }
  else {
    try{
      await browser.permissions.remove(permissions)
    } catch(e) { checkbox.checked = true } // Chrome refused removal.
  }
}

async function renderPermissions() {
  checkbox.checked = await browser.permissions.contains(permissions)
}
browser.permissions.onAdded.addListener(renderPermissions)
browser.permissions.onRemoved.addListener(renderPermissions)
renderPermissions() // Set initial checkbox state