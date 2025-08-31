import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle, Eye, Receipt, Clock, Store, Trash2 } from 'lucide-react';
import receiptService from '../../services/receiptService';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const ReceiptHistory = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null); // ID of receipt being deleted
  const [showConfirmDelete, setShowConfirmDelete] = useState(null); // ID of receipt to confirm delete

  const fetchReceiptHistory = async () => {
    try {
      setLoading(true);
      const response = await receiptService.getUserReceiptHistory();
      setReceipts(response.receipts || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching receipt history:', err);
      setError('Failed to load receipt history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceiptHistory();
  }, []);

  const handleViewReceipt = (receiptId) => {
    navigate(`/receipt/${receiptId}`);
  };

  const handleDeleteClick = (receiptId) => {
    setShowConfirmDelete(receiptId);
  };

  const handleConfirmDelete = async (receiptId) => {
    try {
      setDeleting(receiptId);
      await receiptService.deleteReceipt(receiptId);
      // Remove the receipt from the local state
      setReceipts(receipts.filter((receipt) => receipt.id !== receiptId));
    } catch (err) {
      console.error('Error deleting receipt:', err);
      // Show an error message
      alert('Failed to delete receipt. Please try again.');
    } finally {
      setDeleting(null);
      setShowConfirmDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDelete(null);
  };

  if (loading) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Receipt History
          </CardTitle>
          <CardDescription>Your previously analyzed receipts</CardDescription>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4">
              <Skeleton className="mb-2 h-24 w-full rounded-md" />
              <div className="flex justify-between">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Receipt History
        </CardTitle>
        <CardDescription>Your previously analyzed receipts</CardDescription>
      </CardHeader>
      <CardContent>
        {receipts.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Receipt className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No receipt history found</p>
            <p className="mt-1 text-sm">Upload a receipt to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt, index) => (
              <motion.div
                key={receipt.id}
                className="rounded-lg border p-3 transition-colors hover:bg-accent/5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="flex items-center gap-1 font-medium">
                      <Store className="h-4 w-4" />
                      {receipt.receipt_data?.merchant || 'Unknown Merchant'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ${receipt.receipt_data?.total?.toFixed(2) || '0.00'} •{' '}
                      {receipt.receipt_data?.date || 'Unknown date'}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {receipt.created_at
                      ? formatDistanceToNow(new Date(receipt.created_at), {
                          addSuffix: true,
                        })
                      : 'Unknown'}
                  </div>
                </div>

                {showConfirmDelete === receipt.id ? (
                  <div className="mt-2 border-t pt-2">
                    <p className="mb-2 text-sm text-destructive">
                      Are you sure you want to delete this receipt?
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelDelete}
                        disabled={deleting === receipt.id}
                        className="h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleConfirmDelete(receipt.id)}
                        disabled={deleting === receipt.id}
                        className="h-8"
                      >
                        {deleting === receipt.id ? (
                          <>
                            <span className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(receipt.id)}
                      className="h-8"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteClick(receipt.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptHistory;
