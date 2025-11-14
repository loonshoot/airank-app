'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { gql } from '@apollo/client';
import { executeQuery } from '@/graphql/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Sector,
  Legend,
  Tooltip
} from 'recharts';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format, subDays, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// GraphQL query for workspace configuration
const GET_WORKSPACE_CONFIG = gql`
  query GetWorkspaceConfig($workspaceId: String!) {
    brands(workspaceId: $workspaceId) {
      _id
    }
    models(workspaceId: $workspaceId) {
      _id
      isEnabled
    }
    prompts(workspaceId: $workspaceId) {
      _id
    }
  }
`;

// GraphQL query for analytics data
const GET_ANALYTICS = gql`
  query GetAnalytics($workspaceId: String!, $startDate: String, $endDate: String) {
    analytics(workspaceId: $workspaceId, startDate: $startDate, endDate: $endDate) {
      summary {
        totalResults
        resultsWithSentiment
        dateRange {
          start
          end
        }
        ownBrandMentionPercentage
        exclusivityRate
      }
      dailyMentions {
        date
        brands {
          brandName
          brandType
          mentionCount
        }
      }
      brandSentiments {
        brandName
        brandType
        positive
        negative
        notDetermined
        total
        positivePercentage
      }
      shareOfVoice {
        brandName
        brandType
        mentionCount
        percentage
      }
      mentionsByModel {
        modelName
        ownBrandMentions
        competitorMentions
        totalMentions
        ownBrandPercentage
      }
      ownBrandPromptPerformance {
        prompt
        winCount
        percentage
      }
      competitorPromptPerformance {
        prompt
        winCount
        percentage
      }
      coMentionAnalysis {
        brandName
        coMentions {
          brandName
          count
          percentage
        }
      }
      brandPositionAnalysis {
        brandName
        brandType
        averagePosition
        firstMentions
        totalMentions
      }
      sentimentTrend {
        date
        positive
        negative
        neutral
        positivePercentage
      }
      competitiveBreakdown {
        brandName
        brandType
        sentimentGap
        averagePosition
        positivePercentage
        mentionCount
      }
    }
  }
`;

