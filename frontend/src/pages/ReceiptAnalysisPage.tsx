import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReceiptAnalysisDisplay from '../components/Receipt/ReceiptAnalysisDisplay';
import receiptService from '../services/receiptService';
import { Button } from '../components/ui/button';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Undo,
  Download,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { motion } from 'framer-motion';
import { createUseGesture, dragAction, pinchAction } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { useQuery } from '@tanstack/react-query';

const useGesture = createUseGesture([dragAction, pinchAction]);

const ReceiptAnalysisPage = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const {
    data: receiptData,
    status: receiptDataStatus,
    error: receiptDataError,
    isLoading: receiptDataIsLoading,
  } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => receiptService.getSingleReceipt(parseInt(receiptId)),
  });

  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('gesturestart', handler);
    document.addEventListener('gesturechange', handler);
    document.addEventListener('gestureend', handler);
    return () => {
      document.removeEventListener('gesturestart', handler);
      document.removeEventListener('gesturechange', handler);
      document.removeEventListener('gestureend', handler);
    };
  }, []);

  const [style, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    rotateZ: 0,
  }));
  const ref = React.useRef(null);

  useGesture(
    {
      onDrag: ({ pinching, cancel, offset: [x, y] }) => {
        if (pinching) return cancel();
        api.start({ x, y });
      },
      onPinch: ({
        origin: [ox, oy],
        first,
        movement: [ms],
        offset: [s, a],
        memo,
      }) => {
        if (first) {
          const { width, height, x, y } = ref.current.getBoundingClientRect();
          const tx = ox - (x + width / 2);
          const ty = oy - (y + height / 2);
          memo = [style.x.get(), style.y.get(), tx, ty];
        }

        const x = memo[0] - (ms - 1) * memo[2];
        const y = memo[1] - (ms - 1) * memo[3];
        api.start({ scale: s, rotateZ: a, x, y });
        return memo;
      },
    },
    {
      target: ref,
      drag: { from: () => [style.x.get(), style.y.get()] },
      pinch: { scaleBounds: { min: 0.5, max: 2 }, rubberband: true },
    }
  );

  useEffect(() => {
    let objectUrlsToRevoke = [];

    const fetchReceiptDetails = async () => {
      try {
        // Try to get receipt from API
        try {
          if (receiptData.receipt) {
            setReceipt(receiptData.receipt);

            // First try to get the image directly from the backend
            try {
              const imageUrl = await receiptService.getReceiptImage(
                parseInt(receiptId)
              );
              if (imageUrl) {
                if (imageUrl.startsWith('blob:')) {
                  objectUrlsToRevoke.push(imageUrl);
                }
                setPreviewImage(imageUrl);
              } else {
                // If backend image fetch fails, check for image URL in receipt data
                if (receiptData.receipt.image_url) {
                  setPreviewImage(receiptData.receipt.image_url);
                } else {
                  setPreviewImage(null);
                }
              }
            } catch (imageError) {
              // Fall back to image URL in receipt data
              if (receiptData.receipt.image_url) {
                setPreviewImage(receiptData.receipt.image_url);
              } else {
                setPreviewImage(null);
              }
            }

            setError(null);
          } else {
            throw new Error('Failed to retrieve receipt details');
          }
        } catch (apiError) {
          // Fallback to mock data for development
          const mockHistoryResponse =
            await receiptService.getUserReceiptHistory();
          const mockReceipt = mockHistoryResponse.receipts.find(
            (r) => r.id === parseInt(receiptId)
          );

          if (mockReceipt) {
            setReceipt(mockReceipt);

            // Try to get image from backend even for mock data (might exist on server)
            try {
              const imageUrl = await receiptService.getReceiptImage(
                parseInt(receiptId)
              );
              if (imageUrl) {
                if (imageUrl.startsWith('blob:')) {
                  objectUrlsToRevoke.push(imageUrl);
                }
                setPreviewImage(imageUrl);
              } else if (mockReceipt.image_url) {
                setPreviewImage(mockReceipt.image_url);
              } else {
                setPreviewImage(null);
              }
            } catch (imageError) {
              // Fall back to mock image URL if available
              if (mockReceipt.image_url) {
                setPreviewImage(mockReceipt.image_url);
              } else {
                setPreviewImage(null);
              }
            }

            setError(null);
          } else {
            throw new Error('Receipt not found');
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load receipt details');
      }
    };

    if (receiptDataStatus === 'success') {
      fetchReceiptDetails();
    }

    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      objectUrlsToRevoke.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [receiptDataStatus, receiptData, receiptId]);

  const handleBackClick = () => {
    navigate('/');
  };

  const resetImage = () => {
    api.start({
      x: 0,
      y: 0,
      scale: 1,
      rotateZ: 0,
      config: { tension: 300, friction: 20 },
    });
  };

  const handleDownloadImage = async () => {
    if (!previewImage) return;

    try {
      let downloadUrl = previewImage;
      let blob;

      // Handle different URL types
      if (previewImage.startsWith('blob:')) {
        // Blob URL - fetch the blob
        const response = await fetch(previewImage);
        blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      } else if (previewImage.startsWith('data:')) {
        // Data URL - already good to go
        downloadUrl = previewImage;
      } else if (previewImage.startsWith('http')) {
        // Remote URL - fetch and convert to blob
        try {
          const response = await fetch(previewImage);
          blob = await response.blob();
          downloadUrl = URL.createObjectURL(blob);
        } catch (error) {
          alert('Sorry, this image cannot be downloaded.');
          return;
        }
      } else {
        alert('Sorry, this image cannot be downloaded.');
        return;
      }

      // Create a file name from the merchant and date if available
      let fileName = 'receipt';
      if (receipt && receipt.receipt_data) {
        const merchant = receipt.receipt_data.merchant || '';
        const date = receipt.receipt_data.date || '';
        fileName = `receipt_${merchant.replace(/\s+/g, '_').toLowerCase()}_${date.replace(/[/\\:]/g, '-')}`;
      }

      const link = document.createElement('a');
      link.download = `${fileName}.jpg`;
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up any temporary object URL we created
      if (downloadUrl !== previewImage && downloadUrl.startsWith('blob:')) {
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      alert('Failed to download the image. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {receiptDataIsLoading ? (
        <div className="mx-auto max-w-4xl py-8">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading receipt details...</span>
          </div>
        </div>
      ) : receiptDataStatus === 'error' || error ? (
        <div className="mx-auto max-w-4xl py-8">
          <Button variant="ghost" className="mb-6" onClick={handleBackClick}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-6">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive">
                Error Loading Receipt
              </h2>
              <p className="text-destructive/90">{receiptDataError || error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl py-8">
          <div className="flex flex-col gap-6">
            {/* Receipt Image Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Receipt Image
                  </CardTitle>
                  {previewImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={handleDownloadImage}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {previewImage ? (
                    <div className={`relative overflow-hidden bg-muted/40`}>
                      <animated.div
                        className="relative h-full w-full touch-none"
                        ref={ref}
                        style={style}
                      >
                        <img
                          src={previewImage}
                          alt="Receipt"
                          className={`mx-auto max-h-[75vh] touch-none object-contain transition-transform duration-100`}
                          onError={(e) => {
                            // Don't try to load another image, just hide this one and show fallback
                            e.target.style.display = 'none';

                            // Find closest parent that would be good for appending fallback
                            const container = e.target.closest('.relative');
                            if (container) {
                              // Check if fallback already exists to prevent infinite loop
                              if (
                                !container.querySelector('.receipt-fallback')
                              ) {
                                const fallback = document.createElement('div');
                                fallback.className =
                                  'flex flex-col items-center justify-center py-16 px-4 text-center receipt-fallback';
                                fallback.innerHTML = `
                                  <svg class="h-16 w-16 text-muted-foreground/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <p class="text-muted-foreground">Failed to load receipt image</p>
                                `;
                                container.appendChild(fallback);
                              }
                            }
                          }}
                        />
                      </animated.div>
                      <div className="absolute right-3 top-3 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full opacity-80 shadow-md hover:opacity-100"
                          onClick={resetImage}
                        >
                          <Undo className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center bg-muted/30 px-4 py-16 text-center">
                      <ImageIcon className="mb-4 h-16 w-16 text-muted-foreground/40" />
                      <p className="text-muted-foreground">
                        Receipt image not available
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground/70">
                        The original receipt image might not be stored or is no
                        longer accessible
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {receiptData?.receipt && (
              <ReceiptAnalysisDisplay
                key={`receipt-${receiptId}-${receiptData.receipt.receipt_data.line_items.length}-${receiptData.receipt.receipt_data.gratuity ?? 0}-${receiptData.receipt.receipt_data.tip ?? 0}`}
                result={receiptData.receipt}
              />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReceiptAnalysisPage;
