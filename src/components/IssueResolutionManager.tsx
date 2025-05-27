import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Edit, Plus, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/contexts/AuthContext";

interface PendingIssueWithResolution {
  id: string;
  title: string;
  description: string;
  category: string;
  confidence_score: number;
  feedback_count: number;
  detected_from_feedback_id: string;
  created_at: string;
  pending_resolutions: {
    id: string;
    resolution_text: string;
    confidence_score: number;
  }[];
  feedback?: {
    customer_name: string;
    review_text: string;
    issue_location: string;
  };
}

interface ExistingIssue {
  id: string;
  title: string;
  category: string;
  description: string;
  feedback_count: number;
}

const IssueResolutionManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editingResolution, setEditingResolution] = useState<string | null>(null);
  const [editedIssueText, setEditedIssueText] = useState('');
  const [editedResolutionText, setEditedResolutionText] = useState('');
  const [selectedExistingIssue, setSelectedExistingIssue] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<PendingIssueWithResolution | null>(null);

  // Fetch pending issues from database
  const { data: pendingIssues = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_issues')
        .select(`
          *,
          pending_resolutions (
            id,
            resolution_text,
            confidence_score
          ),
          feedback:detected_from_feedback_id (
            customer_name,
            review_text,
            issue_location
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingIssueWithResolution[];
    },
  });

  // Fetch existing approved issues
  const { data: existingIssues = [] } = useQuery({
    queryKey: ['existing-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('id, title, category, description, feedback_count')
        .eq('status', 'approved');

      if (error) throw error;
      return data as ExistingIssue[];
    },
  });

  const handleAcceptAsNew = async (issue: PendingIssueWithResolution) => {
    try {
      const resolution = issue.pending_resolutions?.[0]?.resolution_text || 'Manual review required for appropriate resolution.';
      
      // Create new approved issue
      const { error: issueError } = await supabase
        .from('issues')
        .insert({
          title: issue.title,
          description: issue.description,
          category: issue.category,
          resolution: resolution,
          status: 'approved',
          confidence_score: issue.confidence_score,
          feedback_count: issue.feedback_count,
          approved_by: user?.name || 'System',
          approved_date: new Date().toISOString()
        });

      if (issueError) throw issueError;

      // Delete pending issue and its resolutions
      await supabase.from('pending_issues').delete().eq('id', issue.id);
      
      refetch();
      toast({
        title: "New Issue Created",
        description: `"${issue.title}" has been added to the master issues list.`,
      });
    } catch (error) {
      console.error('Error accepting issue:', error);
      toast({
        title: "Error",
        description: "Failed to accept issue. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMapToExisting = (issue: PendingIssueWithResolution) => {
    setCurrentIssue(issue);
    setIsDialogOpen(true);
  };

  const handleConfirmMapping = async () => {
    if (selectedExistingIssue && currentIssue) {
      try {
        const existingIssue = existingIssues.find(ei => ei.id === selectedExistingIssue);
        
        // Update existing issue feedback count by incrementing it
        const newFeedbackCount = (existingIssue?.feedback_count || 0) + 1;
        const { error: updateError } = await supabase
          .from('issues')
          .update({ 
            feedback_count: newFeedbackCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedExistingIssue);

        if (updateError) throw updateError;

        // Delete pending issue
        await supabase.from('pending_issues').delete().eq('id', currentIssue.id);
        
        refetch();
        toast({
          title: "Issue Mapped",
          description: `Feedback mapped to existing issue: "${existingIssue?.title}"`,
        });
        setIsDialogOpen(false);
        setSelectedExistingIssue('');
        setCurrentIssue(null);
      } catch (error) {
        console.error('Error mapping issue:', error);
        toast({
          title: "Error",
          description: "Failed to map issue. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleReject = async (issueId: string, issue: PendingIssueWithResolution) => {
    try {
      // Move to rejected issues table
      const { error: rejectError } = await supabase
        .from('rejected_issues')
        .insert({
          original_title: issue.title,
          original_description: issue.description,
          category: issue.category,
          rejection_reason: 'Manually rejected by reviewer',
          rejected_by: user?.name || 'System',
          original_pending_issue_id: issueId
        });

      if (rejectError) throw rejectError;

      // Delete pending issue
      await supabase.from('pending_issues').delete().eq('id', issueId);
      
      refetch();
      toast({
        title: "Issue Rejected",
        description: "The issue has been rejected and archived.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error rejecting issue:', error);
      toast({
        title: "Error",
        description: "Failed to reject issue. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEditIssue = (issueId: string, currentText: string) => {
    setEditingIssue(issueId);
    setEditedIssueText(currentText);
  };

  const startEditResolution = (issueId: string, currentText: string) => {
    setEditingResolution(issueId);
    setEditedResolutionText(currentText);
  };

  const saveIssueEdit = async (issueId: string) => {
    try {
      const { error } = await supabase
        .from('pending_issues')
        .update({ title: editedIssueText, updated_at: new Date().toISOString() })
        .eq('id', issueId);

      if (error) throw error;

      refetch();
      toast({
        title: "Issue Updated",
        description: "The issue description has been updated.",
      });
      setEditingIssue(null);
      setEditedIssueText('');
    } catch (error) {
      console.error('Error updating issue:', error);
      toast({
        title: "Error",
        description: "Failed to update issue. Please try again.",
        variant: "destructive"
      });
    }
  };

  const saveResolutionEdit = async (issueId: string) => {
    try {
      const issue = pendingIssues.find(i => i.id === issueId);
      const resolutionId = issue?.pending_resolutions?.[0]?.id;

      if (resolutionId) {
        const { error } = await supabase
          .from('pending_resolutions')
          .update({ resolution_text: editedResolutionText })
          .eq('id', resolutionId);

        if (error) throw error;
      }

      refetch();
      toast({
        title: "Resolution Updated",
        description: "The resolution has been updated.",
      });
      setEditingResolution(null);
      setEditedResolutionText('');
    } catch (error) {
      console.error('Error updating resolution:', error);
      toast({
        title: "Error",
        description: "Failed to update resolution. Please try again.",
        variant: "destructive"
      });
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading pending issues...</span>
      </div>
    );
  }

  if (pendingIssues.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No pending issues to review</p>
            <p className="text-sm">Issues will appear here when detected from customer feedback</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingIssues.map((issue) => (
        <Card key={issue.id} className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline">{issue.category}</Badge>
                  <Badge className={getConfidenceColor(issue.confidence_score || 0)}>
                    {Math.round((issue.confidence_score || 0) * 100)}% confidence
                  </Badge>
                  <Badge variant="secondary">
                    {issue.feedback_count} feedback{issue.feedback_count !== 1 ? 's' : ''}
                  </Badge>
                  {issue.feedback?.issue_location && (
                    <Badge variant="secondary">{issue.feedback.issue_location}</Badge>
                  )}
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
                      <span>{issue.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditIssue(issue.id, issue.title)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  {issue.feedback && (
                    <>
                      <strong>Customer:</strong> {issue.feedback.customer_name} | 
                      <strong> Detected:</strong> {new Date(issue.created_at).toLocaleDateString()}
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {issue.feedback?.review_text && (
              <div>
                <h4 className="font-semibold mb-2">Original Feedback:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{issue.feedback.review_text}</p>
              </div>
            )}

            {issue.pending_resolutions?.[0] && (
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
                      {issue.pending_resolutions[0].resolution_text}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => startEditResolution(issue.id, issue.pending_resolutions[0].resolution_text)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

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
                onClick={() => handleReject(issue.id, issue)}
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
