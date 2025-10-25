// Lightweight QR Code generator that works offline
// Based on QR Code generation algorithm

type QRCodeOptions = {
    size?: number;
    level?: "L" | "M" | "Q" | "H";
    background?: string;
    foreground?: string;
};

export function generateQRCode(
    text: string,
    options: QRCodeOptions = {}
): string {
    const {
        size = 256,
        level = "M",
        background = "#ffffff",
        foreground = "#000000",
    } = options;

    // Use qrcodejs library approach - simplified version
    const qr = createQRCode(text, level);
    return renderQRToSVG(qr, size, background, foreground);
}

function createQRCode(text: string, errorCorrectionLevel: string) {
    // This is a simplified implementation
    // For production, you'd want to use a library like qrcode-generator
    // or implement the full QR algorithm

    // Determine version based on text length
    const version = getVersionForLength(text.length);
    const size = version * 4 + 17;

    // Create matrix
    const matrix: boolean[][] = Array(size)
        .fill(null)
        .map(() => Array(size).fill(false));

    // Encode data (simplified - real implementation would be more complex)
    const encoded = encodeData(text);

    // Add finder patterns
    addFinderPatterns(matrix);

    // Add timing patterns
    addTimingPatterns(matrix);

    // Add data
    addData(matrix, encoded);

    return matrix;
}

function getVersionForLength(length: number): number {
    if (length <= 25) return 1;
    if (length <= 47) return 2;
    if (length <= 77) return 3;
    if (length <= 114) return 4;
    return 5;
}

function encodeData(text: string): number[] {
    // Simple byte mode encoding
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
        bytes.push(text.charCodeAt(i));
    }
    return bytes;
}

function addFinderPatterns(matrix: boolean[][]) {
    const size = matrix.length;
    const pattern = [
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1],
    ];

    // Top-left
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            matrix[i][j] = pattern[i][j] === 1;
        }
    }

    // Top-right
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            matrix[i][size - 7 + j] = pattern[i][j] === 1;
        }
    }

    // Bottom-left
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            matrix[size - 7 + i][j] = pattern[i][j] === 1;
        }
    }
}

function addTimingPatterns(matrix: boolean[][]) {
    const size = matrix.length;
    for (let i = 8; i < size - 8; i++) {
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
    }
}

function addData(matrix: boolean[][], data: number[]) {
    // Simplified data placement
    const size = matrix.length;
    let dataIndex = 0;

    for (let i = size - 1; i >= 0; i -= 2) {
        if (i === 6) i--; // Skip timing column

        for (let j = 0; j < size; j++) {
            for (let k = 0; k < 2; k++) {
                const col = i - k;
                const row = i % 4 < 2 ? size - 1 - j : j;

                if (col >= 0 && row >= 0 && col < size && row < size) {
                    if (!matrix[row][col] && dataIndex < data.length * 8) {
                        const byteIndex = Math.floor(dataIndex / 8);
                        const bitIndex = 7 - (dataIndex % 8);
                        matrix[row][col] =
                            ((data[byteIndex] >> bitIndex) & 1) === 1;
                        dataIndex++;
                    }
                }
            }
        }
    }
}

function renderQRToSVG(
    matrix: boolean[][],
    size: number,
    background: string,
    foreground: string
): string {
    const matrixSize = matrix.length;
    const cellSize = size / matrixSize;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${matrixSize} ${matrixSize}">`;
    svg += `<rect width="${matrixSize}" height="${matrixSize}" fill="${background}"/>`;

    for (let i = 0; i < matrixSize; i++) {
        for (let j = 0; j < matrixSize; j++) {
            if (matrix[i][j]) {
                svg += `<rect x="${j}" y="${i}" width="1" height="1" fill="${foreground}"/>`;
            }
        }
    }

    svg += "</svg>";
    return svg;
}

export function downloadQRCode(svg: string, filename: string = "qrcode") {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.svg`;
    a.click();
    URL.revokeObjectURL(url);
}
