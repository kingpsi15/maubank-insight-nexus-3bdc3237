
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Calendar, Star, MapPin, User, Download } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';
import { useToast } from "@/hooks/use-toast";

interface FeedbackTableProps {
  searchTerm: string;
  statusFilter: string;
  serviceFilter: string;
  dateFromFilter?: string;
  dateToFilter?: string;
}

const FeedbackTable = ({ searchTerm, statusFilter, serviceFilter, dateFromFilter, dateToFilter }: FeedbackTableProps) => {
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const { toast } = useToast();
  
  const { feedback, updateFeedback, isLoading } = useFeedback({
    search: searchTerm,
    status: statusFilter,
    service: serviceFilter,
    dateFrom: dateFromFilter,
    dateTo: dateToFilter
  });

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
  };

  const downloadCSV = () => {
    const headers = [
      'ID', 'Customer ID', 'Customer Name', 'Phone', 'Email', 'Service Type', 
      'Review Text', 'Rating', 'Sentiment', 'Status', 'Location', 'Bank Contact', 'Date'
    ];

    const csvData = feedback.map(item => [
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
      item.contacted_bank_person || '',
      new Date(item.created_at).toLocaleDateString()
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
          Showing {feedback.length} feedback records
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
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedback.map((feedbackItem) => (
              <TableRow key={feedbackItem.id}>
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
                <TableCell>{new Date(feedbackItem.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {feedback.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No feedback records found matching the current filters.
        </div>
      )}
    </div>
  );
};

export default FeedbackTable;
