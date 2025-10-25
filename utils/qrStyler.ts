/**
 * Utilities for drawing center icons and advanced styling on QR codes
 */

export interface DrawIconOptions {
    canvas: HTMLCanvasElement;
    iconBase64?: string;
    size?: number; // Icon size relative to canvas (0-100 represents percentage)
    padding?: number; // Padding around icon in pixels
    borderRadius?: number; // Corner radius for icon background
    backgroundType?: "colored" | "transparent"; // Logo background type
    backgroundColor?: string; // Logo background color (only used if backgroundType is "colored")
    backgroundBorderRadius?: number; // Logo background border radius
}

/**
 * Draw a center icon on the QR code canvas with customizable background
 */
export const drawCenterIcon = async (
    options: DrawIconOptions
): Promise<void> => {
    const {
        canvas,
        iconBase64,
        size = 25,
        padding = 4,
        borderRadius = 4,
        backgroundType = "colored",
        backgroundColor = "#ffffff",
        backgroundBorderRadius = 8,
    } = options;

    if (!iconBase64) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
        const img = new Image();
        img.onload = () => {
            const canvasSize = canvas.width;
            const iconSize = (canvasSize * size) / 100;
            const x = (canvasSize - iconSize) / 2;
            const y = (canvasSize - iconSize) / 2;
            const bgBorderRadius = backgroundBorderRadius || borderRadius;

            // Draw background based on type
            if (backgroundType === "colored") {
                // Draw colored background
                ctx.fillStyle = backgroundColor;
                roundRect(
                    ctx,
                    x - padding,
                    y - padding,
                    iconSize + padding * 2,
                    iconSize + padding * 2,
                    bgBorderRadius
                );
                ctx.fill();

                // Draw border for better visibility
                ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
                ctx.lineWidth = 1;
                roundRect(
                    ctx,
                    x - padding,
                    y - padding,
                    iconSize + padding * 2,
                    iconSize + padding * 2,
                    bgBorderRadius
                );
                ctx.stroke();
            } else if (backgroundType === "transparent") {
                // For transparent background, just draw a subtle border for visibility
                ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
                ctx.lineWidth = 1.5;
                roundRect(
                    ctx,
                    x - padding,
                    y - padding,
                    iconSize + padding * 2,
                    iconSize + padding * 2,
                    bgBorderRadius
                );
                ctx.stroke();
            }

            // Draw the icon image
            ctx.drawImage(img, x, y, iconSize, iconSize);
        };
        img.src = iconBase64;
    } catch (error) {
        console.error("Failed to draw center icon:", error);
    }
};

/**
 * Draw a rounded rectangle on canvas context
 */
export const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void => {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
};

/**
 * Draw rounded/styled QR dots instead of squares
 */
export const drawStyledQRCode = (
    ctx: CanvasRenderingContext2D,
    qrModuleCount: number,
    qrIsDark: (row: number, col: number) => boolean,
    cellSize: number,
    offset: number,
    dotsColor: string,
    dotType: "square" | "rounded" = "square",
    cornerRadius: number = 0
): void => {
    ctx.fillStyle = dotsColor;

    for (let row = 0; row < qrModuleCount; row++) {
        for (let col = 0; col < qrModuleCount; col++) {
            if (qrIsDark(row, col)) {
                const x = offset + col * cellSize;
                const y = offset + row * cellSize;

                if (dotType === "rounded" && cornerRadius > 0) {
                    roundRect(ctx, x, y, cellSize, cellSize, cornerRadius);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, cellSize, cellSize);
                }
            }
        }
    }
};

/**
 * Add a glow effect to QR code
 */
export const addGlowEffect = (
    ctx: CanvasRenderingContext2D,
    qrModuleCount: number,
    qrIsDark: (row: number, col: number) => boolean,
    cellSize: number,
    offset: number,
    glowColor: string = "rgba(0, 0, 0, 0.1)",
    glowBlur: number = 2
): void => {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.fillStyle = glowColor;

    for (let row = 0; row < qrModuleCount; row++) {
        for (let col = 0; col < qrModuleCount; col++) {
            if (qrIsDark(row, col)) {
                const x = offset + col * cellSize;
                const y = offset + row * cellSize;
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
};

/**
 * Export canvas to SVG with advanced styling
 */
export const canvasToAdvancedSVG = (
    canvas: HTMLCanvasElement,
    backgroundColor: string,
    dotsColor: string,
    dotType: "square" | "rounded" = "square",
    cornerRadius: number = 0
): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;

    // Create groups of connected dots for cleaner SVG
    if (dotType === "rounded" && cornerRadius > 0) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                if (a > 128 && r < 128 && g < 128 && b < 128) {
                    svg += `<rect x="${x}" y="${y}" width="1" height="1" rx="${
                        cornerRadius / 10
                    }" ry="${cornerRadius / 10}" fill="${dotsColor}"/>`;
                }
            }
        }
    } else {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                if (a > 128 && r < 128 && g < 128 && b < 128) {
                    svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${dotsColor}"/>`;
                }
            }
        }
    }

    svg += "</svg>";
    return svg;
};
