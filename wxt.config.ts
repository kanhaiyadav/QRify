import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ["@wxt-dev/module-react"],
    manifest: {
        name: "Quick QR Share",
        description:
            "Generate QR codes for links, text, images, and media to quickly share with mobile devices",
        version: "1.0.0",
        permissions: [
            "contextMenus",
            "activeTab",
            "storage",
            "scripting",
            "tabs",
        ],
        host_permissions: ["<all_urls>"],
        action: {
            default_popup: "/dist/popup/index.html",
            default_title: "Quick QR Share",
        },
    },
});
