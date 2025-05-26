import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Calendar, Star, MapPin, User } from 'lucide-react';

interface FeedbackTableProps {
  searchTerm: string;
  statusFilter: string;
  serviceFilter: string;
}

const FeedbackTable = ({ searchTerm, statusFilter, serviceFilter }: FeedbackTableProps) => {
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  // Mock feedback data based on Mau Bank Malaysia
  const feedbackData = [
    {
      id: 'F001',
      date: '2025-05-25',
      customerName: 'Ahmad Rahman',
      customerPhone: '+60-12-3456789',
      customerEmail: 'ahmad.rahman@email.com',
      serviceType: 'ATM',
      reviewText: 'ATM di cawangan Kuala Lumpur sangat perlahan dan kad saya tersekat. Terpaksa menunggu 30 minit untuk bantuan.',
      reviewRating: 2,
      issueLocation: 'Kuala Lumpur',
      contactedBankPerson: 'Siti Aminah',
      status: 'in_progress',
      detectedIssues: ['ATM card stuck', 'Slow transaction'],
      sentiment: 'negative'
    },
    {
      id: 'F002',
      date: '2025-05-24',
      customerName: 'Sarah Lim',
      customerPhone: '+60-16-7891234',
      customerEmail: 'sarah.lim@email.com',
      serviceType: 'OnlineBanking',
      reviewText: 'Sistem perbankan dalam talian sangat bagus! Mudah digunakan dan selamat. Suka dengan kemaskini aplikasi mudah alih yang baru.',
      reviewRating: 5,
      issueLocation: 'Selangor',
      contactedBankPerson: 'Lee Wei Ming',
      status: 'resolved',
      detectedIssues: ['Positive feedback'],
      sentiment: 'positive'
    },
    {
      id: 'F003',
      date: '2025-05-23',
      customerName: 'Raj Kumar',
      customerPhone: '+60-19-2345678',
      customerEmail: 'raj.kumar@email.com',
      serviceType: 'CoreBanking',
      reviewText: 'Pemindahan wang tertangguh selama 3 hari. Pengalaman yang sangat mengecewakan dengan perkhidmatan pelanggan.',
      reviewRating: 1,
      issueLocation: 'Penang',
      contactedBankPerson: 'Nurul Huda',
      status: 'escalated',
      detectedIssues: ['Transaction delay', 'Poor customer service'],
      sentiment: 'negative'
    },
    {
      id: 'F004',
      date: '2025-05-22',
      customerName: 'Fatimah Zahra',
      customerPhone: '+60-13-8765432',
      customerEmail: 'fatimah.zahra@email.com',
      serviceType: 'OnlineBanking',
      reviewText: 'Proses permohonan pinjaman yang cepat dan mudah melalui laman web. Sangat berpuas hati dengan perkhidmatan.',
      reviewRating: 4,
      issueLocation: 'Johor Bahru',
      contactedBankPerson: 'Muhammad Hafiz',
      status: 'resolved',
      detectedIssues: ['Positive feedback'],
      sentiment: 'positive'
    },
    {
      id: 'F005',
      date: '2025-05-21',
      customerName: 'Chen Wei',
      customerPhone: '+60-17-5432109',
      customerEmail: 'chen.wei@email.com',
      serviceType: 'ATM',
      reviewText: 'ATM kehabisan wang tunai semasa waktu puncak. Ini kerap berlaku di lokasi ini.',
      reviewRating: 2,
      issueLocation: 'Melaka',
      contactedBankPerson: 'Azman Ismail',
      status: 'new',
      detectedIssues: ['ATM out of cash'],
      sentiment: 'negative'
    }
  ];

  const filteredData = feedbackData.filter(feedback => {
    const matchesSearch = feedback.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feedback.reviewText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feedback.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    const matchesService = serviceFilter === 'all' || feedback.serviceType === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesService;
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
    console.log(`Updating feedback ${feedbackId} status to ${newStatus}`);
    // Here you would update the status in your MySQL backend
  };

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
            {filteredData.map((feedback) => (
              <TableRow key={feedback.id}>
                <TableCell className="font-medium">{feedback.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{feedback.customerName}</div>
                    <div className="text-sm text-gray-500">{feedback.issueLocation}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{feedback.serviceType}</Badge>
                </TableCell>
                <TableCell>{getRatingStars(feedback.reviewRating)}</TableCell>
                <TableCell>{getSentimentBadge(feedback.sentiment)}</TableCell>
                <TableCell>
                  <Select value={feedback.status} onValueChange={(value) => updateStatus(feedback.id, value)}>
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
                <TableCell>{feedback.date}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Feedback Details - {feedback.id}</DialogTitle>
                        <DialogDescription>
                          Complete feedback information and detected issues
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedFeedback && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{selectedFeedback.customerName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span>{selectedFeedback.date}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span>{selectedFeedback.issueLocation}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 text-gray-500" />
                              {getRatingStars(selectedFeedback.reviewRating)}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Contact Information</h4>
                            <p className="text-sm text-gray-600">Phone: {selectedFeedback.customerPhone}</p>
                            <p className="text-sm text-gray-600">Email: {selectedFeedback.customerEmail}</p>
                            <p className="text-sm text-gray-600">Bank Contact: {selectedFeedback.contactedBankPerson}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Review Text</h4>
                            <p className="text-sm bg-gray-50 p-3 rounded">{selectedFeedback.reviewText}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Detected Issues</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedFeedback.detectedIssues.map((issue: string, index: number) => (
                                <Badge key={index} variant="outline">{issue}</Badge>
                              ))}
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
      
      {filteredData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No feedback records found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default FeedbackTable;
