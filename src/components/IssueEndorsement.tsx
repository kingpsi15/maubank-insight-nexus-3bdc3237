
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, AlertTriangle, LogOut, User } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LoginForm from './LoginForm';
import IssueResolutionManager from './IssueResolutionManager';

const IssueEndorsement = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Mock data for approved issues
  const approvedIssues = [
    {
      id: 'AI001',
      issue: 'ATM cash dispensing error',
      category: 'ATM',
      approvedResolution: 'Check ATM cash count and report discrepancy to operations team. Initiate customer refund process if applicable.',
      approvedBy: 'Ahmad Rahman',
      approvedDate: '2025-05-20',
      linkedFeedbacks: 15
    },
    {
      id: 'AI002',
      issue: 'Mobile app crashes during transaction',
      category: 'OnlineBanking',
      approvedResolution: 'Update mobile application to latest version. Clear app cache and data. If issue persists, reinstall application.',
      approvedBy: 'Siti Nurhaliza',
      approvedDate: '2025-05-18',
      linkedFeedbacks: 23
    }
  ];

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
            Pending Issues (3)
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved Issues ({approvedIssues.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center">
            <XCircle className="w-4 h-4 mr-2" />
            Rejected Issues (5)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <IssueResolutionManager />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedIssues.map((issue) => (
            <Card key={issue.id} className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline">{issue.category}</Badge>
                      <Badge className="bg-green-100 text-green-800">Approved</Badge>
                    </div>
                    <CardTitle className="text-lg">{issue.issue}</CardTitle>
                    <CardDescription>
                      Approved by {issue.approvedBy} on {issue.approvedDate} | 
                      Linked to {issue.linkedFeedbacks} feedback entries
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div>
                  <h4 className="font-semibold mb-2">Approved Resolution:</h4>
                  <p className="text-sm bg-green-50 p-3 rounded border-l-4 border-l-green-400">
                    {issue.approvedResolution}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-center py-8 text-gray-500">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No rejected issues to display</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IssueEndorsement;
