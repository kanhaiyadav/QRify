export default defineBackground(() => {
    // Create context menu items on installation
    chrome.runtime.onInstalled.addListener(() => {
        // Menu for links
        chrome.contextMenus.create({
            id: "qr-link",
            title: "Generate QR Code for Link",
            contexts: ["link"],
        });

        // Menu for selected text
        chrome.contextMenus.create({
            id: "qr-text",
            title: "Generate QR Code for Text",
            contexts: ["selection"],
        });

        // Menu for images
        chrome.contextMenus.create({
            id: "qr-image",
            title: "Generate QR Code for Image",
            contexts: ["image"],
        });

        // Menu for videos
        chrome.contextMenus.create({
            id: "qr-video",
            title: "Generate QR Code for Video",
            contexts: ["video"],
        });

        // Menu for audio
        chrome.contextMenus.create({
            id: "qr-audio",
            title: "Generate QR Code for Audio",
            contexts: ["audio"],
        });
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        let data: any = {
            type: "",
            content: "",
            url: tab?.url || "",
        };

        switch (info.menuItemId) {
            case "qr-link":
                data.type = "link";
                data.content = info.linkUrl || "";
                break;
            case "qr-text":
                data.type = "text";
                data.content = info.selectionText || "";
                break;
            case "qr-image":
                data.type = "image";
                data.content = info.srcUrl || "";
                break;
            case "qr-video":
                data.type = "video";
                data.content = info.srcUrl || "";
                break;
            case "qr-audio":
                data.type = "audio";
                data.content = info.srcUrl || "";
                break;
        }

        // Open QR window
        chrome.windows.create({
            url: chrome.runtime.getURL(
                `/qr-window.html?data=${encodeURIComponent(
                    JSON.stringify(data)
                )}`
            ),
            type: "popup",
            width: 398,
            height: 550,
        });
    });
});
