// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "addMatchCondition",
        title: "添加匹配条件",
        contexts: ["link"]
    });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "addMatchCondition") {
        const tabId = tab.id;
        const { frameUrl, frameId } = info;
        const isCrossOrigin = frameId &&
            new URL(frameUrl).origin !== new URL(tab.url).origin;

        if (isCrossOrigin && !await chrome.permissions.request({ origins: [frameUrl] }))
            return;

        const [{ message: err, result }] = await chrome.scripting.executeScript({
            target: { tabId, frameIds: [frameId] },
            injectImmediately: true,
            func: findLink,
        }).catch(e => [e]);

        chrome.action.setTitle({
            tabId,
            title: result ? '' : `${err}`,
        });
        if (isCrossOrigin)
            chrome.permissions.remove({ origins: [frameUrl] });
        console.log(result);
        if (result) {
            chrome.action.openPopup();
            chrome.storage.local.set({ pendingAltText: result });
        }
    }
}); 
function findLink() {
  let el;
  let root = document;
  while (
    (el = root.activeElement) &&
    (root = el.shadowRoot || chrome.dom.openOrClosedShadowRoot(el))
  ) {/*nop*/}
  return el.innerText;
}