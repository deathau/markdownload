globalThis.browser ??= chrome;

const permissions = { origins: ["*://*/*"] }
browser.permissions.contains(permissions).then(async (hasPermission) => {

  if(browser.sidePanel){
    browser.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error))
  }
  else {
    browser.action.onClicked.addListener(async (tab) => {
      if(!hasPermission) browser.sidebarAction.setPanel({panel: browser.runtime.getURL('/sidepanel/welcome.html')})
      else browser.sidebarAction.setPanel({panel: browser.runtime.getURL('/sidepanel/sidepanel.html')})
      browser.sidebarAction.open()
    })
  }
})
