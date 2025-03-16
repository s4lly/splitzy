import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Loader2, Receipt } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import receiptService from '../../services/receiptService';

const ModernReceiptUploader = ({ onAnalysisComplete }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/jpg': []
    },
    maxFiles: 1,
    multiple: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      
      // Pass the preview URL to the receipt service
      const result = await receiptService.analyzeReceipt(file, preview);
      
      if (result.success && result.is_receipt) {
        // Clear previous inputs
        setTimeout(() => {
          setFile(null);
          setPreview(null);
        }, 2000);
        
        // Call the onAnalysisComplete callback with the result
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else if (result.success && !result.is_receipt) {
        setError('The uploaded image does not appear to be a payment document (receipt, invoice, bill, etc.). Please upload an image that contains items, prices, and totals.');
      } else {
        setError(result.error || 'Failed to analyze document');
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      setError('An error occurred while analyzing the document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <Card className="w-full shadow-md border-2 border-border/30">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Upload Document
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!preview ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key="dropzone"
              >
                <div 
                  {...getRootProps()} 
                  className={`border-3 border-dashed rounded-xl p-8 cursor-pointer transition-all hover:shadow-inner ${
                    isDragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <Upload className="h-14 w-14 text-primary/80" />
                    {isDragActive ? (
                      <p className="text-lg font-medium text-primary">Drop the document here...</p>
                    ) : (
                      <>
                        <p className="text-lg font-medium">Drag & drop your receipt or invoice here</p>
                        <p className="text-md text-muted-foreground">
                          or click to browse files (JPG, JPEG, PNG)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                key="preview"
                className="relative"
              >
                <div className="flex justify-center">
                  <div className="relative max-w-[300px] h-auto overflow-hidden rounded-lg shadow-md border border-border">
                    <img 
                      src={preview} 
                      alt="Document preview" 
                      className="object-contain w-full" 
                      style={{ maxHeight: '400px' }}
                    />
                    <Button 
                      variant="destructive" 
                      size="icon"
                      className="absolute top-3 right-3 rounded-full shadow-md" 
                      onClick={clearFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 bg-muted/30 p-3 rounded-md">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-base font-medium truncate">
                    {file?.name}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-base text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20"
            >
              {error}
            </motion.div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="py-4 border-t border-border bg-muted/20">
        <Button
          className="w-full py-6 text-base font-medium"
          size="lg"
          onClick={handleSubmit}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Analyze Document
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ModernReceiptUploader; 