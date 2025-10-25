// This file acts as the entry point for the QR window
// It imports and runs the QR window client code

import qrcode from "qrcode-generator";

type PayloadType = "link" | "text" | "image" | "video" | "audio";

interface PayloadData {
    type: PayloadType;
    content: string;
    url?: string;
}

const QR_SIZE = 256;
const MEDIA_TYPES = new Set<PayloadType>(["image", "video", "audio"]);
const TYPE_CLASS_MAP: Record<PayloadType, string> = {
    link: "type-link",
    text: "type-text",
    image: "type-image",
    video: "type-video",
    audio: "type-audio",
};

const typeBadge = document.getElementById(
    "type-badge"
) as HTMLSpanElement | null;
const contentPreview = document.getElementById(
    "content-preview"
) as HTMLParagraphElement | null;
const qrcodeContainer = document.getElementById(
    "qrcode"
) as HTMLDivElement | null;
const downloadNote = document.getElementById(
    "download-note"
) as HTMLDivElement | null;
const errorBanner = document.getElementById(
    "error-banner"
) as HTMLDivElement | null;
const downloadPngBtn = document.getElementById(
    "download-png"
) as HTMLButtonElement | null;
const downloadSvgBtn = document.getElementById(
    "download-svg"
) as HTMLButtonElement | null;
const copyContentBtn = document.getElementById(
    "copy-content"
) as HTMLButtonElement | null;

const qrCanvas = document.createElement("canvas");
qrCanvas.width = QR_SIZE;
qrCanvas.height = QR_SIZE;
qrCanvas.style.borderRadius = "8px";

if (qrcodeContainer && !qrcodeContainer.contains(qrCanvas)) {
    qrcodeContainer.appendChild(qrCanvas);
}

let currentData: PayloadData = { type: "link", content: "", url: "" };

function parseIncomingData(): PayloadData {
    const searchParams =
        typeof window.location === "object" &&
        typeof window.location.search === "string"
            ? window.location.search
            : "";
    const params = new URLSearchParams(searchParams);
    const payload = params.get("data");

    if (!payload) {
        return currentData;
    }

    try {
        const parsed = JSON.parse(decodeURIComponent(payload));
        if (parsed && typeof parsed === "object") {
            const rawType =
                typeof parsed.type === "string"
                    ? parsed.type.toLowerCase()
                    : "link";
            const type = (
                rawType in TYPE_CLASS_MAP ? rawType : "link"
            ) as PayloadType;
            const content =
                typeof parsed.content === "string" ? parsed.content : "";

            return {
                type,
                content,
                url: typeof parsed.url === "string" ? parsed.url : "",
            };
        }
    } catch (error) {
        console.error("Failed to parse QR payload:", error);
    }

    return currentData;
}

function updateTypeBadge(type: PayloadType) {
    if (!typeBadge) return;

    const badgeClass = TYPE_CLASS_MAP[type] ?? TYPE_CLASS_MAP.link;

    typeBadge.textContent = type.toUpperCase();
    typeBadge.className = `type-badge ${badgeClass}`;
}

function updatePreview(content: string) {
    if (!contentPreview) return;

    const value = content.trim();
    if (!value) {
        contentPreview.textContent = "No content available to encode.";
        contentPreview.style.color = "#9ca3af";
    } else {
        contentPreview.textContent = value;
        contentPreview.style.color = "#4b5563";
    }
}

function showError(message: string | null) {
    if (!errorBanner) return;

    if (message && message.trim().length > 0) {
        errorBanner.textContent = message;
        errorBanner.style.display = "block";
    } else {
        errorBanner.textContent = "";
        errorBanner.style.display = "none";
    }
}

function clearCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderQRCode(content: string) {
    const normalized = content.trim();
    if (!normalized) {
        clearCanvas(qrCanvas);
        showError("Nothing to encode. Select some content first.");
        return;
    }

    try {
        showError(null);

        const ctx = qrCanvas.getContext("2d");
        if (!ctx) return;

        const qr = qrcode(0, "H");
        qr.addData(normalized);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const cellSize = Math.floor(QR_SIZE / moduleCount);
        const qrSize = cellSize * moduleCount;
        const margin = Math.floor((QR_SIZE - qrSize) / 2);

        qrCanvas.width = QR_SIZE;
        qrCanvas.height = QR_SIZE;

        ctx.fillStyle = "#2b2b2b";
        ctx.fillRect(0, 0, QR_SIZE, QR_SIZE);

        ctx.fillStyle = "#36f7f0";
        for (let row = 0; row < moduleCount; row += 1) {
            for (let col = 0; col < moduleCount; col += 1) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(
                        margin + col * cellSize,
                        margin + row * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
    } catch (error) {
        console.error("Unable to render QR code:", error);
        clearCanvas(qrCanvas);
        showError("Unable to generate a QR code for this content.");
    }
}

function downloadPng() {
    qrCanvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `qrcode-${currentData.type}-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

function downloadSvg() {
    const dataUrl = qrCanvas.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${QR_SIZE}"><image href="${dataUrl}" width="${QR_SIZE}" height="${QR_SIZE}"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qrcode-${currentData.type}-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
}

async function copyContent() {
    if (!copyContentBtn) return;

    try {
        await navigator.clipboard.writeText(currentData.content || "");
        const original = copyContentBtn.innerHTML;
        copyContentBtn.innerHTML = "<span>✓</span> Copied!";
        copyContentBtn.style.background = "#48bb78";
        copyContentBtn.style.color = "#ffffff";

        setTimeout(() => {
            copyContentBtn.innerHTML = original;
            copyContentBtn.style.background = "#edf2f7";
            copyContentBtn.style.color = "#2d3748";
        }, 2000);
    } catch (error) {
        console.error("Failed to copy content:", error);
        showError("Failed to copy content.");
    }
}

function init() {
    currentData = parseIncomingData();

    updateTypeBadge(currentData.type);
    updatePreview(currentData.content);

    if (downloadNote) {
        downloadNote.style.display = MEDIA_TYPES.has(currentData.type)
            ? "block"
            : "none";
    }

    renderQRCode(currentData.content);

    downloadPngBtn?.addEventListener("click", () => {
        if (!currentData.content.trim()) return;
        downloadPng();
    });

    downloadSvgBtn?.addEventListener("click", () => {
        if (!currentData.content.trim()) return;
        downloadSvg();
    });

    copyContentBtn?.addEventListener("click", () => {
        if (!currentData.content.trim()) {
            showError("Nothing to copy.");
            return;
        }
        void copyContent();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
