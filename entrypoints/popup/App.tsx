import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { FiDownload, FiCopy, FiAlertCircle, FiLink, FiSettings, FiExternalLink, FiRefreshCw, FiTrash2, FiRotateCcw } from 'react-icons/fi';
import Button from '../components/button';
import { getQRSettings, saveQRSettings, resetQRSettings, fileToBase64, type QRSettings } from '../../utils/storageManager';
import { drawCenterIcon, drawStyledQRCode } from '../../utils/qrStyler';
import { CiSettings } from 'react-icons/ci';

export default function App() {
    const [currentUrl, setCurrentUrl] = useState('');
    const [qrError, setQrError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
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
    const [settingsLoading, setSettingsLoading] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load persistent settings and current tab URL
        const loadSettings = async () => {
            try {
                const saved = await getQRSettings();
                setQrOptions(saved);
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setSettingsLoading(false);
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

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setQrError('Please upload an image file');
            return;
        }

        // Validate file size (max 500KB)
        if (file.size > 500000) {
            setQrError('Icon file must be smaller than 500KB');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            await updateSetting('centerIcon', base64);
            setQrError(null);
        } catch (error) {
            console.error('Failed to upload icon:', error);
            setQrError('Failed to upload icon');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeCenterIcon = async () => {
        await updateSetting('centerIcon', undefined);
    };

    const resetAllSettings = async () => {
        if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
            try {
                await resetQRSettings();
                const defaultSettings = await getQRSettings();
                setQrOptions(defaultSettings);
                setQrError(null);
            } catch (error) {
                console.error('Failed to reset settings:', error);
                setQrError('Failed to reset settings');
            }
        }
    };

    return (
        <div className="w-full min-h-screen bg-background">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/icon/96.png" alt="" className='w-10' />
                        <div>
                            <h1 className="text-2xl font-bold text-foreground"><span style={{ fontFamily: "sans-serif" }} className='text-lg'>QR</span><span className='text-lg font-medium' style={{
                                fontFamily: "Borel"
                            }}>ify</span></h1>
                            <p className="text-sm text-gray-400 -mt-2.5">Generate QR codes effortlessly</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-sm font-medium transition-all border border-primary/20 hover:border-primary/40"
                    >
                        <CiSettings size={25}/>
                    </button>
                </div>

                <div className='mt-6 mb-2'>
                    <div className='w-full flex items-center justify-between mb-1'>
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
                    onClick={openInWindow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-sm font-medium transition-all border border-primary/20 hover:border-primary/40"
                >
                    <FiExternalLink size={18}/>
                    <span>Open In New Window</span>
                </button>

                {/* Customization Section */}
                {showSettings && !settingsLoading && (
                    <div className="bg-accent rounded-lg p-4 border border-primary/20 space-y-4 mt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <FiRefreshCw className="w-4 h-4" />
                                Global QR Settings
                            </h3>
                            <button
                                onClick={resetAllSettings}
                                title="Reset all settings to defaults"
                                className="p-1.5 hover:bg-background rounded-lg transition-colors"
                            >
                                <FiRotateCcw className="w-4 h-4 text-gray-400 hover:text-primary" />
                            </button>
                        </div>

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
                                        onChange={(e) => updateSetting('dotsColor', e.target.value)}
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
                                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
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
                                    onChange={(e) => updateSetting('size', parseInt(e.target.value, 10))}
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
                                    onChange={(e) => updateSetting('margin', parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-background border border-primary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Error Correction Level */}
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-2">
                                    Error Correction
                                </label>
                                <select
                                    value={qrOptions.errorCorrectionLevel}
                                    onChange={(e) => updateSetting('errorCorrectionLevel', e.target.value as 'L' | 'M' | 'Q' | 'H')}
                                    className="w-full px-3 py-2 bg-background border border-primary/30 rounded-lg text-foreground text-xs font-medium cursor-pointer"
                                >
                                    <option value="L">L (7%)</option>
                                    <option value="M">M (15%)</option>
                                    <option value="Q">Q (25%)</option>
                                    <option value="H">H (30%)</option>
                                </select>
                            </div>

                            {/* Dot Type */}
                            <div>
                                <label className="block text-xs font-medium text-gray-300 mb-2">
                                    Dot Style
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateSetting('dotType', 'square')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${qrOptions.dotType === 'square'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-background border border-primary/30 text-foreground hover:border-primary/50'
                                            }`}
                                    >
                                        Square
                                    </button>
                                    <button
                                        onClick={() => updateSetting('dotType', 'rounded')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${qrOptions.dotType === 'rounded'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-background border border-primary/30 text-foreground hover:border-primary/50'
                                            }`}
                                    >
                                        Rounded
                                    </button>
                                </div>
                            </div>

                            {/* Corner Radius (only show if rounded) */}
                            {qrOptions.dotType === 'rounded' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-medium text-gray-300">Corner Radius</label>
                                        <span className="text-xs font-semibold text-primary">{qrOptions.cornerRadius}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        value={qrOptions.cornerRadius || 0}
                                        onChange={(e) => updateSetting('cornerRadius', parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-background border border-primary rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            )}

                            {/* Glow Effect */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={qrOptions.glowEffect || false}
                                        onChange={(e) => updateSetting('glowEffect', e.target.checked)}
                                        className="w-4 h-4 rounded cursor-pointer accent-primary"
                                    />
                                    <span className="text-xs font-medium text-gray-300">Glow Effect</span>
                                </label>
                            </div>

                            {/* Center Icon Upload */}
                            <div className="border-t border-primary/20 pt-3">
                                <label className="block text-xs font-medium text-gray-300 mb-2">
                                    Center Icon
                                </label>
                                {qrOptions.centerIcon ? (
                                    <div className="space-y-2">
                                        <div className="bg-background rounded-lg p-2 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Icon uploaded</span>
                                            <button
                                                onClick={removeCenterIcon}
                                                className="flex items-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors"
                                            >
                                                <FiTrash2 className="w-3 h-3" />
                                                Remove
                                            </button>
                                        </div>

                                        {/* Logo Customization Section */}
                                        <div className="bg-background rounded-lg p-3 space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-300">Logo Background</h4>

                                            {/* Logo Background Type */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-300 mb-2">
                                                    Background Type
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => updateSetting('iconBackgroundType', 'colored')}
                                                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${qrOptions.iconBackgroundType === 'colored'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-background border border-primary/30 text-foreground hover:border-primary/50'
                                                            }`}
                                                    >
                                                        Colored
                                                    </button>
                                                    <button
                                                        onClick={() => updateSetting('iconBackgroundType', 'transparent')}
                                                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all ${qrOptions.iconBackgroundType === 'transparent'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-background border border-primary/30 text-foreground hover:border-primary/50'
                                                            }`}
                                                    >
                                                        Transparent
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Logo Background Color */}
                                            {qrOptions.iconBackgroundType === 'colored' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-300 mb-2">
                                                        Background Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={qrOptions.iconBackgroundColor || '#ffffff'}
                                                        onChange={(e) => updateSetting('iconBackgroundColor', e.target.value)}
                                                        className="w-full h-8 rounded-lg cursor-pointer border-2 border-primary/30 bg-accent"
                                                    />
                                                </div>
                                            )}

                                            {/* Logo Background Border Radius */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-medium text-gray-300">
                                                        Border Radius
                                                    </label>
                                                    <span className="text-xs font-semibold text-primary">
                                                        {qrOptions.iconBorderRadius}px
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    value={qrOptions.iconBorderRadius || 8}
                                                    onChange={(e) => updateSetting('iconBorderRadius', parseInt(e.target.value, 10))}
                                                    className="w-full h-2 bg-background border border-primary rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleIconUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-2 px-3 border-2 border-dashed border-primary/30 hover:border-primary/50 rounded-lg text-xs font-medium text-gray-300 hover:text-primary transition-colors"
                                        >
                                            Click to upload icon
                                        </button>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG (max 500KB)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
}