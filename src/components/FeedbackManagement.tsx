
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useFeedback } from '@/hooks/useFeedback';
import FeedbackTable from '@/components/FeedbackTable';
import BulkUpload from '@/components/BulkUpload';

const FeedbackManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const { toast } = useToast();
  const { createFeedback, isCreating } = useFeedback();

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceType: '',
    reviewText: '',
    reviewRating: '',
    issueLocation: '',
    contactedBankPerson: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName || !formData.reviewText || !formData.reviewRating || !formData.serviceType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create feedback object matching database schema
      const feedbackData = {
        customer_id: formData.customerId || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone || null,
        customer_email: formData.customerEmail || null,
        service_type: formData.serviceType as 'ATM' | 'OnlineBanking' | 'CoreBanking',
        review_text: formData.reviewText,
        review_rating: parseInt(formData.reviewRating),
        issue_location: formData.issueLocation || null,
        contacted_bank_person: formData.contactedBankPerson || null,
        status: 'new' as const,
        sentiment: 'neutral' as const,
        detected_issues: []
      };

      await createFeedback(feedbackData);

      // Reset form
      setFormData({
        customerId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        serviceType: '',
        reviewText: '',
        reviewRating: '',
        issueLocation: '',
        contactedBankPerson: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating feedback:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setServiceFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Feedback Management</CardTitle>
              <CardDescription>Comprehensive feedback collection and management system for Mau Bank Malaysia</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowBulkUpload(!showBulkUpload)}
                variant="outline"
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Feedback
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="ATM">ATM</SelectItem>
                <SelectItem value="OnlineBanking">Online Banking</SelectItem>
                <SelectItem value="CoreBanking">Core Banking</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="From date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="To date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center">
                <Filter className="w-3 h-3 mr-1" />
                {searchTerm || statusFilter !== 'all' || serviceFilter !== 'all' || dateFromFilter || dateToFilter ? 'Filtered' : 'All Data'}
              </Badge>
              {(searchTerm || statusFilter !== 'all' || serviceFilter !== 'all' || dateFromFilter || dateToFilter) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Upload */}
      {showBulkUpload && (
        <BulkUpload onUploadComplete={() => setShowBulkUpload(false)} />
      )}

      {/* Add Feedback Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Customer Feedback</CardTitle>
            <CardDescription>Manually enter customer feedback into the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer ID</Label>
                  <Input
                    id="customerId"
                    value={formData.customerId}
                    onChange={(e) => handleInputChange('customerId', e.target.value)}
                    placeholder="CUST001"
                  />
                </div>

                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="+60-12-3456789"
                  />
                </div>

                <div>
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <Select value={formData.serviceType} onValueChange={(value) => handleInputChange('serviceType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ATM">ATM</SelectItem>
                      <SelectItem value="OnlineBanking">Online Banking</SelectItem>
                      <SelectItem value="CoreBanking">Core Banking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reviewRating">Rating (0-5) *</Label>
                  <Select value={formData.reviewRating} onValueChange={(value) => handleInputChange('reviewRating', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - No Rating</SelectItem>
                      <SelectItem value="1">1 - Very Poor</SelectItem>
                      <SelectItem value="2">2 - Poor</SelectItem>
                      <SelectItem value="3">3 - Average</SelectItem>
                      <SelectItem value="4">4 - Good</SelectItem>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="issueLocation">Issue Location</Label>
                  <Select value={formData.issueLocation} onValueChange={(value) => handleInputChange('issueLocation', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                      <SelectItem value="Selangor">Selangor</SelectItem>
                      <SelectItem value="Penang">Penang</SelectItem>
                      <SelectItem value="Johor Bahru">Johor Bahru</SelectItem>
                      <SelectItem value="Melaka">Melaka</SelectItem>
                      <SelectItem value="Ipoh">Ipoh</SelectItem>
                      <SelectItem value="Kota Kinabalu">Kota Kinabalu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contactedBankPerson">Bank Employee Contacted</Label>
                  <Input
                    id="contactedBankPerson"
                    value={formData.contactedBankPerson}
                    onChange={(e) => handleInputChange('contactedBankPerson', e.target.value)}
                    placeholder="Employee name"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="reviewText">Review Text *</Label>
                  <Textarea
                    id="reviewText"
                    value={formData.reviewText}
                    onChange={(e) => handleInputChange('reviewText', e.target.value)}
                    placeholder="Customer feedback text..."
                    rows={4}
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Save Feedback'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Feedback Records</CardTitle>
          <CardDescription>View and manage all customer feedback entries from the database</CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackTable 
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            serviceFilter={serviceFilter}
            dateFromFilter={dateFromFilter}
            dateToFilter={dateToFilter}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackManagement;
