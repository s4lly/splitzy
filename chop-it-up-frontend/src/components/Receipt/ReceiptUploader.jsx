import React, { useState } from 'react';
import {
  Flex,
  Heading,
  Text,
  Button,
  ProgressCircle,
  Well,
  IllustratedMessage,
  Content,
} from '@adobe/react-spectrum';
import Upload from '@spectrum-icons/illustrations/Upload';
import Document from '@spectrum-icons/workflow/Document';
import AlertCircle from '@spectrum-icons/workflow/AlertCircle';
import receiptService from '../../services/receiptService';

const ReceiptUploader = ({ onAnalysisComplete }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    }
  };

  // Handle file upload and analysis
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a receipt image to analyze');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await receiptService.analyzeReceipt(file);
      
      if (result.success && result.is_receipt) {
        onAnalysisComplete(result);
      } else if (result.success && !result.is_receipt) {
        setError('The uploaded image does not appear to be a receipt. Please try a different image.');
      } else {
        setError(result.error || 'Failed to analyze the receipt. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while analyzing the receipt. Please try again.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Flex direction="column" gap="size-200">
      <Heading level={2}>Upload Receipt</Heading>
      
      {/* File Drop Zone */}
      <Well>
        <Flex
          direction="column"
          alignItems="center"
          justifyContent="center"
          gap="size-100"
          height="size-3000"
        >
          {preview ? (
            <img 
              src={preview} 
              alt="Receipt preview" 
              style={{ 
                maxHeight: '200px', 
                maxWidth: '100%', 
                objectFit: 'contain' 
              }} 
            />
          ) : (
            <IllustratedMessage>
              <Upload />
              <Heading>Upload Receipt Image</Heading>
              <Content>Select a JPG, JPEG, or PNG file</Content>
            </IllustratedMessage>
          )}
          
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="receipt-upload"
          />
          
          <Button 
            variant="primary" 
            onPress={() => document.getElementById('receipt-upload').click()}
          >
            Select Image
          </Button>
        </Flex>
      </Well>
      
      {/* Error Message */}
      {error && (
        <Flex alignItems="center" gap="size-100">
          <AlertCircle color="negative" />
          <Text UNSAFE_style={{ color: 'var(--spectrum-semantic-negative-color-default)' }}>
            {error}
          </Text>
        </Flex>
      )}
      
      {/* Upload Button */}
      <Button
        variant="cta"
        onPress={handleUpload}
        isDisabled={!file || isUploading}
        width="size-2000"
        alignSelf="center"
      >
        {isUploading ? <ProgressCircle size="S" isIndeterminate /> : <Document />}
        <Text>
          {isUploading ? 'Analyzing...' : 'Analyze Receipt'}
        </Text>
      </Button>
    </Flex>
  );
};

export default ReceiptUploader; 