// Mock data for sample dashboard (used when no configuration exists)
const MOCK_ANALYTICS_DATA = {
  summary: {
    totalResults: 1250,
    resultsWithSentiment: 845,
    dateRange: {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    ownBrandMentionPercentage: 42.5,
    exclusivityRate: 28.5
  },
  dailyMentions: Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
    brands: [
      { brandName: 'Your Brand', brandType: 'own', mentionCount: Math.floor(Math.random() * 15) + 10 },
      { brandName: 'Competitor A', brandType: 'competitor', mentionCount: Math.floor(Math.random() * 12) + 8 },
      { brandName: 'Competitor B', brandType: 'competitor', mentionCount: Math.floor(Math.random() * 10) + 5 },
      { brandName: 'Competitor C', brandType: 'competitor', mentionCount: Math.floor(Math.random() * 8) + 3 }
    ]
  })),
  brandSentiments: [
    { brandName: 'Your Brand', brandType: 'own', positive: 285, negative: 42, notDetermined: 58, total: 385, positivePercentage: 74.0 },
    { brandName: 'Competitor A', brandType: 'competitor', positive: 180, negative: 65, notDetermined: 45, total: 290, positivePercentage: 62.1 },
    { brandName: 'Competitor B', brandType: 'competitor', positive: 145, negative: 38, notDetermined: 27, total: 210, positivePercentage: 69.0 },
    { brandName: 'Competitor C', brandType: 'competitor', positive: 95, negative: 22, notDetermined: 18, total: 135, positivePercentage: 70.4 }
  ],
  shareOfVoice: [
    { brandName: 'Your Brand', brandType: 'own', mentionCount: 385, percentage: 42.5 },
    { brandName: 'Competitor A', brandType: 'competitor', mentionCount: 290, percentage: 32.0 },
    { brandName: 'Competitor B', brandType: 'competitor', mentionCount: 210, percentage: 23.2 },
    { brandName: 'Competitor C', brandType: 'competitor', mentionCount: 20, percentage: 2.2 }
  ],
  mentionsByModel: [
    { modelName: 'GPT-4o', ownBrandMentions: 145, competitorMentions: 180, totalMentions: 325, ownBrandPercentage: 44.6 },
    { modelName: 'Claude 3.5 Sonnet', ownBrandMentions: 132, competitorMentions: 153, totalMentions: 285, ownBrandPercentage: 46.3 },
    { modelName: 'Gemini 2.5 Pro', ownBrandMentions: 108, competitorMentions: 127, totalMentions: 235, ownBrandPercentage: 46.0 }
  ],
  ownBrandPromptPerformance: [
    { prompt: 'Best AI tools for marketing', winCount: 145, percentage: 65.0 },
    { prompt: 'Top software solutions', winCount: 128, percentage: 58.2 },
    { prompt: 'Leading tech platforms', winCount: 112, percentage: 52.3 }
  ],
  competitorPromptPerformance: [
    { prompt: 'Best AI tools for marketing', winCount: 78, percentage: 35.0 },
    { prompt: 'Top software solutions', winCount: 92, percentage: 41.8 },
    { prompt: 'Leading tech platforms', winCount: 102, percentage: 47.7 }
  ],
  coMentionAnalysis: [
    {
      brandName: 'Your Brand',
      coMentions: [
        { brandName: 'Competitor A', count: 245, percentage: 63.6 },
        { brandName: 'Competitor B', count: 178, percentage: 46.2 },
        { brandName: 'Competitor C', count: 12, percentage: 3.1 }
      ]
    }
  ],
  brandPositionAnalysis: [
    { brandName: 'Your Brand', brandType: 'own', averagePosition: 2.3, firstMentions: 142, totalMentions: 385 },
    { brandName: 'Competitor A', brandType: 'competitor', averagePosition: 1.8, firstMentions: 165, totalMentions: 290 },
    { brandName: 'Competitor B', brandType: 'competitor', averagePosition: 2.9, firstMentions: 58, totalMentions: 210 },
    { brandName: 'Competitor C', brandType: 'competitor', averagePosition: 3.5, firstMentions: 4, totalMentions: 20 }
  ],
  sentimentTrend: Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
    positive: Math.floor(Math.random() * 15) + 8,
    negative: Math.floor(Math.random() * 3) + 1,
    neutral: Math.floor(Math.random() * 5) + 2,
    positivePercentage: (Math.random() * 15 + 65).toFixed(1)
  })),
  competitiveBreakdown: [
    { brandName: 'Your Brand', brandType: 'own', sentimentGap: 0, averagePosition: 2.3, positivePercentage: 74.0, mentionCount: 385 },
    { brandName: 'Competitor A', brandType: 'competitor', sentimentGap: -11.9, averagePosition: 1.8, positivePercentage: 62.1, mentionCount: 290 },
    { brandName: 'Competitor B', brandType: 'competitor', sentimentGap: -5.0, averagePosition: 2.9, positivePercentage: 69.0, mentionCount: 210 },
    { brandName: 'Competitor C', brandType: 'competitor', sentimentGap: -3.6, averagePosition: 3.5, positivePercentage: 70.4, mentionCount: 20 }
  ]
};

// Chart configuration with vibrant neon colors
const chartConfig = {
  ownBrand: {
    label: "Own Brand",
    color: "#22d35f", // Neon green
  },
  competitor: {
    label: "Competitor",
    color: "#ff0099", // Hot magenta
  },
  positive: {
    label: "Positive",
    color: "#22d35f", // Neon green
  },
  negative: {
    label: "Negative",
    color: "#ff0099", // Hot magenta
  },
  notDetermined: {
    label: "Neutral",
    color: "#6b7280", // Gray for neutral
  }
};

const brandColors = [
  "#22d35f", // Neon green
  "#00d9ff", // Electric cyan
  "#ff0099", // Hot magenta
  "#a6ff00", // Laser lime
  "#9945ff", // Plasma purple
  "#ff6b35", // Solar orange
  "#ffeb3b", // Volt yellow
];


