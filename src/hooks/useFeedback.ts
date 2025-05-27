
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackService, Feedback } from '@/services';
import { useToast } from '@/hooks/use-toast';

export const useFeedback = (filters: any = {}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: feedback = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['feedback', filters],
    queryFn: () => feedbackService.getAll(filters),
    staleTime: 0,
    gcTime: 0, // Don't cache results to ensure fresh data
  });

  const invalidateAllFeedbackQueries = () => {
    console.log('Invalidating all feedback-related queries');
    // Invalidate all feedback queries regardless of filters
    queryClient.invalidateQueries({ queryKey: ['feedback'] });
    queryClient.invalidateQueries({ queryKey: ['feedback-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    
    // Remove all cached data to force fresh fetches
    queryClient.removeQueries({ queryKey: ['feedback'] });
    queryClient.removeQueries({ queryKey: ['feedback-metrics'] });
    queryClient.removeQueries({ queryKey: ['analytics'] });
  };

  const createFeedbackMutation = useMutation({
    mutationFn: feedbackService.create,
    onSuccess: (data) => {
      console.log('Feedback created successfully:', data.id);
      invalidateAllFeedbackQueries();
      toast({
        title: "Success",
        description: "Feedback created successfully",
      });
    },
    onError: (error: any) => {
      console.error('Create feedback error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create feedback",
        variant: "destructive",
      });
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Feedback> }) =>
      feedbackService.update(id, updates),
    onSuccess: (data) => {
      console.log('Feedback updated successfully:', data.id);
      invalidateAllFeedbackQueries();
      toast({
        title: "Success",
        description: "Feedback updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Update feedback error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: feedbackService.delete,
    onSuccess: () => {
      console.log('Feedback deleted successfully');
      invalidateAllFeedbackQueries();
      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('Delete feedback error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback",
        variant: "destructive",
      });
    },
  });

  return {
    feedback,
    isLoading,
    error,
    createFeedback: createFeedbackMutation.mutate,
    updateFeedback: updateFeedbackMutation.mutate,
    deleteFeedback: deleteFeedbackMutation.mutate,
    isCreating: createFeedbackMutation.isPending,
    isUpdating: updateFeedbackMutation.isPending,
    isDeleting: deleteFeedbackMutation.isPending,
  };
};

export const useFeedbackMetrics = (filters: any = {}) => {
  return useQuery({
    queryKey: ['feedback-metrics', filters],
    queryFn: () => {
      console.log('Fetching metrics with filters:', filters);
      return feedbackService.getMetrics(filters);
    },
    staleTime: 0,
    gcTime: 0, // Don't cache to ensure fresh data
  });
};
