
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, AlertTriangle, LogOut, User, Loader2 } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoginForm from './LoginForm';
import IssueResolutionManager from './IssueResolutionManager';

const IssueEndorsement = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch approved issues
  const { data: approvedIssues = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['approved-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('status', 'approved')
        .order('approved_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated
  });

  // Fetch rejected issues
  const { data: rejectedIssues = [], isLoading: loadingRejected } = useQuery({
    queryKey: ['rejected-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rejected_issues')
        .select('*')
        .order('rejected_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated
  });

  // Fetch pending issues count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-issues-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pending_issues')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    enabled: isAuthenticated
  });

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
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
            Pending Issues ({pendingCount})
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
          <IssueResolutionManager />
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
                        <Badge variant="secondary">
                          {issue.feedback_count} feedback{issue.feedback_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{issue.title}</CardTitle>
                      <CardDescription>
                        Approved by {issue.approved_by} on {new Date(issue.approved_date).toLocaleDateString()}
                        {issue.confidence_score && (
                          <> | Confidence: {Math.round(issue.confidence_score * 100)}%</>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Issue Description:</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-l-gray-400">
                        {issue.description}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Approved Resolution:</h4>
                      <p className="text-sm bg-green-50 p-3 rounded border-l-4 border-l-green-400">
                        {issue.resolution}
                      </p>
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
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
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
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                      <CardTitle className="text-lg">{issue.original_title}</CardTitle>
                      <CardDescription>
                        Rejected by {issue.rejected_by} on {new Date(issue.rejected_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Original Description:</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-l-gray-400">
                        {issue.original_description}
                      </p>
                    </div>
                    {issue.rejection_reason && (
                      <div>
                        <h4 className="font-semibold mb-2">Rejection Reason:</h4>
                        <p className="text-sm bg-red-50 p-3 rounded border-l-4 border-l-red-400">
                          {issue.rejection_reason}
                        </p>
                      </div>
                    )}
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
