import { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { FiDownload, FiCopy, FiAlertCircle } from 'react-icons/fi';
import Button from '../components/button';

type PayloadType = 'link' | 'text' | 'image' | 'video' | 'audio';

interface PayloadData {
    type: PayloadType;
    content: string;
    url?: string;
}

interface QRWindowProps { }

const QR_SIZE = 256;
const MEDIA_TYPES = new Set<PayloadType>(['image', 'video', 'audio']);
const TYPE_CLASS_MAP: Record<PayloadType, string> = {
    link: 'from-blue-50 to-blue-100 text-blue-700 border-blue-300',
    text: 'from-green-50 to-green-100 text-green-700 border-green-300',
    image: 'from-pink-50 to-pink-100 text-pink-700 border-pink-300',
    video: 'from-amber-50 to-amber-100 text-amber-700 border-amber-300',
    audio: 'from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-300',
};

export default function QRWindow({ }: QRWindowProps) {
    const [data, setData] = useState<PayloadData>({
        type: 'link',
        content: '',
        url: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    console.log('QRWindow component mounted');

    useEffect(() => {
        console.log('QRWindow useEffect - parsing query params');
        parseQueryParams();
        setLoading(false);
    }, []);

    useEffect(() => {
        console.log('QRWindow useEffect - rendering QR code', data);
        if (data.content) {
            renderQRCode();
        }
    }, [data]);

    const parseQueryParams = () => {
        const searchParams = new URLSearchParams(window.location.search);
        const payload = searchParams.get('data');

        if (!payload) {
            setError('No data provided');
            return;
        }

        try {
            const parsed = JSON.parse(decodeURIComponent(payload));
            if (parsed && typeof parsed === 'object') {
                const rawType =
                    typeof parsed.type === 'string'
                        ? parsed.type.toLowerCase()
                        : 'link';
                const type = (
                    rawType in TYPE_CLASS_MAP ? rawType : 'link'
                ) as PayloadType;
                const content =
                    typeof parsed.content === 'string' ? parsed.content : '';

                setData({
                    type,
                    content,
                    url: typeof parsed.url === 'string' ? parsed.url : '',
                });
            }
        } catch (err) {
            console.error('Failed to parse QR payload:', err);
            setError('Invalid data format');
        }
    };

    const renderQRCode = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const normalized = data.content.trim();
        if (!normalized) {
            setError('Nothing to encode. Select some content first.');
            return;
        }

        try {
            setError(null);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const qr = qrcode(0, 'H');
            qr.addData(normalized);
            qr.make();

            const moduleCount = qr.getModuleCount();
            const cellSize = Math.floor(QR_SIZE / moduleCount);
            const qrSize = cellSize * moduleCount;
            const margin = Math.floor((QR_SIZE - qrSize) / 2);

            canvas.width = QR_SIZE;
            canvas.height = QR_SIZE;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, QR_SIZE, QR_SIZE);

            ctx.fillStyle = '#000000';
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
        } catch (err) {
            console.error('Unable to render QR code:', err);
            setError('Unable to generate a QR code for this content.');
        }
    };

    const downloadPng = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (!blob) return;

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qrcode-${data.type}-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        });
    };

    const downloadSvg = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/png');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${QR_SIZE}"><image href="${dataUrl}" width="${QR_SIZE}" height="${QR_SIZE}"/></svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qrcode-${data.type}-${Date.now()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(data.content || '');
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy content:', err);
            setError('Failed to copy content.');
        }
    };

    const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
    const badgeClasses = TYPE_CLASS_MAP[data.type];

    if (loading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="text-white text-center">
                    <div className="text-xl font-semibold mb-2">Loading QR Generator...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-full max-w-md bg-background overflow-hidden">

                <div className="flex flex-col gap-2 px-6!">
                    {/* QR Code Display */}
                    <div className="border border-primary border-dashed rounded-xl w-[280px] m-auto aspect-square flex items-center justify-center bg-accent">
                        <canvas
                            ref={canvasRef}
                            className="rounded-lg shadow-md aspect-square w-[89%]! h-[89%]!"
                        />
                    </div>

                    {/* Content Preview */}
                    <div >
                        <div className='w-full flex justify-between items-center mb-1'>
                            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">{typeLabel === 'Link' || typeLabel === 'Text' ? `Copied ${typeLabel}` : `${typeLabel} download link`}</label>
                            <button
                                onClick={copyToClipboard}
                                disabled={!data.content.trim()}
                                className=" flex items-center gap-1 text-sm text-gray-300 hover:text-gray-200 disabled:opacity-50 px-2 py-1 hover:bg-accent rounded-sm"
                            >
                                <FiCopy  />
                                <span>Copy</span>
                            </button>
                        </div>
                        <textarea className="text-sm bg-accent break-all line-clamp-3 leading-relaxed w-full p-2 border border-primary focus:outline-none rounded-lg text-foreground overflow-auto no-scrollbar" value={data.content || ''} readOnly />
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                            <FiAlertCircle className="text-red-600 shrink-0 w-5 h-5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full">
                        <Button
                            onClick={downloadPng}
                            disabled={!data.content.trim()}
                            className="flex-1"
                        >
                            <FiDownload className="w-5 h-5" />
                            <span>PNG</span>
                        </Button>

                        <Button
                            onClick={downloadSvg}
                            disabled={!data.content.trim()}
                            className="flex-1"
                        >
                            <FiDownload className="w-5 h-5" />
                            <span>SVG</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
