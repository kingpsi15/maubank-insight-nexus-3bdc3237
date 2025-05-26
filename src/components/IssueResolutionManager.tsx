
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Edit, Plus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface PendingIssue {
  id: string;
  feedbackId: string;
  customerName: string;
  serviceType: string;
  detectedIssue: string;
  confidence: number;
  suggestedResolution: string;
  reviewText: string;
  location: string;
  date: string;
}

interface ExistingIssue {
  id: string;
  title: string;
  category: string;
  description: string;
}

const IssueResolutionManager = () => {
  const { toast } = useToast();
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editingResolution, setEditingResolution] = useState<string | null>(null);
  const [editedIssueText, setEditedIssueText] = useState('');
  const [editedResolutionText, setEditedResolutionText] = useState('');
  const [selectedExistingIssue, setSelectedExistingIssue] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<PendingIssue | null>(null);

  // Mock data for existing issues
  const existingIssues: ExistingIssue[] = [
    { id: 'EI001', title: 'ATM Card Stuck', category: 'ATM', description: 'Card gets stuck in ATM machine' },
    { id: 'EI002', title: 'Login Authentication Failure', category: 'OnlineBanking', description: 'Users unable to login with correct credentials' },
    { id: 'EI003', title: 'Transaction Processing Delay', category: 'CoreBanking', description: 'Delays in processing bank transfers' },
    { id: 'EI004', title: 'Cash Dispensing Error', category: 'ATM', description: 'ATM fails to dispense correct amount' },
    { id: 'EI005', title: 'Mobile App Crash', category: 'OnlineBanking', description: 'Application crashes during transactions' }
  ];

  // Mock data for pending issues
  const pendingIssues: PendingIssue[] = [
    {
      id: 'PI001',
      feedbackId: 'F001',
      customerName: 'Ahmad bin Abdullah',
      serviceType: 'ATM',
      detectedIssue: 'ATM card tersekat dalam mesin',
      confidence: 0.95,
      suggestedResolution: 'Contact customer to verify card status and arrange replacement. Check ATM maintenance log for mechanical issues.',
      reviewText: 'Kad saya tersekat dalam ATM di cawangan Kuala Lumpur. Mesin hanya mengambil kad saya dan saya tidak dapat mengambilnya semula.',
      location: 'Kuala Lumpur',
      date: '2025-05-25'
    },
    {
      id: 'PI002',
      feedbackId: 'F002',
      customerName: 'Siti Aminah',
      serviceType: 'OnlineBanking',
      detectedIssue: 'Kegagalan pengesahan log masuk',
      confidence: 0.87,
      suggestedResolution: 'Reset customer password and verify security questions. Provide two-factor authentication setup guidance.',
      reviewText: 'Saya tidak dapat log masuk ke akaun perbankan dalam talian saya. Sistem mengatakan kata laluan tidak sah walaupun saya pasti kata laluan saya betul.',
      location: 'Selangor',
      date: '2025-05-24'
    },
    {
      id: 'PI003',
      feedbackId: 'F003',
      customerName: 'Raj Kumar',
      serviceType: 'CoreBanking',
      detectedIssue: 'Kelewatan pemprosesan transaksi',
      confidence: 0.78,
      suggestedResolution: 'Investigate transaction processing queue and check for system delays. Provide transaction status update to customer.',
      reviewText: 'Transfer saya ke bank lain telah tertangguh selama 3 hari. Wang telah didebitkan dari akaun saya tetapi tidak dikreditkan kepada penerima.',
      location: 'Johor',
      date: '2025-05-23'
    }
  ];

  const handleAcceptAsNew = (issue: PendingIssue) => {
    console.log('Accepting as new issue:', issue);
    toast({
      title: "New Issue Created",
      description: `"${issue.detectedIssue}" has been added to the master issues list.`,
    });
  };

  const handleMapToExisting = (issue: PendingIssue) => {
    setCurrentIssue(issue);
    setIsDialogOpen(true);
  };

  const handleConfirmMapping = () => {
    if (selectedExistingIssue && currentIssue) {
      const existingIssue = existingIssues.find(ei => ei.id === selectedExistingIssue);
      console.log('Mapping to existing issue:', existingIssue);
      toast({
        title: "Issue Mapped",
        description: `Feedback mapped to existing issue: "${existingIssue?.title}"`,
      });
      setIsDialogOpen(false);
      setSelectedExistingIssue('');
      setCurrentIssue(null);
    }
  };

  const handleReject = (issueId: string) => {
    console.log('Rejecting issue:', issueId);
    toast({
      title: "Issue Rejected",
      description: "The issue has been rejected and archived.",
      variant: "destructive"
    });
  };

  const startEditIssue = (issueId: string, currentText: string) => {
    setEditingIssue(issueId);
    setEditedIssueText(currentText);
  };

  const startEditResolution = (issueId: string, currentText: string) => {
    setEditingResolution(issueId);
    setEditedResolutionText(currentText);
  };

  const saveIssueEdit = (issueId: string) => {
    console.log('Saving edited issue:', issueId, editedIssueText);
    toast({
      title: "Issue Updated",
      description: "The issue description has been updated.",
    });
    setEditingIssue(null);
    setEditedIssueText('');
  };

  const saveResolutionEdit = (issueId: string) => {
    console.log('Saving edited resolution:', issueId, editedResolutionText);
    toast({
      title: "Resolution Updated",
      description: "The resolution has been updated.",
    });
    setEditingResolution(null);
    setEditedResolutionText('');
  };

  const cancelEdit = () => {
    setEditingIssue(null);
    setEditingResolution(null);
    setEditedIssueText('');
    setEditedResolutionText('');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-4">
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
                    <div className="space-y-2">
                      <Textarea
                        value={editedIssueText}
                        onChange={(e) => setEditedIssueText(e.target.value)}
                        className="mt-2"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => saveIssueEdit(issue.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{issue.detectedIssue}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditIssue(issue.id, issue.detectedIssue)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  <strong>Customer:</strong> {issue.customerName} | <strong>Date:</strong> {issue.date}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Original Feedback:</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{issue.reviewText}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Suggested Resolution:</h4>
              {editingResolution === issue.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedResolutionText}
                    onChange={(e) => setEditedResolutionText(e.target.value)}
                    className="bg-blue-50 border-l-4 border-l-blue-400"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => saveResolutionEdit(issue.id)}>
                      Save Resolution
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-sm bg-blue-50 p-3 rounded border-l-4 border-l-blue-400">
                    {issue.suggestedResolution}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => startEditResolution(issue.id, issue.suggestedResolution)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                onClick={() => handleAcceptAsNew(issue)}
                className="bg-green-600 hover:bg-green-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Accept as New Issue
              </Button>
              
              <Button
                onClick={() => handleMapToExisting(issue)}
                variant="outline"
                className="flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Map to Existing Issue
              </Button>
              
              <Button
                onClick={() => handleReject(issue.id)}
                variant="destructive"
                className="flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map to Existing Issue</DialogTitle>
            <DialogDescription>
              Select an existing issue to map this feedback to:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Select value={selectedExistingIssue} onValueChange={setSelectedExistingIssue}>
              <SelectTrigger>
                <SelectValue placeholder="Select an existing issue" />
              </SelectTrigger>
              <SelectContent>
                {existingIssues.map((issue) => (
                  <SelectItem key={issue.id} value={issue.id}>
                    <div>
                      <div className="font-medium">{issue.title}</div>
                      <div className="text-sm text-gray-500">{issue.category} - {issue.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmMapping}
              disabled={!selectedExistingIssue}
            >
              Confirm Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IssueResolutionManager;
