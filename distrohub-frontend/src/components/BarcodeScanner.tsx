import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X, ScanLine, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startScanning = async () => {
      try {
        setIsScanning(true);
        setError(null);

        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          setError('No camera found. Please connect a camera and try again.');
          setIsScanning(false);
          return;
        }

        const selectedDeviceId = videoInputDevices[0].deviceId;

        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const barcode = result.getText();
              onScan(barcode);
              codeReader.reset();
              onClose();
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error('Scan error:', err);
            }
          }
        );
      } catch (err) {
        console.error('Camera error:', err);
        setError('Unable to access camera. Please grant camera permission and try again.');
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [onScan, onClose]);

  const handleClose = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Scan Barcode</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="relative aspect-square bg-black">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-white">{error}</p>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-white text-slate-900 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                  {isScanning && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
                      <div className="h-0.5 bg-indigo-500 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50">
          <p className="text-sm text-slate-600 text-center">
            Position the barcode within the frame to scan
          </p>
        </div>
      </div>
    </div>
  );
}

interface BarcodeScanButtonProps {
  onScan: (barcode: string) => void;
  className?: string;
}

export function BarcodeScanButton({ onScan, className = '' }: BarcodeScanButtonProps) {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowScanner(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors ${className}`}
      >
        <ScanLine className="w-4 h-4" />
        <span>Scan</span>
      </button>

      {showScanner && (
        <BarcodeScanner
          onScan={onScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
