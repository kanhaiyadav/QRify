import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';

interface QROptions {
    size: number;
    dotsColor: string;
    backgroundColor: string;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    margin: number;
}

export default function App() {
    const [currentUrl, setCurrentUrl] = useState('');
    const [qrError, setQrError] = useState<string | null>(null);
    const [qrOptions, setQrOptions] = useState<QROptions>({
        size: 280,
        dotsColor: '#000000',
        backgroundColor: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 4,
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome API error:', chrome.runtime.lastError);
                    setQrError('Unable to access the active tab.');
                    setCurrentUrl('');
                    return;
                }

                const url = tabs[0]?.url ?? '';
                if (!url) {
                    setQrError('No accessible URL for this tab.');
                    setCurrentUrl('');
                    return;
                }

                setQrError(null);
                setCurrentUrl(url);
            });
        } catch (error) {
            console.error('Failed to query active tab:', error);
            setQrError('Unable to access the active tab.');
            setCurrentUrl('');
        }
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !currentUrl) return;
        generateQRCode();
    }, [currentUrl, qrOptions]);

    const generateQRCode = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            setQrError(null);
            const qr = qrcode(0, qrOptions.errorCorrectionLevel);
            qr.addData(currentUrl);
            qr.make();

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const moduleCount = qr.getModuleCount();
            const cellSize = Math.floor((qrOptions.size - qrOptions.margin * 2) / moduleCount);
            const qrSize = cellSize * moduleCount;
            const offset = Math.floor((qrOptions.size - qrSize) / 2);

            canvas.width = qrOptions.size;
            canvas.height = qrOptions.size;

            ctx.fillStyle = qrOptions.backgroundColor;
            ctx.fillRect(0, 0, qrOptions.size, qrOptions.size);

            ctx.fillStyle = qrOptions.dotsColor;
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            offset + col * cellSize,
                            offset + row * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Failed to render QR code:', error);
            setQrError('Unable to generate a QR code for this page.');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = qrOptions.size;
            canvas.height = qrOptions.size;
            ctx.fillStyle = qrOptions.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ef4444';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('QR unavailable', canvas.width / 2, canvas.height / 2);
        }
    };

    const downloadQR = (format: 'png' | 'svg') => {
        if (!canvasRef.current) return;

        if (format === 'png') {
            canvasRef.current.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `qrcode-${Date.now()}.png`;
                link.click();
                URL.revokeObjectURL(url);
            });
        } else {
            const svgData = canvasToSVG(canvasRef.current);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qrcode-${Date.now()}.svg`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const canvasToSVG = (canvas: HTMLCanvasElement): string => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">`;
        svg += `<rect width="${canvas.width}" height="${canvas.height}" fill="${qrOptions.backgroundColor}"/>`;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];

                if (a > 128 && r < 128 && g < 128 && b < 128) {
                    svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${qrOptions.dotsColor}"/>`;
                }
            }
        }

        svg += '</svg>';
        return svg;
    };

    const openInWindow = () => {
        chrome.windows.create({
            url: chrome.runtime.getURL(
                `/qr-window.html?data=${encodeURIComponent(JSON.stringify({ type: 'link', content: currentUrl }))}`
            ),
            type: 'popup',
            width: 450,
            height: 550,
        });
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(currentUrl);
            const btn = document.getElementById('copy-btn');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <div className="w-full min-h-screen bg-linear-to-br from-purple-50 to-blue-50">
            <div className="p-4">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <span className="text-2xl">🔗</span> Quick QR Share
                    </h1>
                    <div className="bg-white rounded-lg p-2 mt-2 shadow-sm">
                        <p className="text-xs text-gray-600 truncate" title={currentUrl}>
                            {currentUrl || 'Loading...'}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-lg mb-4 flex justify-center">
                    <canvas
                        ref={canvasRef}
                        className="rounded-lg"
                        style={{ imageRendering: 'pixelated' }}
                    />
                </div>

                {qrError && (
                    <div className="mb-2">
                        <p className="text-center text-sm text-red-500">{qrError}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => downloadQR('png')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-md active:scale-95"
                        >
                            📥 PNG
                        </button>
                        <button
                            onClick={() => downloadQR('svg')}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-md active:scale-95"
                        >
                            📥 SVG
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={openInWindow}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-md active:scale-95"
                        >
                            🪟 Window
                        </button>
                        <button
                            id="copy-btn"
                            onClick={copyToClipboard}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-md active:scale-95"
                        >
                            📋 Copy
                        </button>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            🎨 Customize QR Code
                        </h3>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Dots Color
                                    </label>
                                    <input
                                        type="color"
                                        value={qrOptions.dotsColor}
                                        onChange={(e) =>
                                            setQrOptions({ ...qrOptions, dotsColor: e.target.value })
                                        }
                                        className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Background
                                    </label>
                                    <input
                                        type="color"
                                        value={qrOptions.backgroundColor}
                                        onChange={(e) =>
                                            setQrOptions({
                                                ...qrOptions,
                                                backgroundColor: e.target.value,
                                            })
                                        }
                                        className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="flex text-xs font-medium text-gray-700 mb-1.5 justify-between">
                                    <span>Size</span>
                                    <span className="text-blue-600">{qrOptions.size}px</span>
                                </label>
                                <input
                                    type="range"
                                    min="200"
                                    max="350"
                                    value={qrOptions.size}
                                    onChange={(e) =>
                                        setQrOptions({ ...qrOptions, size: parseInt(e.target.value, 10) })
                                    }
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            <div>
                                <label className="flex text-xs font-medium text-gray-700 mb-1.5 justify-between">
                                    <span>Margin</span>
                                    <span className="text-blue-600">{qrOptions.margin * 10}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="8"
                                    value={qrOptions.margin}
                                    onChange={(e) =>
                                        setQrOptions({ ...qrOptions, margin: parseInt(e.target.value, 10) })
                                    }
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        Right-click on any content to generate QR codes
                    </p>
                </div>
            </div>
        </div>
    );
}