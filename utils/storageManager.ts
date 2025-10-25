/**
 * Manages persistent QR code customization settings using Chrome Storage API
 */

export interface QRSettings {
    size: number;
    dotsColor: string;
    backgroundColor: string;
    errorCorrectionLevel: "L" | "M" | "Q" | "H";
    margin: number;
    centerIcon?: string; // Base64 encoded icon image
    cornerRadius?: number; // Corner radius for QR dots (0-50)
    dotType?: "square" | "rounded"; // Dot shape style
    glowEffect?: boolean; // Add glow effect to dots
    iconBackgroundType?: "colored" | "transparent"; // Logo background type
    iconBackgroundColor?: string; // Logo background color
    iconBorderRadius?: number; // Logo background border radius (0-50)
}

const DEFAULT_SETTINGS: QRSettings = {
    size: 280,
    dotsColor: "#000000",
    backgroundColor: "#ffffff",
    errorCorrectionLevel: "H",
    margin: 4,
    centerIcon: undefined,
    cornerRadius: 0,
    dotType: "square",
    glowEffect: false,
    iconBackgroundType: "colored",
    iconBackgroundColor: "#ffffff",
    iconBorderRadius: 8,
};

const STORAGE_KEY = "qr_settings";

/**
 * Get all saved QR settings or defaults if none exist
 */
export const getQRSettings = (): Promise<QRSettings> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                const saved = result[STORAGE_KEY];
                resolve(
                    saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS
                );
            }
        });
    });
};

/**
 * Save QR settings to Chrome storage
 */
export const saveQRSettings = (settings: QRSettings): Promise<void> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve();
            }
        });
    });
};

/**
 * Reset all settings to defaults
 */
export const resetQRSettings = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve();
            }
        });
    });
};

/**
 * Update a single setting
 */
export const updateQRSetting = <K extends keyof QRSettings>(
    key: K,
    value: QRSettings[K]
): Promise<QRSettings> => {
    return new Promise(async (resolve, reject) => {
        try {
            const current = await getQRSettings();
            const updated = { ...current, [key]: value };
            await saveQRSettings(updated);
            resolve(updated);
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Convert image file to base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                resolve(result);
            } else {
                reject(new Error("Failed to convert file to base64"));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
};

/**
 * Convert base64 to blob
 */
export const base64ToBlob = (
    base64: string,
    type: string = "image/png"
): Blob => {
    const byteCharacters = atob(base64.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
};
