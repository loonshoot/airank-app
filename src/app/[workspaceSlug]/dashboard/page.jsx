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
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend
} from '@/components/ui/chart';
import { 
  AreaChart,
  Area,
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
  LineChart,
  Line,
  Legend,
  Tooltip,
  LabelList
} from 'recharts';
import { CalendarIcon, TrendingUp } from '@heroicons/react/24/outline';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
        mentionCount
        percentage
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
    }
  }
`;

// Chart configuration with explicit colors that work with our dark theme
const chartConfig = {
  ownBrand: {
    label: "Own Brand",
    color: "#10b981", // Green for own brand
  },
  competitor: {
    label: "Competitor", 
    color: "#ef4444", // Red for competitor
  },
  positive: {
    label: "Positive",
    color: "#10b981", // Green for positive
  },
  negative: {
    label: "Negative",
    color: "#ef4444", // Red for negative
  },
  notDetermined: {
    label: "Neutral",
    color: "#6b7280", // Gray for neutral
  }
};

const brandColors = [
  "#10b981", "#34d399", "#6ee7b7", "#a7f3d0",
  "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
  "#f87171", "#fca5a5", "#fecaca", "#ef4444",
];


export default function DashboardPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();
  
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [dynamicChartConfig, setDynamicChartConfig] = useState(chartConfig);
  const [activeIndex, setActiveIndex] = useState(0);

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
    let start;
    let end = today;

    switch (range) {
      case '30d':
        start = subDays(today, 30);
        break;
      case 'last_month':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case '3_months':
        start = subMonths(today, 3);
        break;
      default:
        start = subDays(today, 30);
    }
    setDate({ start, end });
  };

  // Prepare area chart data
  const prepareAreaChartData = () => {
    if (!analyticsData?.dailyMentions) return [];
    
    const allBrands = [
      ...new Set(analyticsData.dailyMentions.flatMap(day => day.brands.map(b => b.brandName)))
    ];

    const dateMap = new Map();
    
    analyticsData.dailyMentions.forEach(day => {
      const dayData = { date: day.date };
      allBrands.forEach(brand => {
        dayData[brand] = 0;
      });
      
      day.brands.forEach(brand => {
        dayData[brand.brandName] = Number(brand.mentionCount);
      });
      
      dateMap.set(day.date, dayData);
    });
    
    return Array.from(dateMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Prepare pie chart data  
  const preparePieChartData = () => {
    if (!analyticsData?.shareOfVoice) return [];
    
    return analyticsData.shareOfVoice.map(item => ({
      name: item.brandName,
      value: Number(item.mentionCount),
      percentage: item.percentage,
      fill: item.brandType === 'own' ? "#10b981" : "#ef4444"
    }));
  };

  // Prepare sentiment data
  const prepareSentimentData = () => {
    if (!analyticsData?.brandSentiments) return [];
    
    return analyticsData.brandSentiments.map(brand => ({
      brand: brand.brandName,
      positive: Number(brand.positive),
      negative: Number(brand.negative),
      notDetermined: Number(brand.notDetermined),
      total: brand.total
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
              <CardTitle>Setup Not Complete</CardTitle>
              <CardDescription>
                Your analytics dashboard will be available once you have data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold mb-2">No Analytics Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  To see your analytics dashboard, you need to set up your prompts and run analysis.
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

  console.log('areaChartData', areaChartData.slice(0,5));
  console.log('sentimentData', sentimentData);
  console.log('pieChartData', pieChartData);
  console.log('mentionsByModel converted', analyticsData?.mentionsByModel?.map(m => ({ ...m, mentionCount: Number(m.mentionCount) })));
  console.log('promptPerformanceData', promptPerformanceData);

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
              <CardTitle className="text-sm font-medium">Total Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.totalResults}</div>
              <p className="text-xs text-muted-foreground">Model responses analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">With Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.resultsWithSentiment}</div>
              <p className="text-xs text-muted-foreground">Responses with brand mentions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Own Brand Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.summary.ownBrandMentionPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Share of voice</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Date Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {analyticsData.summary.dateRange.start} to {analyticsData.summary.dateRange.end}
              </div>
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
                <AreaChart
                  accessibilityLayer
                  data={areaChartData}
                  margin={{
                    top: 20,
                    left: 12,
                    right: 12,
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
                  <Legend />
                  {Object.keys(dynamicChartConfig).filter(key => !['ownBrand', 'competitor', 'positive', 'negative', 'notDetermined'].includes(key)).map((brand) => (
                    <Area
                      key={brand}
                      dataKey={brand}
                      type="natural"
                      fill={dynamicChartConfig[brand].color}
                      fillOpacity={0.4}
                      stroke={dynamicChartConfig[brand].color}
                      stackId="a"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
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

        {/* New Row: LLM and Prompt Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
                <CardHeader>
                    <CardTitle>Mentions by Model</CardTitle>
                    <CardDescription>Which AI models are mentioning you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analyticsData?.mentionsByModel?.map(m => ({ ...m, mentionCount: Number(m.mentionCount) }))} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="modelName"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <Tooltip
                            cursor={false}
                            content={
                              <ChartTooltipContent
                                indicator="dashed"
                                hideLabel
                                config={chartConfig}
                              />
                            }
                        />
                        <Bar dataKey="mentionCount" fill={chartConfig.ownBrand.color} radius={4}>
                            <LabelList dataKey="mentionCount" position="right" offset={8} className="fill-foreground" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Prompt Performance</CardTitle>
                    <CardDescription>Top prompts by mention wins for your brand vs. competitors.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={promptPerformanceData}>
                        <CartesianGrid vertical={false} />
                        <XAxis 
                            dataKey="prompt" 
                            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                        />
                        <YAxis />
                        <Tooltip
                            cursor={false}
                            content={
                              <ChartTooltipContent
                                indicator="dashed"
                                config={chartConfig}
                              />
                            }
                        />
                        <Legend />
                        <Bar dataKey="ownBrand" name="Your Brand Wins" fill={chartConfig.ownBrand.color} radius={4} />
                        <Bar dataKey="competitor" name="Competitor Wins" fill={chartConfig.competitor.color} radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

      </Content.Container>
    </AccountLayout>
  );
}
