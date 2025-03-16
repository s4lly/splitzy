import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReceiptAnalysisDisplay from '../components/Receipt/ReceiptAnalysisDisplay';
import receiptService from '../services/receiptService';
import { Button } from '../components/ui/button';
import { ArrowLeft, AlertCircle, Loader2, Image as ImageIcon, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { motion } from 'framer-motion';

const ReceiptAnalysisPage = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    let objectUrlsToRevoke = [];
    
    const fetchReceiptDetails = async () => {
      try {
        setLoading(true);
        
        // Try to get receipt from API
        try {
          const response = await receiptService.getSingleReceipt(parseInt(receiptId));
          if (response.success && response.receipt) {
            setReceipt(response.receipt);
            
            // First try to get the image directly from the backend
            try {
              const imageUrl = await receiptService.getReceiptImage(parseInt(receiptId));
              if (imageUrl) {
                console.log('Successfully fetched image from backend API');
                if (imageUrl.startsWith('blob:')) {
                  objectUrlsToRevoke.push(imageUrl);
                }
                setPreviewImage(imageUrl);
              } else {
                // If backend image fetch fails, check for image URL in receipt data
                if (response.receipt.image_url) {
                  console.log('Using image URL from receipt data (backend image not available)');
                  setPreviewImage(response.receipt.image_url);
                } else {
                  console.log('No image available for this receipt (neither from backend nor receipt data)');
                  setPreviewImage(null);
                }
              }
            } catch (imageError) {
              console.error('Error fetching image from backend:', imageError);
              
              // Fall back to image URL in receipt data
              if (response.receipt.image_url) {
                console.log('Falling back to image URL in receipt data after error');
                setPreviewImage(response.receipt.image_url);
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
          console.log('API error, checking mock data', apiError);
          const mockHistoryResponse = await receiptService.getUserReceiptHistory();
          const mockReceipt = mockHistoryResponse.receipts.find(r => r.id === parseInt(receiptId));
          
          if (mockReceipt) {
            setReceipt(mockReceipt);
            
            // Try to get image from backend even for mock data (might exist on server)
            try {
              const imageUrl = await receiptService.getReceiptImage(parseInt(receiptId));
              if (imageUrl) {
                if (imageUrl.startsWith('blob:')) {
                  objectUrlsToRevoke.push(imageUrl);
                }
                setPreviewImage(imageUrl);
              } else if (mockReceipt.image_url) {
                console.log('Using image URL from mock receipt data');
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
        console.error('Error fetching receipt:', err);
        setError(err.message || 'Failed to load receipt details');
      } finally {
        setLoading(false);
      }
    };

    if (receiptId) {
      fetchReceiptDetails();
    } else {
      setError('No receipt ID provided');
      setLoading(false);
    }
    
    // Cleanup function to revoke object URLs when component unmounts
    return () => {
      objectUrlsToRevoke.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
          console.log('Revoked object URL:', url);
        }
      });
    };
  }, [receiptId]);

  const handleBackClick = () => {
    navigate('/');
  };

  const toggleImageZoom = () => {
    setImageZoomed(!imageZoomed);
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
          console.error('Failed to fetch image for download:', error);
          alert('Sorry, this image cannot be downloaded.');
          return;
        }
      } else {
        console.error('Invalid image URL format for download:', previewImage);
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
      console.error('Error during image download:', error);
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
      {loading ? (
        <div className="py-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading receipt details...</span>
          </div>
        </div>
      ) : error ? (
        <div className="py-8 max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={handleBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-destructive">Error Loading Receipt</h2>
              <p className="text-destructive/90">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={handleBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                Receipt Analysis
              </h1>
              <div className="text-sm text-muted-foreground">
                ID: {receiptId}
              </div>
            </div>
            
            {/* Receipt Image Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border shadow-sm">
                <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
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
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {previewImage ? (
                    <div className="relative">
                      <div className={`relative ${imageZoomed ? 'overflow-auto max-h-[80vh]' : 'overflow-hidden'} bg-muted/40`}>
                        <img 
                          src={previewImage} 
                          alt="Receipt" 
                          className={`mx-auto ${imageZoomed ? 'max-w-none w-auto' : 'max-w-full'} object-contain`}
                          style={{ maxHeight: imageZoomed ? 'none' : '500px' }}
                          onError={(e) => {
                            console.error('Error loading image:', e);
                            // Don't try to load another image, just hide this one and show fallback
                            e.target.style.display = 'none';
                            
                            // Find closest parent that would be good for appending fallback
                            const container = e.target.closest('.relative');
                            if (container) {
                              // Check if fallback already exists to prevent infinite loop
                              if (!container.querySelector('.receipt-fallback')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'flex flex-col items-center justify-center py-16 px-4 text-center receipt-fallback';
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
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="absolute top-3 right-3 rounded-full shadow-md opacity-80 hover:opacity-100"
                        onClick={toggleImageZoom}
                      >
                        {imageZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/30 text-center">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/40 mb-4" />
                      <p className="text-muted-foreground">Receipt image not available</p>
                      <p className="text-sm text-muted-foreground/70 mt-2">The original receipt image might not be stored or is no longer accessible</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            
            {receipt && <ReceiptAnalysisDisplay result={receipt} />}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReceiptAnalysisPage; 