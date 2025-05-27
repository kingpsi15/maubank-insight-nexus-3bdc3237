
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Calendar, Star, MapPin, User } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';

interface FeedbackTableProps {
  searchTerm: string;
  statusFilter: string;
  serviceFilter: string;
}

const FeedbackTable = ({ searchTerm, statusFilter, serviceFilter }: FeedbackTableProps) => {
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  
  const { feedback, updateFeedback, isLoading } = useFeedback({
    search: searchTerm,
    status: statusFilter,
    service: serviceFilter
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
    return sentiment === 'positive' 
      ? <Badge className="bg-green-100 text-green-800">Positive</Badge>
      : <Badge className="bg-red-100 text-red-800">Negative</Badge>;
  };

  const getRatingStars = (rating: number) => {
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

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading feedback data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
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
                <TableCell className="font-medium">{feedbackItem.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{feedbackItem.customer_name}</div>
                    <div className="text-sm text-gray-500">{feedbackItem.issue_location}</div>
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
                        <DialogTitle>Feedback Details - {feedbackItem.id}</DialogTitle>
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
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>{new Date(selectedFeedback.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{selectedFeedback.issue_location}</span>
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
                          
                          <div>
                            <h4 className="font-semibold mb-2">Detected Issues</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedFeedback.detected_issues?.map((issue: string, index: number) => (
                                <Badge key={index} variant="outline">{issue}</Badge>
                              )) || <span className="text-gray-500">No issues detected</span>}
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
          No feedback records found. {feedback.length === 0 && !isLoading && "Please connect to Supabase to view real data."}
        </div>
      )}
    </div>
  );
};

export default FeedbackTable;
