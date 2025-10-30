import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { FiDownload, FiCopy, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import { getQRSettings, saveQRSettings, fileToBase64, type QRSettings } from '../../utils/storageManager';
import { drawCenterIcon, drawStyledQRCode } from '../../utils/qrStyler';
import { CiSettings } from 'react-icons/ci';
import { BiCoffee, BiStar } from 'react-icons/bi';
import { BsDot } from 'react-icons/bs';
import { CgCoffee } from 'react-icons/cg';

export default function App() {
    const [currentUrl, setCurrentUrl] = useState('');
    const [qrError, setQrError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [qrOptions, setQrOptions] = useState<QRSettings>({
        size: 280,
        dotsColor: '#000000',
        backgroundColor: '#ffffff',
        errorCorrectionLevel: 'H',
        margin: 4,
        centerIcon: undefined,
        cornerRadius: 0,
        dotType: 'square',
        glowEffect: false,
        iconBackgroundType: 'colored',
        iconBackgroundColor: '#ffffff',
        iconBorderRadius: 8,
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        // Load persistent settings and current tab URL
        const loadSettings = async () => {
            try {
                const saved = await getQRSettings();
                setQrOptions(saved);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };

        loadSettings();

        // Load current tab URL
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

    const generateQRCode = async () => {
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

            // Draw background
            ctx.fillStyle = qrOptions.backgroundColor;
            ctx.fillRect(0, 0, qrOptions.size, qrOptions.size);

            // Draw QR code with styling
            drawStyledQRCode(
                ctx,
                moduleCount,
                (row, col) => qr.isDark(row, col),
                cellSize,
                offset,
                qrOptions.dotsColor,
                qrOptions.dotType,
                qrOptions.cornerRadius
            );

            // Draw center icon if provided
            if (qrOptions.centerIcon) {
                await drawCenterIcon({
                    canvas,
                    iconBase64: qrOptions.centerIcon,
                    size: 25,
                    padding: 4,
                    borderRadius: 4,
                    backgroundType: qrOptions.iconBackgroundType,
                    backgroundColor: qrOptions.iconBackgroundColor,
                    backgroundBorderRadius: qrOptions.iconBorderRadius,
                });
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

    const openSettingsSidebar = async () => {
        try {
            // Check if sidePanel API is available (Chrome only)
            if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
                const currentTab = await new Promise<number>((resolve) => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        resolve(tabs[0]?.id || 0);
                    });
                });

                if (currentTab) {
                    await chrome.sidePanel.open({ tabId: currentTab });
                }
            } else {
                // Fallback for Firefox and other browsers: open in new window
                chrome.windows.create({
                    url: chrome.runtime.getURL('/sidebar.html'),
                    type: 'popup',
                    width: 398,
                    height: 600,
                });
            }
        } catch (error) {
            console.error('Failed to open settings sidebar:', error);
            // Fallback if sidePanel fails
            chrome.windows.create({
                url: chrome.runtime.getURL('/sidebar.html'),
                type: 'popup',
                width: 398,
                height: 600,
            });
        }
    };

    const openInWindow = () => {
        chrome.windows.create({
            url: chrome.runtime.getURL(
                `/qr-window.html?data=${encodeURIComponent(JSON.stringify({ type: 'link', content: currentUrl }))}`
            ),
            type: 'popup',
            width: 398,
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

    const updateSetting = async <K extends keyof QRSettings>(key: K, value: QRSettings[K]) => {
        const updated = { ...qrOptions, [key]: value };
        setQrOptions(updated);
        try {
            await saveQRSettings(updated);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setQrError('Failed to save settings');
        }
    };

    return (
        <div className="w-full min-h-screen bg-background">
            <div className="p-6 py-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/icon/96.png" alt="" className='w-10' />
                        <div>
                            <h1 className="text-2xl font-bold text-foreground"><span style={{ fontFamily: "sans-serif" }} className='text-lg'>QR</span><span className='text-lg font-medium' style={{
                                fontFamily: "Borel"
                            }}>ify</span></h1>
                            <p className="text-sm text-gray-400 -mt-2.5">Share effortlessly via QR codes</p>
                        </div>
                    </div>
                    <button
                        onClick={openSettingsSidebar}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-sm font-medium transition-all border border-primary/20 hover:border-primary/40"
                        title="Open settings in sidebar"
                    >
                        <CiSettings size={25} />
                    </button>
                </div>

                <div className='mt-4 mb-2'>
                    <div className='w-full flex items-center justify-between mb-1'>
                        <p className="text-xs text-gray-400 uppercase tracking-wide relative -bottom-0.5">Current Page Url</p>
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
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 border-l-4 border-red-500 rounded-lg mt-2">
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
                    onClick={openInWindow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-sm font-medium transition-all border border-primary/20 hover:border-primary/40"
                >
                    <FiExternalLink size={18} />
                    <span>Open In New Window</span>
                </button>

            </div>
            <div className='flex gap-1 items-center justify-center'>
                <span>
                    <BiStar size={15} className="inline mb-0.5 mr-1 text-yellow-400" />
                    <a
                        href="https://microsoftedge.microsoft.com/addons/detail/qrify-quick-mobile-sync/ogmlmmmakklgmhnjcnekffjchoplomdb"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium text-muted-foreground hover:text-yellow-300"
                    >
                        Rate Us!
                    </a>
                </span>
                <BsDot size={20} className="text-muted-foreground" />
                <span>
                    <CgCoffee size={15} className='inline mr-1 text-primary' />
                    <a
                        href="https://ko-fi.com/Y8Y01N7HT2"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium text-muted-foreground hover:text-primary"
                    >
                        Buy me a coffee
                    </a>
                </span>
            </div>
        </div >
    );
}