import { useEffect, useRef, useState } from 'react';
import { FiSettings, FiRefreshCw, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { getQRSettings, saveQRSettings, resetQRSettings, fileToBase64, type QRSettings } from '../../utils/storageManager';
import { CiSettings } from 'react-icons/ci';
import { CgCoffee } from 'react-icons/cg';
import { BsDot } from 'react-icons/bs';
import { BiStar } from 'react-icons/bi';

export default function Sidebar() {
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
    const [qrError, setQrError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load persistent settings
        const loadSettings = async () => {
            try {
                const saved = await getQRSettings();
                setQrOptions(saved);
                setQrError(null);
            } catch (error) {
                console.error('Failed to load settings:', error);
                setQrError('Failed to load settings');
            } finally {
                setSettingsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateSetting = async <K extends keyof QRSettings>(key: K, value: QRSettings[K]) => {
        const updated = { ...qrOptions, [key]: value };
        setQrOptions(updated);
        try {
            await saveQRSettings(updated);
            setQrError(null);
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

    if (settingsLoading) {
        return (
            <div className="w-full h-screen bg-background flex items-center justify-center">
                <p className="text-foreground text-sm">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-screen overflow-y-auto bg-background">

            {/* Error Banner */}
            {qrError && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border-l-4 border-red-500 rounded-lg mb-4">
                    <p className="text-sm text-red-400">{qrError}</p>
                </div>
            )}

            {/* Settings Content */}
            <div className="bg-accent flex flex-col flex-1 p-4 px-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <CiSettings size={22} />
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

                <div className="flex flex-col gap-3 flex-1">
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
                            className="w-full px-2  py-2 bg-background border border-primary/30 rounded-lg text-foreground text-xs font-medium cursor-pointer"
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
                    <div className='flex gap-1 items-center justify-center mt-auto'>
                        <span>
                            <BiStar size={15} className="inline mb-0.5 mr-1 text-yellow-400" />
                            <a
                                href="https://microsoftedge.microsoft.com/addons/detail/qrify-quick-mobile-sync/ogmlmmmakklgmhnjcnekffjchoplomdb"
                                target="_blank"
                                rel="noreferrer"
                                className="underline font-medium text-sm text-muted-foreground hover:text-yellow-300"
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
                                className="underline text-sm font-medium text-muted-foreground hover:text-primary"
                            >
                                Buy me a coffee
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
