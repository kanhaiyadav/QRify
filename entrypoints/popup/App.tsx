import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { FiDownload, FiCopy, FiAlertCircle, FiLink, FiSettings, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import Button from '../components/button';

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
    const [copySuccess, setCopySuccess] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
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
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            setQrError('Failed to copy URL');
        }
    };

    return (
        <div className="w-full min-h-screen bg-background">
            <div className="p-6">
                {/* Header */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <img src="/icon/96.png" alt="" className='w-[30px]' />
                        <h1 className="text-2xl font-bold text-foreground">QR Generator</h1>
                    </div>
                </div>

                <div className='mt-6 mb-2'>
                    <div className='w-full flex items-center justify-between'>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Page</p>
                        <button
                            onClick={copyToClipboard}
                            className={`flex items-center text-gray-300 justify-center gap-2 px-4 py-1 font-semibold rounded-lg text-sm transition-all active:scale-95 disabled:opacity-50 ${copySuccess
                                ? 'text-green-500'
                                : 'hover:bg-accent text-foreground'
                                }`}
                            disabled={!currentUrl}
                        >
                            <FiCopy />
                            <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                        </button>
                    </div>
                    <div className="bg-accent rounded-lg p-3 border border-primary/20">
                        <p className="text-sm text-foreground break-all line-clamp-2 font-mono" title={currentUrl}>
                            {currentUrl || 'Loading...'}
                        </p>
                    </div>
                </div>

                {/* QR Code Display */}
                <div className="flex justify-center p-4 bg-accent rounded-xl border-2 border-dashed border-primary/30">
                    <canvas
                        ref={canvasRef}
                        className="rounded-lg shadow-lg"
                        style={{ imageRendering: 'pixelated' }}
                    />
                </div>

                {/* Error Banner */}
                {qrError && (
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 border-l-4 border-red-500 rounded-lg">
                        <FiAlertCircle className="text-red-500 shrink-0 w-5 h-5" />
                        <p className="text-sm text-red-400">{qrError}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 my-2">
                    <button
                        onClick={() => downloadQR('png')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                        disabled={!currentUrl}
                    >
                        <FiDownload className="w-4 h-4" />
                        <span>PNG</span>
                    </button>
                    <button
                        onClick={() => downloadQR('svg')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                        disabled={!currentUrl}
                    >
                        <FiDownload className="w-4 h-4" />
                        <span>SVG</span>
                    </button>
                </div>

                {/* Settings Toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-sm font-medium transition-all border border-primary/20 hover:border-primary/40"
                >
                    <FiSettings className="w-4 h-4" />
                    <span>{showSettings ? 'Hide' : 'Show'} Customization</span>
                </button>

                {/* Customization Section */}
                {showSettings && (
                    <div className="bg-accent rounded-lg p-4 border border-primary/20 space-y-4 mt-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <FiRefreshCw className="w-4 h-4" />
                            Customize QR Code
                        </h3>

                        <div className="space-y-3">
                            {/* Color Pickers */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-2">
                                        Dots Color
                                    </label>
                                    <input
                                        type="color"
                                        value={qrOptions.dotsColor}
                                        onChange={(e) =>
                                            setQrOptions({ ...qrOptions, dotsColor: e.target.value })
                                        }
                                        className="w-full h-10 rounded-lg cursor-pointer border-2 border-primary/30 bg-accent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-2">
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
                                        className="w-full h-10 rounded-lg cursor-pointer border-2 border-primary/30 bg-accent"
                                    />
                                </div>
                            </div>

                            {/* Size Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-medium text-gray-300">Size</label>
                                    <span className="text-xs font-semibold text-primary">{qrOptions.size}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="200"
                                    max="350"
                                    value={qrOptions.size}
                                    onChange={(e) =>
                                        setQrOptions({ ...qrOptions, size: parseInt(e.target.value, 10) })
                                    }
                                    className="w-full h-2 bg-background border border-primary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Margin Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-medium text-gray-300">Margin</label>
                                    <span className="text-xs font-semibold text-primary">{qrOptions.margin * 10}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="8"
                                    value={qrOptions.margin}
                                    onChange={(e) =>
                                        setQrOptions({ ...qrOptions, margin: parseInt(e.target.value, 10) })
                                    }
                                    className="w-full h-2 bg-background border border-primary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
}