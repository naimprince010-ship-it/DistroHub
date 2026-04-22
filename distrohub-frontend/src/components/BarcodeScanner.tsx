import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X, ScanLine, AlertCircle } from 'lucide-react';
import type { QuaggaJSResultObject, QuaggaJSStatic } from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

type QuaggaDetectedHandler = (result: QuaggaJSResultObject) => void;

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [engine, setEngine] = useState<'zxing' | 'quagga'>('zxing');
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const quaggaRef = useRef<QuaggaJSStatic | null>(null);
  const quaggaDetectedRef = useRef<QuaggaDetectedHandler | null>(null);
  const scannerStartingRef = useRef(false);

  const stopScanner = useCallback(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.pause();
      const mediaStream = videoElement.srcObject;
      if (mediaStream && mediaStream instanceof MediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      videoElement.srcObject = null;
    }
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    if (quaggaRef.current) {
      try {
        if (quaggaDetectedRef.current) {
          quaggaRef.current.offDetected(quaggaDetectedRef.current);
        }
        quaggaRef.current.stop();
      } catch (cleanupError) {
        console.error('Quagga cleanup error:', cleanupError);
      } finally {
        quaggaDetectedRef.current = null;
        quaggaRef.current = null;
      }
    }
  }, []);

  const isIgnorableCameraError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('already playing');
  };

  const waitForCameraRelease = async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  };

  useEffect(() => {
    let active = true;

    const reportScan = (barcode: string) => {
      if (!active || !barcode) return;
      onScan(barcode.trim());
      stopScanner();
      onClose();
    };

    const startZxing = async () => {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;
      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('No camera found. Please connect a camera and try again.');
      }

      const preferredDevice =
        videoInputDevices.find((device) => /back|rear|environment/i.test(device.label)) ?? videoInputDevices[0];

      await codeReader.decodeFromVideoDevice(preferredDevice.deviceId, videoRef.current!, (result, err) => {
        if (!active) return;
        if (result) {
          reportScan(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          console.error('ZXing scan error:', err);
        }
      });
    };

    const startQuagga = async () => {
      const quaggaModule = await import('@ericblade/quagga2');
      const Quagga = quaggaModule.default;
      quaggaRef.current = Quagga;
      const targetElement = videoRef.current;
      if (!targetElement) {
        throw new Error('Video target not ready for camera stream.');
      }

      await new Promise<void>((resolve, reject) => {
        Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              target: targetElement,
              constraints: {
                facingMode: 'environment',
              },
            },
            decoder: {
              readers: [
                'ean_reader',
                'ean_8_reader',
                'upc_reader',
                'upc_e_reader',
                'code_128_reader',
                'code_39_reader',
              ],
            },
            locate: true,
          },
          (initError: unknown) => {
            if (initError) {
              reject(initError);
              return;
            }
            resolve();
          }
        );
      });

      const onDetected: QuaggaDetectedHandler = (result) => {
        const code = result?.codeResult?.code;
        if (code) {
          reportScan(String(code));
        }
      };

      quaggaDetectedRef.current = onDetected;
      Quagga.onDetected(onDetected);
      Quagga.start();
    };

    const startScanning = async () => {
      if (scannerStartingRef.current) return;
      scannerStartingRef.current = true;
      stopScanner();
      await waitForCameraRelease();
      setIsScanning(true);
      setError(null);
      if (engine === 'zxing') {
        setNotice(null);
      }

      try {
        if (engine === 'zxing') {
          await startZxing();
        } else {
          await startQuagga();
        }
      } catch (err) {
        if (!active) return;
        if (isIgnorableCameraError(err)) return;
        console.error('Camera error:', err);
        if (engine === 'zxing') {
          setNotice('Primary scan mode failed. Switched to compatibility mode.');
          setEngine('quagga');
          return;
        }
        setError('Unable to access camera. Please grant camera permission and try again.');
        setIsScanning(false);
      } finally {
        scannerStartingRef.current = false;
      }
    };

    void startScanning();

    return () => {
      active = false;
      stopScanner();
    };
  }, [engine, onScan, onClose, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleSwitchEngine = () => {
    setNotice(null);
    setError(null);
    setEngine((prev) => (prev === 'zxing' ? 'quagga' : 'zxing'));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-slate-900">Scan Barcode</h3>
              <p className="text-xs text-slate-500">
                Mode: {engine === 'zxing' ? 'Fast (ZXing)' : 'Compatibility (Quagga2)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchEngine}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Switch Mode
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
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
          {notice ? (
            <p className="mb-1 text-center text-xs font-medium text-amber-700">{notice}</p>
          ) : null}
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
        className={`flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm hover:shadow-md font-medium ${className}`}
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
