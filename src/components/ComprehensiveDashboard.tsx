
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Filter, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Users, Star, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMysqlFeedbackMetrics } from '@/hooks/useMysqlFeedback';
import { useMysqlAnalytics } from '@/hooks/useMysqlAnalytics';
import MySqlSentimentChart from '@/components/charts/MySqlSentimentChart';
import MySqlServiceChart from '@/components/charts/MySqlServiceChart';
import IssuesChart from '@/components/charts/IssuesChart';
import EmployeeStatsChart from '@/components/charts/EmployeeStatsChart';

const ComprehensiveDashboard = () => {
  const [dateRange, setDateRange] = useState('last_month');
  const [serviceType, setServiceType] = useState('all');
  const [location, setLocation] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);

  // Create filters object
  const filters = {
    dateRange,
    service: serviceType,
    location,
    customDateFrom: customDateFrom?.toISOString(),
    customDateTo: customDateTo?.toISOString()
  };

  const { data: overallMetrics, isLoading } = useMysqlFeedbackMetrics(filters);
  
  // Service-specific metrics
  const { data: atmMetrics } = useMysqlFeedbackMetrics({ ...filters, service: 'ATM' });
  const { data: coreBankingMetrics } = useMysqlFeedbackMetrics({ ...filters, service: 'CoreBanking' });
  const { data: onlineBankingMetrics } = useMysqlFeedbackMetrics({ ...filters, service: 'OnlineBanking' });

  // Analytics data
  const {
    sentimentData,
    serviceData,
    locationData,
    ratingData,
    timelineData,
    issuesData,
    employeeData,
    isLoading: analyticsLoading
  } = useMysqlAnalytics(filters);

  const handleExportCSV = () => {
    console.log('Exporting CSV with filters:', filters);
    // TODO: Implement CSV export functionality
  };

  const calculateTrend = (trend: number | undefined) => {
    if (trend === undefined || trend === 0) return '+0.0%';
    return `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
  };

  const getServiceCard = (title: string, data: any, bgColor: string, textColor: string, icon: React.ReactNode) => {
    if (isLoading || !data) {
      return (
        <Card className={`${bgColor} ${textColor}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              {icon}
              <span className="ml-2">{title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">Loading...</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`${bgColor} ${textColor} hover:shadow-lg transition-shadow`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              {icon}
              <span className="ml-2">{title}</span>
            </div>
            <div className="flex items-center text-sm">
              {(data.trend || 0) > 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {calculateTrend(data.trend)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-3xl font-bold">{data.total}</div>
            <p className="text-sm opacity-90">Total Feedback</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>{data.positive} Positive</span>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span>{data.negative} Negative</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/20">
            <div className="text-2xl font-bold flex items-center">
              <Star className="w-5 h-5 mr-1" />
              {data.avgRating.toFixed(1)}
            </div>
            <p className="text-sm opacity-90">Average Rating</p>
          </div>

          <div className="pt-2 border-t border-white/20">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">{data.resolved}</span>
                <p className="opacity-75">Resolved</p>
              </div>
              <div>
                <span className="font-medium">{data.pending}</span>
                <p className="opacity-75">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Key Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">VoC Analytics Dashboard</h2>
            <p className="text-blue-100">Comprehensive Customer Feedback Analysis</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{overallMetrics?.total || 0}</div>
              <div className="text-sm text-blue-100">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{overallMetrics?.avgRating?.toFixed(1) || '0.0'}</div>
              <div className="text-sm text-blue-100">Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {overallMetrics ? Math.round((overallMetrics.positive / (overallMetrics.total || 1)) * 100) : 0}%
              </div>
              <div className="text-sm text-blue-100">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analytics Filters</CardTitle>
              <CardDescription>Filter data to focus on specific segments and time periods</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button onClick={handleExportCSV} className="flex items-center bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">From Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customDateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateFrom ? format(customDateFrom, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customDateFrom}
                          onSelect={setCustomDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">To Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !customDateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateTo ? format(customDateTo, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customDateTo}
                          onSelect={setCustomDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Service Type</label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="ATM">ATM</SelectItem>
                    <SelectItem value="OnlineBanking">Online Banking</SelectItem>
                    <SelectItem value="CoreBanking">Core Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                    <SelectItem value="Selangor">Selangor</SelectItem>
                    <SelectItem value="Penang">Penang</SelectItem>
                    <SelectItem value="Johor Bahru">Johor Bahru</SelectItem>
                    <SelectItem value="Melaka">Melaka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Service-specific Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getServiceCard(
          "Overall",
          overallMetrics,
          "bg-gradient-to-r from-blue-600 to-blue-700",
          "text-white",
          <Target className="w-6 h-6" />
        )}
        {getServiceCard(
          "ATM",
          atmMetrics,
          "bg-gradient-to-r from-red-500 to-red-600",
          "text-white",
          <AlertTriangle className="w-6 h-6" />
        )}
        {getServiceCard(
          "Core Banking",
          coreBankingMetrics,
          "bg-gradient-to-r from-green-500 to-green-600",
          "text-white",
          <CheckCircle className="w-6 h-6" />
        )}
        {getServiceCard(
          "Online Banking",
          onlineBankingMetrics,
          "bg-gradient-to-r from-purple-500 to-purple-600",
          "text-white",
          <Users className="w-6 h-6" />
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Sentiment */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Sentiment Distribution</CardTitle>
            <CardDescription>Customer sentiment breakdown across all feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center">Loading...</div>
            ) : (
              <MySqlSentimentChart filters={filters} />
            )}
          </CardContent>
        </Card>

        {/* Service-wise Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Service-wise Sentiment</CardTitle>
            <CardDescription>Sentiment breakdown by service type</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center">Loading...</div>
            ) : (
              <MySqlServiceChart filters={filters} />
            )}
          </CardContent>
        </Card>

        {/* Top Issues */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Issues by Frequency</CardTitle>
            <CardDescription>Most common issues across all services with detailed statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center">Loading...</div>
            ) : (
              <IssuesChart />
            )}
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employee Performance Analytics</CardTitle>
            <CardDescription>Bank employee statistics and feedback handling performance</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center">Loading...</div>
            ) : (
              <EmployeeStatsChart filters={filters} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComprehensiveDashboard;
