import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Calendar, Star, MapPin, User, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';

interface FeedbackTableProps {
  searchTerm: string;
  statusFilter: string;
  serviceFilter: string;
  dateFromFilter?: string;
  dateToFilter?: string;
}

const FeedbackTable = ({ searchTerm, statusFilter, serviceFilter, dateFromFilter, dateToFilter }: FeedbackTableProps) => {
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { feedback, updateFeedback, deleteFeedback, isLoading } = useFeedback({
    search: searchTerm,
    status: statusFilter,
    service: serviceFilter,
    dateFrom: dateFromFilter,
    dateTo: dateToFilter
  });

  // Pagination logic
  const totalRecords = feedback.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = feedback.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteFeedback = async (feedbackId: string, customerName: string) => {
    try {
      deleteFeedback(feedbackId);
      // Force immediate refresh of all queries
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['feedback'] });
        queryClient.invalidateQueries({ queryKey: ['feedback-metrics'] });
        queryClient.refetchQueries({ queryKey: ['feedback'] });
        queryClient.refetchQueries({ queryKey: ['feedback-metrics'] });
      }, 100);
      
      toast({
        title: "Feedback Deleted",
        description: `Feedback from ${customerName} has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-gray-100 text-gray-800">New</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'escalated':
        return <Badge className="bg-red-100 text-red-800">Escalated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800">Positive</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800">Negative</Badge>;
      case 'neutral':
        return <Badge className="bg-gray-100 text-gray-800">Neutral</Badge>;
      default:
        return <Badge variant="outline">{sentiment}</Badge>;
    }
  };

  const getRatingStars = (rating: number) => {
    if (rating === 0) {
      return (
        <div className="flex items-center">
          <span className="text-gray-500">No Rating</span>
        </div>
      );
    }

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const updateStatus = (feedbackId: string, newStatus: string) => {
    updateFeedback({ id: feedbackId, updates: { status: newStatus as any } });
    // Force refresh after status update
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['feedback-metrics'] });
    }, 100);
  };

  const downloadCSV = () => {
    const headers = [
      'Date', 'ID', 'Customer ID', 'Customer Name', 'Phone', 'Email', 'Service Type', 
      'Review Text', 'Rating', 'Sentiment', 'Status', 'Location', 'Bank Contact'
    ];

    const csvData = feedback.map(item => [
      new Date(item.created_at).toLocaleDateString(),
      item.id,
      item.customer_id || '',
      item.customer_name,
      item.customer_phone || '',
      item.customer_email || '',
      item.service_type,
      `"${item.review_text.replace(/"/g, '""')}"`,
      item.review_rating,
      item.sentiment,
      item.status,
      item.issue_location || '',
      item.contacted_bank_person || ''
    ]);

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${feedback.length} feedback records to CSV.`,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading feedback data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords} feedback records
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRecords.map((feedbackItem) => (
              <TableRow key={feedbackItem.id}>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{new Date(feedbackItem.created_at).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{feedbackItem.customer_name}</div>
                    <div className="text-sm text-gray-500">
                      {feedbackItem.customer_id && `ID: ${feedbackItem.customer_id}`}
                      {feedbackItem.issue_location && ` • ${feedbackItem.issue_location}`}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{feedbackItem.service_type}</Badge>
                </TableCell>
                <TableCell>{getRatingStars(feedbackItem.review_rating)}</TableCell>
                <TableCell>{getSentimentBadge(feedbackItem.sentiment)}</TableCell>
                <TableCell>
                  <Select value={feedbackItem.status} onValueChange={(value) => updateStatus(feedbackItem.id, value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedFeedback(feedbackItem)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Feedback Details</DialogTitle>
                          <DialogDescription>
                            Complete feedback information and detected issues
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedFeedback && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{selectedFeedback.customer_name}</span>
                                {selectedFeedback.customer_id && (
                                  <Badge variant="outline">ID: {selectedFeedback.customer_id}</Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span>{new Date(selectedFeedback.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span>{selectedFeedback.issue_location || 'Not specified'}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Star className="w-4 h-4 text-gray-500" />
                                {getRatingStars(selectedFeedback.review_rating)}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Contact Information</h4>
                              <p className="text-sm text-gray-600">Phone: {selectedFeedback.customer_phone || 'N/A'}</p>
                              <p className="text-sm text-gray-600">Email: {selectedFeedback.customer_email || 'N/A'}</p>
                              <p className="text-sm text-gray-600">Bank Contact: {selectedFeedback.contacted_bank_person || 'N/A'}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Review Text</h4>
                              <p className="text-sm bg-gray-50 p-3 rounded">{selectedFeedback.review_text}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">Sentiment</h4>
                                {getSentimentBadge(selectedFeedback.sentiment)}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Status</h4>
                                {getStatusBadge(selectedFeedback.status)}
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Service</h4>
                                <Badge variant="outline">{selectedFeedback.service_type}</Badge>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Detected Issues</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedFeedback.detected_issues?.length > 0 ? 
                                  selectedFeedback.detected_issues.map((issue: string, index: number) => (
                                    <Badge key={index} variant="outline">{issue}</Badge>
                                  )) : 
                                  <span className="text-gray-500">No issues detected yet</span>
                                }
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the feedback from {feedbackItem.customer_name}? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteFeedback(feedbackItem.id, feedbackItem.customer_name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      {feedback.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No feedback records found matching the current filters.
        </div>
      )}
    </div>
  );
};

export default FeedbackTable;
