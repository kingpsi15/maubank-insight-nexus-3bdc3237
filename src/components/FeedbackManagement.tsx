
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Search, Filter } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import FeedbackTable from '@/components/FeedbackTable';
import BulkUpload from '@/components/BulkUpload';

const FeedbackManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName || !formData.reviewText || !formData.reviewRating) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Simulate API call
    console.log('Submitting feedback:', formData);
    
    toast({
      title: "Feedback Added",
      description: "Customer feedback has been successfully recorded.",
    });

    // Reset form
    setFormData({
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
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feedback Management</CardTitle>
              <CardDescription>Manage customer feedback entries and bulk operations</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowBulkUpload(!showBulkUpload)}
                variant="outline"
                className="flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

            <div className="flex items-center">
              <Badge variant="outline" className="flex items-center">
                <Filter className="w-3 h-3 mr-1" />
                {searchTerm || statusFilter !== 'all' || serviceFilter !== 'all' ? 'Filtered' : 'All Data'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Upload */}
      {showBulkUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Upload Feedback</CardTitle>
            <CardDescription>Upload multiple feedback entries via CSV file</CardDescription>
          </CardHeader>
          <CardContent>
            <BulkUpload onUploadComplete={() => setShowBulkUpload(false)} />
          </CardContent>
        </Card>
      )}

      {/* Add Feedback Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Feedback</CardTitle>
            <CardDescription>Manually enter customer feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Input
                    id="issueLocation"
                    value={formData.issueLocation}
                    onChange={(e) => handleInputChange('issueLocation', e.target.value)}
                    placeholder="City or branch location"
                  />
                </div>

                <div className="md:col-span-2">
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
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Save Feedback
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
          <CardDescription>View and manage all customer feedback entries</CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackTable 
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            serviceFilter={serviceFilter}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackManagement;
