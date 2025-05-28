
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Star, Phone, Mail, MapPin, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackDetails {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  review_text: string;
  review_rating: number;
  service_type: string;
  issue_location?: string;
  contacted_bank_person?: string;
  sentiment: string;
  status: string;
  detected_issues: string[];
  created_at: string;
}

interface FeedbackDetailsCardProps {
  feedbackId: string;
  onClose?: () => void;
}

const FeedbackDetailsCard: React.FC<FeedbackDetailsCardProps> = ({ feedbackId, onClose }) => {
  const { toast } = useToast();
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  // Fetch feedback details
  const { data: feedback, isLoading, refetch } = useQuery({
    queryKey: ['feedback-details', feedbackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('id', feedbackId)
        .single();

      if (error) throw error;
      return data as FeedbackDetails;
    },
  });

  // Generate resolution recommendation based on detected issues and feedback
  const generateResolutionRecommendation = (feedback: FeedbackDetails): string => {
    const serviceType = feedback.service_type?.toLowerCase();
    const issues = feedback.detected_issues || [];
    const reviewText = feedback.review_text?.toLowerCase();

    console.log('Generating resolution for:', { serviceType, issues, reviewText: reviewText.substring(0, 100) });

    // Check for balance/minimum balance issues
    if (reviewText?.includes('balance') || reviewText?.includes('minimum') || issues.some(issue => issue.toLowerCase().includes('balance'))) {
      return "1. Review account terms and notify customers of changes in advance\n2. Provide clear communication about minimum balance requirements\n3. Offer alternative account types with lower balance requirements\n4. Implement grace period for existing customers\n5. Provide financial counseling to help customers maintain required balances";
    }

    // Check for queue/waiting time issues
    if (reviewText?.includes('queue') || reviewText?.includes('wait') || reviewText?.includes('long') || issues.some(issue => issue.toLowerCase().includes('wait'))) {
      return "1. Implement queue management system during peak hours\n2. Add more service counters if possible\n3. Train staff on efficient customer service\n4. Consider appointment-based services for complex transactions\n5. Provide estimated wait times to customers";
    }

    // Check for staff/service issues
    if (reviewText?.includes('staff') || reviewText?.includes('service') || issues.some(issue => issue.toLowerCase().includes('service'))) {
      return "1. Provide additional customer service training to staff\n2. Review and update service protocols\n3. Implement customer feedback system\n4. Conduct regular staff performance evaluations\n5. Recognize and reward excellent service";
    }

    // Check for specific service types
    if (serviceType?.includes('atm') || issues.some(issue => issue.toLowerCase().includes('atm'))) {
      return "1. Check ATM operational status and error logs\n2. Verify cash availability and card reader functionality\n3. If machine is faulty, place 'Out of Order' sign\n4. Direct customer to nearest working ATM\n5. Follow up with technical team for repair if needed";
    }
    
    if (serviceType?.includes('online') || serviceType?.includes('banking') || issues.some(issue => issue.toLowerCase().includes('online'))) {
      return "1. Verify customer's login credentials and account status\n2. Check for any ongoing system maintenance\n3. Guide customer through browser cache clearing\n4. Suggest trying different browser or device\n5. Escalate to IT support if issue persists";
    }
    
    if (serviceType?.includes('core') || issues.some(issue => issue.toLowerCase().includes('core'))) {
      return "1. Check core banking system status dashboard\n2. Document error details and customer information\n3. Contact technical operations team immediately\n4. Provide estimated resolution time to customer\n5. Follow up with customer once issue is resolved";
    }

    if (issues.some(issue => issue.toLowerCase().includes('accessibility'))) {
      return "1. Conduct accessibility audit of branch facilities\n2. Install ramps and accessible entrances where needed\n3. Provide priority service counters for elderly and disabled customers\n4. Train staff on accessibility assistance protocols\n5. Implement digital alternatives for common transactions";
    }

    // Default recommendation
    return "1. Acknowledge customer concern promptly\n2. Review issue with appropriate department\n3. Document incident for future reference\n4. Follow standard escalation procedures\n5. Provide regular updates to customer on resolution progress";
  };

  const handleSaveResolution = async () => {
    try {
      // Save resolution to a resolutions table or update feedback
      const { error } = await supabase
        .from('feedback')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) throw error;

      refetch();
      toast({
        title: "Resolution Saved",
        description: "Resolution recommendation has been saved and status updated.",
      });
      setIsEditingResolution(false);
    } catch (error) {
      console.error('Error saving resolution:', error);
      toast({
        title: "Error",
        description: "Failed to save resolution. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading feedback details...</span>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="py-8 text-center text-gray-500">
          Feedback not found
        </CardContent>
      </Card>
    );
  }

  const recommendedResolution = generateResolutionRecommendation(feedback);
  console.log('Generated resolution:', recommendedResolution);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Feedback Details</CardTitle>
            <CardDescription>Complete feedback information and detected issues</CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="font-semibold text-lg">{feedback.customer_name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>ID: {feedback.id.slice(-8)}</span>
                <span>•</span>
                <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < feedback.review_rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
              />
            ))}
            <span className="text-sm text-gray-600 ml-2">({feedback.review_rating})</span>
          </div>
        </div>

        {/* Location and Service Info */}
        <div className="flex items-center space-x-4 text-sm">
          {feedback.issue_location && (
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{feedback.issue_location}</span>
            </div>
          )}
          <Badge variant="outline">{feedback.service_type}</Badge>
          <Badge className={`${feedback.sentiment === 'positive' ? 'bg-green-100 text-green-800' : feedback.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
            {feedback.sentiment}
          </Badge>
          <Badge className={`${feedback.status === 'new' ? 'bg-blue-100 text-blue-800' : feedback.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : feedback.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {feedback.status}
          </Badge>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Contact Information</h4>
          <div className="space-y-1 text-sm">
            {feedback.customer_phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{feedback.customer_phone}</span>
              </div>
            )}
            {feedback.customer_email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{feedback.customer_email}</span>
              </div>
            )}
            {feedback.contacted_bank_person && (
              <div className="text-sm">
                <strong>Bank Contact:</strong> {feedback.contacted_bank_person}
              </div>
            )}
          </div>
        </div>

        {/* Review Text */}
        <div>
          <h4 className="font-semibold mb-2">Review Text</h4>
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            {feedback.review_text}
          </div>
        </div>

        {/* Detected Issues */}
        {feedback.detected_issues && feedback.detected_issues.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Detected Issues</h4>
            <div className="flex flex-wrap gap-2">
              {feedback.detected_issues.map((issue, index) => (
                <Badge key={index} variant="secondary">{issue}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Resolution Recommendation - This is the missing section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Recommended Resolution</h4>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                AI Generated
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditingResolution(!isEditingResolution);
                if (!isEditingResolution) {
                  setResolutionText(recommendedResolution);
                }
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>

          {isEditingResolution ? (
            <div className="space-y-3">
              <Textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="min-h-32"
                placeholder="Enter resolution steps..."
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleSaveResolution}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Resolution
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingResolution(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-l-blue-400">
              <div className="text-sm whitespace-pre-line">
                {recommendedResolution}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackDetailsCard;
