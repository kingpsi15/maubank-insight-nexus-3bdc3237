
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComprehensiveDashboard from '@/components/ComprehensiveDashboard';
import FeedbackManagement from '@/components/FeedbackManagement';
import IssueEndorsement from '@/components/IssueEndorsement';
import BankEmployeeAnalytics from '@/components/BankEmployeeAnalytics';
import DatabaseInitializer from '@/components/DatabaseInitializer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MessageSquare, Users, CheckCircle, Database, Settings } from 'lucide-react';
import { useMysqlFeedbackMetrics } from '@/hooks/useMysqlFeedback';
import { Button } from "@/components/ui/button";

const ComprehensiveIndex = () => {
  const [showDbInit, setShowDbInit] = useState(false);
  
  // Get real metrics from MySQL database
  const { data: overallMetrics, isLoading } = useMysqlFeedbackMetrics({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Mau Bank VoC Analysis System</h1>
              <p className="text-gray-600 mt-2 text-lg">Customer Feedback Intelligence & Resolution Platform - Malaysia</p>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <span>• Real-time Analytics</span>
                <span>• Issue Detection & Resolution</span>
                <span>• Employee Performance Tracking</span>
                <span>• Comprehensive Reporting</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowDbInit(!showDbInit)}
                className="flex items-center"
              >
                <Database className="w-4 h-4 mr-2" />
                Database Setup
              </Button>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg">
                <span className="text-sm font-medium">Enterprise Dashboard v2.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Initialization Section */}
      {showDbInit && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <DatabaseInitializer />
        </div>
      )}

      {/* Enhanced Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="w-6 h-6 mr-3" />
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "Loading..." : overallMetrics?.total || 0}
              </div>
              <p className="text-green-100 text-sm mt-1">From MySQL Database</p>
              <div className="mt-2 text-xs">
                <span className="bg-green-400/20 px-2 py-1 rounded">Live Data</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="w-6 h-6 mr-3" />
                Avg Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "Loading..." : overallMetrics?.avgRating?.toFixed(2) || "0.00"}
              </div>
              <p className="text-blue-100 text-sm mt-1">Current average (0-5 scale)</p>
              <div className="mt-2 text-xs">
                <span className="bg-blue-400/20 px-2 py-1 rounded">
                  {isLoading ? "..." : `${Math.round((overallMetrics?.positive || 0) / (overallMetrics?.total || 1) * 100)}% positive`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="w-6 h-6 mr-3" />
                Resolved Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "Loading..." : overallMetrics?.resolved || 0}
              </div>
              <p className="text-purple-100 text-sm mt-1">
                {isLoading ? "Loading..." : `${Math.round((overallMetrics?.resolved || 0) / (overallMetrics?.total || 1) * 100)}% resolution rate`}
              </p>
              <div className="mt-2 text-xs">
                <span className="bg-purple-400/20 px-2 py-1 rounded">Active Tracking</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Users className="w-6 h-6 mr-3" />
                Customer Satisfaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "Loading..." : `${Math.round((overallMetrics?.positive || 0) / (overallMetrics?.total || 1) * 100)}%`}
              </div>
              <p className="text-orange-100 text-sm mt-1">
                {isLoading ? "Loading..." : `${overallMetrics?.positive || 0} positive reviews`}
              </p>
              <div className="mt-2 text-xs">
                <span className="bg-orange-400/20 px-2 py-1 rounded">Real-time Monitoring</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs with Enhanced Navigation */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg rounded-lg p-2">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all duration-200 font-medium"
            >
              📊 Analytics Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="feedback" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all duration-200 font-medium"
            >
              💬 Feedback Management
            </TabsTrigger>
            <TabsTrigger 
              value="issues" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all duration-200 font-medium"
            >
              🎯 Issue Endorsement
            </TabsTrigger>
            <TabsTrigger 
              value="employees" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all duration-200 font-medium"
            >
              👥 Employee Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-8">
            <ComprehensiveDashboard />
          </TabsContent>

          <TabsContent value="feedback" className="mt-8">
            <FeedbackManagement />
          </TabsContent>

          <TabsContent value="issues" className="mt-8">
            <IssueEndorsement />
          </TabsContent>

          <TabsContent value="employees" className="mt-8">
            <BankEmployeeAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComprehensiveIndex;
