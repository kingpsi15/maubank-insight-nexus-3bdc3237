import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, AlertTriangle, LogOut, User, Loader2 } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mysqlService } from '@/services/mysqlService';
import LoginForm from './LoginForm';
import IssueResolutionManager from './IssueResolutionManager';

const IssueEndorsement = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approved issues with resolution field
  const { data: approvedIssues = [], isLoading: loadingApproved, error: approvedError } = useQuery({
    queryKey: ['approved-issues'],
    queryFn: async () => {
      try {
        const response = await fetch(`${mysqlService.apiBaseUrl}/issues?status=approved`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch approved issues: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching approved issues:', error);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch rejected issues
  const { data: rejectedIssues = [], isLoading: loadingRejected, error: rejectedError } = useQuery({
    queryKey: ['rejected-issues'],
    queryFn: async () => {
      try {
        const response = await fetch(`${mysqlService.apiBaseUrl}/rejected-issues`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch rejected issues: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching rejected issues:', error);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch pending issues to get the count
  const { data: pendingIssues = [], isLoading: loadingPending, error: pendingError } = useQuery({
    queryKey: ['pending-issues-count'],
    queryFn: async () => {
      try {
        const response = await fetch(`${mysqlService.apiBaseUrl}/pending-issues`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pending issues: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching pending issues:', error);
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-issues'] });
    queryClient.invalidateQueries({ queryKey: ['pending-issues-count'] });
    queryClient.invalidateQueries({ queryKey: ['approved-issues'] });
    queryClient.invalidateQueries({ queryKey: ['rejected-issues'] });
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Issue Detection & Endorsement</CardTitle>
            <CardDescription>
              This section requires authentication. Please login to access issue detection and endorsement features.
            </CardDescription>
          </CardHeader>
        </Card>
        <LoginForm />
      </div>
    );
  }

  // Show errors if any queries failed
  if (approvedError || rejectedError || pendingError) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Error loading data. Please check your connection and try again.
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Issue Detection & Endorsement</CardTitle>
              <CardDescription>
                Review automatically detected issues and their suggested resolutions. 
                Approve, reject, or edit issues before they become part of the master knowledge base.
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <User className="w-4 h-4" />
                <span>{user?.name}</span>
                <Badge variant="secondary">{user?.role}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Pending Issues ({pendingIssues.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved Issues ({approvedIssues.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center">
            <XCircle className="w-4 h-4 mr-2" />
            Rejected Issues ({rejectedIssues.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loadingPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading pending issues...</span>
            </div>
          ) : (
            <IssueResolutionManager />
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {loadingApproved ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading approved issues...</span>
            </div>
          ) : approvedIssues.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No approved issues yet</p>
                  <p className="text-sm">Approved issues will appear here after review</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            approvedIssues.map((issue) => (
              <Card key={issue.id} className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{issue.category}</Badge>
                        <Badge className="bg-green-100 text-green-800">Approved</Badge>
                        <Badge variant="secondary">{issue.feedback_count} feedback{issue.feedback_count !== 1 ? 's' : ''}</Badge>
                      </div>
                      <CardTitle>{issue.title}</CardTitle>
                      <CardDescription>
                        Approved by: {issue.approved_by} | Date: {new Date(issue.approved_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Issue Description:</h4>
                      <p className="text-sm text-gray-600">{issue.description}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Resolution Plan:</h4>
                      <p className="text-sm text-gray-600 bg-green-50 p-3 rounded border-l-4 border-l-green-400">{issue.resolution}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {loadingRejected ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading rejected issues...</span>
            </div>
          ) : rejectedIssues.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No rejected issues</p>
                  <p className="text-sm">Rejected issues will appear here after review</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            rejectedIssues.map((issue) => (
              <Card key={issue.id} className="border-l-4 border-l-red-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{issue.category}</Badge>
                        <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                      </div>
                      <CardTitle>{issue.original_title}</CardTitle>
                      <CardDescription>
                        Rejected by: {issue.rejected_by} | Date: {new Date(issue.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Original Description:</h4>
                      <p className="text-sm text-gray-600">{issue.original_description}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Rejection Reason:</h4>
                      <p className="text-sm text-gray-600 bg-red-50 p-3 rounded border-l-4 border-l-red-400">{issue.rejection_reason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IssueEndorsement;
