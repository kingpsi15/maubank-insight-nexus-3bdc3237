
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, AlertTriangle, Edit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const IssueEndorsement = () => {
  const { toast } = useToast();
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Mock data for pending issues
  const pendingIssues = [
    {
      id: 'PI001',
      feedbackId: 'F001',
      customerName: 'John Doe',
      serviceType: 'ATM',
      detectedIssue: 'ATM card stuck in machine',
      confidence: 0.95,
      suggestedResolution: 'Contact customer to verify card status and arrange replacement if needed. Check ATM maintenance log.',
      reviewText: 'My card got stuck in the ATM at the Mumbai branch. The machine just kept my card and I could not get it back.',
      location: 'Mumbai',
      date: '2025-05-25'
    },
    {
      id: 'PI002',
      feedbackId: 'F002',
      customerName: 'Sarah Smith',
      serviceType: 'OnlineBanking',
      detectedIssue: 'Login authentication failure',
      confidence: 0.87,
      suggestedResolution: 'Reset customer password and verify security questions. Provide two-factor authentication setup guidance.',
      reviewText: 'I cannot login to my online banking account. It keeps saying invalid credentials even though I am sure my password is correct.',
      location: 'Delhi',
      date: '2025-05-24'
    },
    {
      id: 'PI003',
      feedbackId: 'F003',
      customerName: 'Mike Johnson',
      serviceType: 'CoreBanking',
      detectedIssue: 'Transaction processing delay',
      confidence: 0.78,
      suggestedResolution: 'Investigate transaction processing queue and check for system delays. Provide transaction status update to customer.',
      reviewText: 'My transfer to another bank has been pending for 3 days now. The money has been debited from my account but not credited to the recipient.',
      location: 'Bangalore',
      date: '2025-05-23'
    }
  ];

  // Mock data for approved issues
  const approvedIssues = [
    {
      id: 'AI001',
      issue: 'ATM cash dispensing error',
      category: 'ATM',
      approvedResolution: 'Check ATM cash count and report discrepancy to operations team. Initiate customer refund process if applicable.',
      approvedBy: 'Admin User',
      approvedDate: '2025-05-20',
      linkedFeedbacks: 15
    },
    {
      id: 'AI002',
      issue: 'Mobile app crashes during transaction',
      category: 'OnlineBanking',
      approvedResolution: 'Update mobile application to latest version. Clear app cache and data. If issue persists, reinstall application.',
      approvedBy: 'Tech Lead',
      approvedDate: '2025-05-18',
      linkedFeedbacks: 23
    }
  ];

  const handleApprove = (issueId: string, editedText?: string) => {
    console.log('Approving issue:', issueId, editedText);
    toast({
      title: "Issue Approved",
      description: "The issue has been approved and added to the master issues list.",
    });
    setEditingIssue(null);
    setEditText('');
  };

  const handleReject = (issueId: string) => {
    console.log('Rejecting issue:', issueId);
    toast({
      title: "Issue Rejected",
      description: "The issue has been rejected and moved to the archive.",
      variant: "destructive"
    });
  };

  const startEdit = (issueId: string, currentText: string) => {
    setEditingIssue(issueId);
    setEditText(currentText);
  };

  const cancelEdit = () => {
    setEditingIssue(null);
    setEditText('');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue Detection & Endorsement</CardTitle>
          <CardDescription>
            Review automatically detected issues and their suggested resolutions. 
            Approve, reject, or edit issues before they become part of the master knowledge base.
          </CardDescription>
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
            Rejected Issues (5)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingIssues.map((issue) => (
            <Card key={issue.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline">{issue.serviceType}</Badge>
                      <Badge className={getConfidenceColor(issue.confidence)}>
                        {Math.round(issue.confidence * 100)}% confidence
                      </Badge>
                      <Badge variant="secondary">{issue.location}</Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {editingIssue === issue.id ? (
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="mt-2"
                        />
                      ) : (
                        issue.detectedIssue
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <strong>Customer:</strong> {issue.customerName} | <strong>Date:</strong> {issue.date}
                    </CardDescription>
                  </div>
                  {editingIssue !== issue.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(issue.id, issue.detectedIssue)}
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Original Feedback:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{issue.reviewText}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Suggested Resolution:</h4>
                  <p className="text-sm bg-blue-50 p-3 rounded border-l-4 border-l-blue-400">
                    {issue.suggestedResolution}
                  </p>
                </div>

                <div className="flex space-x-2 pt-4">
                  {editingIssue === issue.id ? (
                    <>
                      <Button
                        onClick={() => handleApprove(issue.id, editText)}
                        className="bg-green-600 hover:bg-green-700 flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Edited
                      </Button>
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleApprove(issue.id)}
                        className="bg-green-600 hover:bg-green-700 flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(issue.id)}
                        variant="destructive"
                        className="flex items-center"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