export default function WorkspacePage({ params }) {
  const resolvedParams = use(params);
  const workspaceSlug = resolvedParams?.workspaceSlug || '';
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();

  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 1), 'yyyy-MM-dd')
  });
  const [dynamicChartConfig, setDynamicChartConfig] = useState(chartConfig);
  const [activeIndex, setActiveIndex] = useState(0);
  const [workspaceConfig, setWorkspaceConfig] = useState({
    hasBrands: false,
    hasModels: false,
    hasPrompts: false,
    hasData: false
  });
  const [hiddenLines, setHiddenLines] = useState(new Set());
  const [hiddenSentiments, setHiddenSentiments] = useState(new Set());

  // Check workspace configuration
  useEffect(() => {
    const checkConfig = async () => {
      if (!workspace?._id) return;

      try {
        const result = await executeQuery(
          graphqlClient,
          GET_WORKSPACE_CONFIG,
          { workspaceId: workspace._id }
        );

        if (result.data) {
          const hasBrands = result.data.brands?.length > 0;
          const hasModels = result.data.models?.some(m => m.isEnabled);
          const hasPrompts = result.data.prompts?.length > 0;

          setWorkspaceConfig({
            hasBrands,
            hasModels,
            hasPrompts,
            hasData: false // Will be set when analytics loads
          });
        }
      } catch (err) {
        console.error('Error checking workspace config:', err);
      }
    };

    checkConfig();
  }, [workspace?._id, graphqlClient]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!workspace?._id) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await executeQuery(
          graphqlClient,
          GET_ANALYTICS,
          {
            workspaceId: workspace._id,
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        );

        if (result.data?.analytics) {
          setAnalyticsData(result.data.analytics);
          setWorkspaceConfig(prev => ({ ...prev, hasData: result.data.analytics.summary.totalResults > 0 }));

          console.log('analyticsData', result.data.analytics);
          console.log('mentionsByModel', result.data.analytics.mentionsByModel);
          console.log('ownBrandPromptPerformance', result.data.analytics.ownBrandPromptPerformance);
          console.log('competitorPromptPerformance', result.data.analytics.competitorPromptPerformance);

          // Dynamically generate chart config for brands
          const newChartConfig = { ...chartConfig };
          const brands = [
            ...new Set(
              result.data.analytics.dailyMentions.flatMap(day =>
                day.brands.map(b => b.brandName)
              )
            )
          ];

          brands.forEach((brandName, index) => {
            if (!newChartConfig[brandName]) {
              newChartConfig[brandName] = {
                label: brandName,
                color: brandColors[index % brandColors.length],
              };
            }
          });
          setDynamicChartConfig(newChartConfig);

        } else if (result.error) {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [workspace?._id, graphqlClient, dateRange]);

  const setDate = (newDateRange) => {
    setDateRange({
      start: format(newDateRange.start, 'yyyy-MM-dd'),
      end: format(newDateRange.end, 'yyyy-MM-dd'),
    });
  };

  const handleQuickRange = (range) => {
    const today = new Date();
    let start, end;

    switch (range) {
      case '30d':
        start = subDays(today, 30);
        end = today;
        break;
      case 'last_month':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case '3_months':
        start = subMonths(today, 3);
        end = today;
        break;
      default:
        return;
    }

    setDate({ start, end });
  };

  const prepareAreaChartData = () => {
    if (!analyticsData?.dailyMentions) return [];

    const brands = [
      ...new Set(analyticsData.dailyMentions.flatMap(day => day.brands.map(b => b.brandName)))
    ];

    const dailyData = new Map();

    analyticsData.dailyMentions.forEach(day => {
      const dataPoint = { date: day.date };
      brands.forEach(brand => {
        dataPoint[brand] = 0;
      });
      day.brands.forEach(brand => {
        dataPoint[brand.brandName] = brand.mentionCount;
      });
      dailyData.set(day.date, dataPoint);
    });

    return Array.from(dailyData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const preparePieChartData = () => {
    if (!analyticsData?.shareOfVoice) return [];

    return analyticsData.shareOfVoice.map(item => ({
      name: item.brandName,
      value: item.mentionCount,
      percentage: item.percentage,
      fill: chartConfig[item.brandName]?.color || "#8884d8"
    }));
  };

  const prepareSentimentData = () => {
    if (!analyticsData?.brandSentiments) return [];

    return analyticsData.brandSentiments.map(brand => ({
      brand: brand.brandName,
      positive: brand.positive,
      negative: brand.negative,
      notDetermined: brand.notDetermined,
    }));
  };

  const preparePromptPerformanceData = () => {
    if (!analyticsData?.ownBrandPromptPerformance && !analyticsData?.competitorPromptPerformance) return [];

    const promptMap = new Map();

    analyticsData.ownBrandPromptPerformance?.forEach(p => {
      if (!promptMap.has(p.prompt)) {
        promptMap.set(p.prompt, { prompt: p.prompt, ownBrand: 0, competitor: 0 });
      }
      promptMap.get(p.prompt).ownBrand = Number(p.winCount);
    });

    analyticsData.competitorPromptPerformance?.forEach(p => {
      if (!promptMap.has(p.prompt)) {
        promptMap.set(p.prompt, { prompt: p.prompt, ownBrand: 0, competitor: 0 });
      }
      promptMap.get(p.prompt).competitor = Number(p.winCount);
    });

    const combinedData = Array.from(promptMap.values());
    combinedData.sort((a, b) => (b.ownBrand + b.competitor) - (a.ownBrand + a.competitor));
    
    return combinedData.slice(0, 10);
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  if (isLoading) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Analytics`} />
        <Content.Title
          title="Analytics Dashboard"
          subtitle="Brand mentions and sentiment analysis"
        />
        <Content.Divider />
        <Content.Container>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (error) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Analytics`} />
        <Content.Title
          title="Analytics Dashboard"
          subtitle="Brand mentions and sentiment analysis"
        />
        <Content.Divider />
        <Content.Container>
          <div className="text-center text-destructive">
            <p>Error loading analytics: {error}</p>
            <p className="text-sm mt-2">Check the console for more details.</p>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  // Determine which dashboard state to show
  const showSampleDashboard = !workspaceConfig.hasBrands && !workspaceConfig.hasModels && !workspaceConfig.hasPrompts;
  const showConfigPrompt = (workspaceConfig.hasBrands || workspaceConfig.hasModels || workspaceConfig.hasPrompts) && (!analyticsData || analyticsData.summary?.totalResults === 0);

  // STATE 1: Sample Dashboard (no configuration at all)
  if (!isLoading && showSampleDashboard) {
    // Use mock data and show sample banner
    const sampleData = MOCK_ANALYTICS_DATA;

    // Generate chart config for mock data
    const mockChartConfig = { ...chartConfig };
    const mockBrands = ['Your Brand', 'Competitor A', 'Competitor B', 'Competitor C'];
    mockBrands.forEach((brandName, index) => {
      if (!mockChartConfig[brandName]) {
        mockChartConfig[brandName] = {
          label: brandName,
          color: brandColors[index % brandColors.length],
        };
      }
    });

    const areaChartData = sampleData.dailyMentions.map(day => {
      const dataPoint = { date: day.date };
      day.brands.forEach(brand => {
        dataPoint[brand.brandName] = brand.mentionCount;
      });
      return dataPoint;
    });

    const pieChartData = sampleData.shareOfVoice.map(item => ({
      name: item.brandName,
      value: item.mentionCount,
      percentage: item.percentage,
      fill: mockChartConfig[item.brandName]?.color || "#8884d8"
    }));

    const sentimentData = sampleData.brandSentiments.map(brand => ({
      brand: brand.brandName,
      positive: brand.positive,
      negative: brand.negative,
      notDetermined: brand.notDetermined,
    }));

    const promptPerformanceData = sampleData.ownBrandPromptPerformance.map((ownPerf, idx) => ({
      prompt: ownPerf.prompt,
      ownBrand: ownPerf.winCount,
      competitor: sampleData.competitorPromptPerformance[idx]?.winCount || 0
    }));

    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Sample Dashboard`} />
        <Content.Title
          title="Sample Dashboard"
          subtitle="This is sample data showing you how your dashboard will look"
        />
        <Content.Divider />
        <Content.Container>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 opacity-75">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Brand Mentions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleData.summary.resultsWithSentiment}</div>
                <p className="text-xs text-muted-foreground">Times your brand was mentioned</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Positivity Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const ownBrandSentiment = sampleData.brandSentiments?.find(b => b.brandType === 'own');
                    return ownBrandSentiment ? `${ownBrandSentiment.positivePercentage.toFixed(1)}%` : 'N/A';
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">Positive brand mentions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Own Brand Share</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(() => {
                    const ownBrandShare = sampleData.shareOfVoice?.find(b => b.brandType === 'own');
                    return ownBrandShare ? `${ownBrandShare.percentage.toFixed(1)}%` : 'N/A';
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">Share of voice</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Exclusivity Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sampleData.summary.exclusivityRate ? `${sampleData.summary.exclusivityRate.toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">Only your brand mentioned</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Brand Mentions */}
          <Card className="mb-6 opacity-75">
            <CardHeader>
              <CardTitle>Daily Brand Mentions</CardTitle>
              <CardDescription>Showing brand mention trends over time</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer config={mockChartConfig} className="aspect-auto h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={areaChartData}
                    margin={{ top: 20, left: 0, right: 20 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent config={mockChartConfig} indicator="dot" />} />
                    <Legend />
                    {mockBrands.map((brand) => (
                      <Line
                        key={brand}
                        dataKey={brand}
                        type="monotone"
                        stroke={mockChartConfig[brand].color}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 opacity-75">
            <Card className="flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle>Share of Voice</CardTitle>
                <CardDescription>Brand mention distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer config={mockChartConfig} className="mx-auto aspect-square max-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltipContent hideLabel config={mockChartConfig} />} />
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        strokeWidth={5}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                  Distribution of brand mentions
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Brand Sentiment Analysis</CardTitle>
                <CardDescription>Sentiment breakdown by brand</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentimentData} margin={{ left: 0, right: 20 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="brand"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 8)}
                      />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent indicator="dashed" config={chartConfig} />} />
                      <Legend />
                      <Bar dataKey="positive" fill={chartConfig.positive.color} radius={4} />
                      <Bar dataKey="negative" fill={chartConfig.negative.color} radius={4} />
                      <Bar dataKey="notDetermined" fill={chartConfig.notDetermined.color} radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* New Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 opacity-75">
            {/* Co-Mention Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Co-Mention Analysis</CardTitle>
                <CardDescription>When your brand is mentioned, which competitors appear?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleData.coMentionAnalysis[0].coMentions.map((coMention, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{coMention.brandName}</span>
                        <span className="text-muted-foreground">{coMention.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${coMention.percentage}%`,
                            backgroundColor: chartConfig.competitor.color
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {coMention.count} times co-mentioned
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Brand Position Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Position in Response</CardTitle>
                <CardDescription>Average position when brands are mentioned</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sampleData.brandPositionAnalysis} layout="horizontal">
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="brandName"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 10)}
                    />
                    <YAxis
                      reversed
                      domain={[0, 5]}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Position (1=First)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" config={chartConfig} />}
                    />
                    <Bar
                      dataKey="averagePosition"
                      fill={chartConfig.ownBrand.color}
                      radius={4}
                    >
                      {sampleData.brandPositionAnalysis.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.brandType === 'own' ? chartConfig.ownBrand.color : chartConfig.competitor.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Sentiment Strength Over Time */}
          <Card className="mb-6 opacity-75">
            <CardHeader>
              <CardTitle>Sentiment Strength Over Time</CardTitle>
              <CardDescription>Track how positive sentiment changes for your brand</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sampleData.sentimentTrend}
                    margin={{ top: 20, left: 0, right: 20 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent config={chartConfig} indicator="dot" />}
                    />
                    <Legend />
                    <Line
                      dataKey="positive"
                      name="Positive"
                      type="monotone"
                      stroke={chartConfig.positive.color}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="negative"
                      name="Negative"
                      type="monotone"
                      stroke={chartConfig.negative.color}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="neutral"
                      name="Neutral"
                      type="monotone"
                      stroke={chartConfig.notDetermined.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Competitive Breakdown Table */}
          <Card className="mb-6 opacity-75">
            <CardHeader>
              <CardTitle>Competitive Breakdown</CardTitle>
              <CardDescription>Compare sentiment gap and average position across all brands</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-sm">Brand</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Mentions</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Positivity %</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Sentiment Gap</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Avg Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.competitiveBreakdown.map((row, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm font-medium">
                          {row.brandName}
                          {row.brandType === 'own' && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${chartConfig.ownBrand.color}20`, color: chartConfig.ownBrand.color }}>
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">{row.mentionCount}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {row.positivePercentage.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          <span style={{ color: row.sentimentGap >= 0 ? chartConfig.positive.color : chartConfig.negative.color }}>
                            {row.sentimentGap >= 0 ? '+' : ''}{row.sentimentGap.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {row.averagePosition.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Performance Table - Full Width at Bottom */}
          <Card className="mb-6 opacity-75">
            <CardHeader>
              <CardTitle>Prompt Performance</CardTitle>
              <CardDescription>Top prompts by mention wins for your brand vs. competitors.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-sm">Prompt</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Your Brand</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Competitors</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promptPerformanceData.map((row, index) => {
                      const total = row.ownBrand + row.competitor;
                      const winRate = total > 0 ? ((row.ownBrand / total) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm">{row.prompt}</td>
                          <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.ownBrand.color }}>
                            {row.ownBrand}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.competitor.color }}>
                            {row.competitor}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {total}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            {winRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mentions by Model - Full Width Table at Bottom */}
          <Card className="mb-6 opacity-75">
            <CardHeader>
              <CardTitle>Mentions by Model</CardTitle>
              <CardDescription>Brand mention performance across AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-sm">Model</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Your Brand</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Competitors</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.mentionsByModel.map((model, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm font-medium">{model.modelName}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.ownBrand.color }}>
                          {model.ownBrandMentions}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.competitor.color }}>
                          {model.competitorMentions}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {model.totalMentions}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {model.ownBrandPercentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  // STATE 2: Configuration Prompt (some config done, but no data yet)
  if (!isLoading && showConfigPrompt) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Analytics`} />
        <Content.Title
          title="Analytics Dashboard"
          subtitle="Brand mentions and sentiment analysis"
        />
        <Content.Divider />
        <Content.Container>
          <Card>
            <CardHeader>
              <CardTitle>Waiting for Data</CardTitle>
              <CardDescription>
                Your analytics dashboard will populate once you complete setup and run your first report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">No Analytics Data Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Complete the setup steps above to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  // If no data yet but not in loading state, show placeholder
  if (!analyticsData || analyticsData.summary.totalResults === 0) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Analytics`} />
        <Content.Title
          title="Analytics Dashboard"
          subtitle="Brand mentions and sentiment analysis"
        />
        <Content.Divider />
        <Content.Container>
          <Card>
            <CardHeader>
              <CardTitle>No Data Available Yet</CardTitle>
              <CardDescription>
                Your analytics dashboard will populate once we have data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">Waiting for data...</h3>
                <p className="text-muted-foreground mb-4">
                  Your first analytics job is running. Check back soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  const areaChartData = prepareAreaChartData();
  const pieChartData = preparePieChartData();
  const sentimentData = prepareSentimentData();
  const promptPerformanceData = preparePromptPerformanceData();
  const pieDataWithColors = pieChartData.map(item => ({
    ...item,
    fill: dynamicChartConfig[item.name]?.color || item.fill
  }));

  // Toggle line visibility
  const handleLegendClick = (brandName) => {
    setHiddenLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brandName)) {
        newSet.delete(brandName);
      } else {
        newSet.add(brandName);
      }
      return newSet;
    });
  };

  // Toggle sentiment visibility
  const handleSentimentToggle = (sentimentType) => {
    setHiddenSentiments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sentimentType)) {
        newSet.delete(sentimentType);
      } else {
        newSet.add(sentimentType);
      }
      return newSet;
    });
  };

  console.log('areaChartData', areaChartData.slice(0,5));
  console.log('sentimentData', sentimentData);

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Analytics`} />
      <Content.Title
        title="Analytics Dashboard"
        subtitle="Brand mentions and sentiment analysis"
      />
      <Content.Divider />
      <Content.Container>
        {/* Date Range Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Date Range:</span>
            </div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDate({ start: new Date(e.target.value), end: new Date(dateRange.end) })}
              className="px-3 py-1 border border-border rounded bg-card"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDate({ start: new Date(dateRange.start), end: new Date(e.target.value) })}
              className="px-3 py-1 border border-border rounded bg-card"
            />
            <div className="flex items-center space-x-1 ml-4">
              <span className="text-xs mr-1">Quick:</span>
              {[
                { label: '30d', text: 'Last 30d' },
                { label: 'last_month', text: 'Last Mo.' },
                { label: '3_months', text: 'Last 3M' },
              ].map(({ label, text }) => (
                <button
                  key={label}
                  onClick={() => handleQuickRange(label)}
                  className="px-2 py-0.5 text-xs border border-border rounded-full bg-card hover:bg-muted"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Brand Mentions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.resultsWithSentiment}</div>
              <p className="text-xs text-muted-foreground">Times your brand was mentioned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Positivity Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const ownBrandSentiment = analyticsData.brandSentiments?.find(b => b.brandType === 'own');
                  return ownBrandSentiment ? `${ownBrandSentiment.positivePercentage.toFixed(1)}%` : 'N/A';
                })()}
              </div>
              <p className="text-xs text-muted-foreground">Positive brand mentions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Own Brand Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const ownBrandShare = analyticsData.shareOfVoice?.find(b => b.brandType === 'own');
                  return ownBrandShare ? `${ownBrandShare.percentage.toFixed(1)}%` : 'N/A';
                })()}
              </div>
              <p className="text-xs text-muted-foreground">Share of voice</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Exclusivity Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.summary.exclusivityRate ? `${analyticsData.summary.exclusivityRate.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">Only your brand mentioned</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Brand Mentions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Daily Brand Mentions</CardTitle>
            <CardDescription>Showing brand mention trends over time</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={dynamicChartConfig} className="aspect-auto h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  accessibilityLayer
                  data={areaChartData}
                  margin={{
                    top: 20,
                    left: 0,
                    right: 20,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        config={dynamicChartConfig}
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                        indicator="dot"
                      />
                    }
                  />
                  {Object.keys(dynamicChartConfig).filter(key => !['ownBrand', 'competitor', 'positive', 'negative', 'notDetermined'].includes(key)).map((brand) => (
                    <Line
                      key={brand}
                      dataKey={brand}
                      type="monotone"
                      stroke={dynamicChartConfig[brand].color}
                      strokeWidth={2}
                      dot={false}
                      hide={hiddenLines.has(brand)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {Object.keys(dynamicChartConfig).filter(key => !['ownBrand', 'competitor', 'positive', 'negative', 'notDetermined'].includes(key)).map((brand) => (
                <button
                  key={brand}
                  onClick={() => handleLegendClick(brand)}
                  className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{
                    opacity: hiddenLines.has(brand) ? 0.4 : 1
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dynamicChartConfig[brand].color }}
                  />
                  <span className="text-sm font-medium">
                    {dynamicChartConfig[brand].label || brand}
                  </span>
                  {hiddenLines.has(brand) && (
                    <span className="text-xs text-muted-foreground">(hidden)</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Share of Voice Pie Chart */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>Share of Voice</CardTitle>
              <CardDescription>Brand mention distribution</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer config={dynamicChartConfig} className="mx-auto aspect-square max-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel config={dynamicChartConfig} />}
                    />
                    <Pie
                      data={pieDataWithColors}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                      activeIndex={activeIndex}
                      activeShape={({
                        outerRadius = 0,
                        ...props
                      }) => (
                        <g>
                          <Sector {...props} outerRadius={outerRadius + 10} />
                          <Sector
                            {...props}
                            outerRadius={outerRadius}
                            innerRadius={outerRadius - 5}
                          />
                        </g>
                      )}
                      onMouseEnter={onPieEnter}
                    >
                      {pieDataWithColors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 font-medium leading-none">
                {pieDataWithColors[activeIndex]?.name} - {pieDataWithColors[activeIndex]?.percentage?.toFixed(1)}%
              </div>
              <div className="leading-none text-muted-foreground">
                Distribution of brand mentions
              </div>
            </CardFooter>
          </Card>

          {/* Sentiment Analysis Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Sentiment Analysis</CardTitle>
              <CardDescription>Sentiment breakdown by brand</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    accessibilityLayer
                    data={sentimentData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="brand"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis />
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" config={chartConfig} />}
                    />
                    {!hiddenSentiments.has('positive') && <Bar dataKey="positive" fill={chartConfig.positive.color} radius={4} />}
                    {!hiddenSentiments.has('negative') && <Bar dataKey="negative" fill={chartConfig.negative.color} radius={4} />}
                    {!hiddenSentiments.has('neutral') && <Bar dataKey="notDetermined" fill={chartConfig.notDetermined.color} radius={4} />}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex flex-wrap gap-4 justify-center mt-4">
                <button
                  onClick={() => handleSentimentToggle('positive')}
                  className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{
                    opacity: hiddenSentiments.has('positive') ? 0.4 : 1
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chartConfig.positive.color }}
                  />
                  <span className="text-sm font-medium">Positive</span>
                  {hiddenSentiments.has('positive') && (
                    <span className="text-xs text-muted-foreground">(hidden)</span>
                  )}
                </button>
                <button
                  onClick={() => handleSentimentToggle('negative')}
                  className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{
                    opacity: hiddenSentiments.has('negative') ? 0.4 : 1
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chartConfig.negative.color }}
                  />
                  <span className="text-sm font-medium">Negative</span>
                  {hiddenSentiments.has('negative') && (
                    <span className="text-xs text-muted-foreground">(hidden)</span>
                  )}
                </button>
                <button
                  onClick={() => handleSentimentToggle('neutral')}
                  className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  style={{
                    opacity: hiddenSentiments.has('neutral') ? 0.4 : 1
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chartConfig.notDetermined.color }}
                  />
                  <span className="text-sm font-medium">Neutral</span>
                  {hiddenSentiments.has('neutral') && (
                    <span className="text-xs text-muted-foreground">(hidden)</span>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Co-Mention Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Co-Mention Analysis</CardTitle>
              <CardDescription>When your brand is mentioned, which competitors appear?</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData?.coMentionAnalysis?.[0]?.coMentions && analyticsData.coMentionAnalysis[0].coMentions.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.coMentionAnalysis[0].coMentions.map((coMention, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{coMention.brandName}</span>
                        <span className="text-muted-foreground">{coMention.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${coMention.percentage}%`,
                            backgroundColor: chartConfig.competitor.color
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {coMention.count} times co-mentioned
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No co-mention data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brand Position Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Position in Response</CardTitle>
              <CardDescription>Average position when brands are mentioned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-sm">Brand Name</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Ranking</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Avg Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsData?.brandPositionAnalysis || []).map((row, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm font-medium">
                          {row.brandName}
                          {row.brandType === 'own' && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${chartConfig.ownBrand.color}20`, color: chartConfig.ownBrand.color }}>
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-center font-medium">
                          {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {row.averagePosition.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Strength Over Time */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sentiment Strength Over Time</CardTitle>
            <CardDescription>Track how positive sentiment changes for your brand</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analyticsData?.sentimentTrend || []}
                  margin={{ top: 20, left: 0, right: 20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent config={chartConfig} indicator="dot" />}
                  />
                  {!hiddenSentiments.has('positive') && (
                    <Line
                      dataKey="positive"
                      name="Positive"
                      type="monotone"
                      stroke={chartConfig.positive.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {!hiddenSentiments.has('negative') && (
                    <Line
                      dataKey="negative"
                      name="Negative"
                      type="monotone"
                      stroke={chartConfig.negative.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {!hiddenSentiments.has('neutral') && (
                    <Line
                      dataKey="neutral"
                      name="Neutral"
                      type="monotone"
                      stroke={chartConfig.notDetermined.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              <button
                onClick={() => handleSentimentToggle('positive')}
                className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                style={{
                  opacity: hiddenSentiments.has('positive') ? 0.4 : 1
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartConfig.positive.color }}
                />
                <span className="text-sm font-medium">Positive</span>
                {hiddenSentiments.has('positive') && (
                  <span className="text-xs text-muted-foreground">(hidden)</span>
                )}
              </button>
              <button
                onClick={() => handleSentimentToggle('negative')}
                className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                style={{
                  opacity: hiddenSentiments.has('negative') ? 0.4 : 1
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartConfig.negative.color }}
                />
                <span className="text-sm font-medium">Negative</span>
                {hiddenSentiments.has('negative') && (
                  <span className="text-xs text-muted-foreground">(hidden)</span>
                )}
              </button>
              <button
                onClick={() => handleSentimentToggle('neutral')}
                className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                style={{
                  opacity: hiddenSentiments.has('neutral') ? 0.4 : 1
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartConfig.notDetermined.color }}
                />
                <span className="text-sm font-medium">Neutral</span>
                {hiddenSentiments.has('neutral') && (
                  <span className="text-xs text-muted-foreground">(hidden)</span>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Competitive Breakdown Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Competitive Breakdown</CardTitle>
            <CardDescription>Compare sentiment gap and average position across all brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-sm">Brand</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Mentions</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Positivity %</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Sentiment Gap</th>
                    <th className="text-right py-3 px-4 font-medium text-sm">Avg Position</th>
                  </tr>
                </thead>
                <tbody>
                  {(analyticsData?.competitiveBreakdown || []).map((row, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm font-medium">
                        {row.brandName}
                        {row.brandType === 'own' && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${chartConfig.ownBrand.color}20`, color: chartConfig.ownBrand.color }}>
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">{row.mentionCount}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {row.positivePercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {row.brandType === 'own' ? (
                          <span className="text-muted-foreground font-medium">BASELINE</span>
                        ) : (
                          <span style={{ color: row.sentimentGap >= 0 ? chartConfig.positive.color : chartConfig.negative.color }}>
                            {row.sentimentGap >= 0 ? '+' : ''}{row.sentimentGap.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {row.averagePosition.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Prompt Performance Table - Full Width at Bottom */}
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Prompt Performance</CardTitle>
                <CardDescription>Top prompts by mention wins for your brand vs. competitors.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm">Prompt</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Your Brand</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Competitors</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promptPerformanceData.map((row, index) => {
                        const total = row.ownBrand + row.competitor;
                        const winRate = total > 0 ? ((row.ownBrand / total) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4 text-sm">{row.prompt}</td>
                            <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.ownBrand.color }}>
                              {row.ownBrand}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.competitor.color }}>
                              {row.competitor}
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              {total}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium">
                              {winRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </CardContent>
        </Card>

        {/* Mentions by Model - Full Width Table at Bottom */}
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Mentions by Model</CardTitle>
                <CardDescription>Brand mention performance across AI models</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm">Model</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Your Brand</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Competitors</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Total</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData?.mentionsByModel || []).map((model, index) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm font-medium">{model.modelName}</td>
                          <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.ownBrand.color }}>
                            {model.ownBrandMentions}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium" style={{ color: chartConfig.competitor.color }}>
                            {model.competitorMentions}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {model.totalMentions}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            {model.ownBrandPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </CardContent>
        </Card>

      </Content.Container>
    </AccountLayout>
  );
} 