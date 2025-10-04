import { SearchResultsData, SearchResult } from '../components/SearchResults';

export const mockSearchResults: SearchResultsData[] = [
  {
    query: "Q3 performance metrics and team productivity",
    totalResults: 12,
    searchTime: 847,
    timestamp: "2024-01-15T10:30:00Z",
    aiSummary: "Based on your search across Slack, Google Drive, and Notion, I found comprehensive Q3 performance data showing strong growth across all metrics. The team achieved a 23% increase in revenue with productivity improvements of 15% compared to Q2. Key highlights include successful completion of 8 out of 10 OKRs, with notable contributions from the engineering and sales teams. The performance review documents and team standup notes indicate consistent momentum throughout the quarter.",
    results: [
      {
        id: "slack-1",
        title: "Q3 Performance Review - Team Standup Notes",
        content: "Team standup notes from Q3 showing 15% productivity increase across all departments. Engineering team delivered 12 major features, sales exceeded targets by 18%, and customer support maintained 95% satisfaction rating.",
        snippet: "Team standup notes from Q3 showing 15% productivity increase across all departments. Engineering team delivered 12 major features, sales exceeded targets by 18%, and customer support maintained 95% satisfaction rating.",
        source: "Slack",
        type: "message",
        author: "Sarah Chen",
        timestamp: "2024-01-15T09:00:00Z",
        relevanceScore: 0.92,
        channel: "general",
        url: "https://slack.com/messages/general/123456"
      },
      {
        id: "drive-1",
        title: "Q3 Performance Report 2024",
        content: "Comprehensive Q3 performance analysis showing revenue growth of 23% year-over-year. Key metrics include customer acquisition up 34%, retention rate at 89%, and operational efficiency improvements of 12%.",
        snippet: "Comprehensive Q3 performance analysis showing revenue growth of 23% year-over-year. Key metrics include customer acquisition up 34%, retention rate at 89%, and operational efficiency improvements of 12%.",
        source: "Google Drive",
        type: "pdf",
        author: "Mike Johnson",
        timestamp: "2024-01-14T16:30:00Z",
        relevanceScore: 0.89,
        filename: "Q3_Performance_Report_2024.pdf",
        url: "https://drive.google.com/file/d/1abc123/view"
      },
      {
        id: "notion-1",
        title: "Q3 OKR Tracking Dashboard",
        content: "Quarterly OKR tracking showing 8/10 goals achieved with 2 goals partially completed. Team velocity increased by 15%, code quality metrics improved, and customer satisfaction scores reached new highs.",
        snippet: "Quarterly OKR tracking showing 8/10 goals achieved with 2 goals partially completed. Team velocity increased by 15%, code quality metrics improved, and customer satisfaction scores reached new highs.",
        source: "Notion",
        type: "page",
        author: "Alex Rivera",
        timestamp: "2024-01-13T11:15:00Z",
        relevanceScore: 0.85,
        page: "Q3 OKRs",
        url: "https://notion.so/okrs-q3-2024"
      },
      {
        id: "slack-2",
        title: "Engineering Team Q3 Retrospective",
        content: "Engineering team retrospective discussing sprint velocity improvements, code review process enhancements, and deployment frequency increases. Team morale is high with 94% satisfaction in quarterly survey.",
        snippet: "Engineering team retrospective discussing sprint velocity improvements, code review process enhancements, and deployment frequency increases. Team morale is high with 94% satisfaction in quarterly survey.",
        source: "Slack",
        type: "message",
        author: "David Kim",
        timestamp: "2024-01-12T14:20:00Z",
        relevanceScore: 0.78,
        channel: "engineering",
        url: "https://slack.com/messages/engineering/789012"
      },
      {
        id: "drive-2",
        title: "Customer Success Metrics Q3",
        content: "Customer success team performance data showing 89% retention rate, 23% increase in upsells, and 96% customer satisfaction score. Support ticket resolution time improved by 18%.",
        snippet: "Customer success team performance data showing 89% retention rate, 23% increase in upsells, and 96% customer satisfaction score. Support ticket resolution time improved by 18%.",
        source: "Google Drive",
        type: "excel",
        author: "Lisa Park",
        timestamp: "2024-01-11T10:45:00Z",
        relevanceScore: 0.82,
        filename: "Customer_Success_Metrics_Q3.xlsx",
        url: "https://drive.google.com/file/d/2def456/view"
      },
      {
        id: "notion-2",
        title: "Sales Performance Dashboard",
        content: "Sales team performance tracking with 34% increase in new customer acquisition, 18% growth in average deal size, and 92% quota achievement rate. Top performers and coaching opportunities identified.",
        snippet: "Sales team performance tracking with 34% increase in new customer acquisition, 18% growth in average deal size, and 92% quota achievement rate. Top performers and coaching opportunities identified.",
        source: "Notion",
        type: "page",
        author: "Emma Wilson",
        timestamp: "2024-01-10T15:30:00Z",
        relevanceScore: 0.76,
        page: "Sales Performance",
        url: "https://notion.so/sales-performance-q3"
      }
    ]
  },
  {
    query: "Product roadmap and feature planning",
    totalResults: 8,
    searchTime: 623,
    timestamp: "2024-01-14T14:20:00Z",
    aiSummary: "Your search revealed comprehensive product roadmap documentation across multiple sources. The 2024 roadmap includes 15 major features planned across 4 quarters, with strong focus on AI integration, mobile improvements, and enterprise features. The product team has outlined clear milestones and dependencies, with Q1 focusing on core infrastructure improvements.",
    results: [
      {
        id: "notion-3",
        title: "Product Roadmap 2024 - Strategic Planning",
        content: "Comprehensive 2024 product roadmap including 15 major features across 4 quarters. Q1 focuses on infrastructure, Q2 on AI features, Q3 on mobile improvements, and Q4 on enterprise capabilities.",
        snippet: "Comprehensive 2024 product roadmap including 15 major features across 4 quarters. Q1 focuses on infrastructure, Q2 on AI features, Q3 on mobile improvements, and Q4 on enterprise capabilities.",
        source: "Notion",
        type: "page",
        author: "Emma Wilson",
        timestamp: "2024-01-14T13:00:00Z",
        relevanceScore: 0.95,
        page: "Product Roadmap 2024",
        url: "https://notion.so/product-roadmap-2024"
      },
      {
        id: "drive-3",
        title: "Feature Requirements Document v2.1",
        content: "Detailed feature requirements for upcoming releases including AI-powered search, advanced analytics dashboard, and mobile app redesign. Includes user stories, acceptance criteria, and technical specifications.",
        snippet: "Detailed feature requirements for upcoming releases including AI-powered search, advanced analytics dashboard, and mobile app redesign. Includes user stories, acceptance criteria, and technical specifications.",
        source: "Google Drive",
        type: "doc",
        author: "David Kim",
        timestamp: "2024-01-13T15:45:00Z",
        relevanceScore: 0.88,
        filename: "Feature_Requirements_v2.1.docx",
        url: "https://drive.google.com/file/d/3ghi789/view"
      },
      {
        id: "slack-3",
        title: "Product Team Discussion - MVP Features",
        content: "Product team discussion about MVP features for the next release. Prioritizing user authentication improvements, search functionality enhancements, and performance optimizations based on user feedback.",
        snippet: "Product team discussion about MVP features for the next release. Prioritizing user authentication improvements, search functionality enhancements, and performance optimizations based on user feedback.",
        source: "Slack",
        type: "message",
        author: "Lisa Park",
        timestamp: "2024-01-12T10:30:00Z",
        relevanceScore: 0.81,
        channel: "product",
        url: "https://slack.com/messages/product/345678"
      },
      {
        id: "notion-4",
        title: "Feature Prioritization Matrix",
        content: "Feature prioritization matrix based on user impact, development effort, and strategic alignment. High-priority features include AI integration (9.2/10), mobile improvements (8.7/10), and enterprise security (8.5/10).",
        snippet: "Feature prioritization matrix based on user impact, development effort, and strategic alignment. High-priority features include AI integration (9.2/10), mobile improvements (8.7/10), and enterprise security (8.5/10).",
        source: "Notion",
        type: "page",
        author: "Sophie Chen",
        timestamp: "2024-01-11T11:20:00Z",
        relevanceScore: 0.83,
        page: "Feature Prioritization",
        url: "https://notion.so/feature-prioritization"
      },
      {
        id: "drive-4",
        title: "User Research Insights - Feature Requests",
        content: "Compilation of user research insights and feature requests from customer interviews, surveys, and support tickets. Top requests include better search, mobile app, and integration capabilities.",
        snippet: "Compilation of user research insights and feature requests from customer interviews, surveys, and support tickets. Top requests include better search, mobile app, and integration capabilities.",
        source: "Google Drive",
        type: "pdf",
        author: "Maria Garcia",
        timestamp: "2024-01-10T09:15:00Z",
        relevanceScore: 0.79,
        filename: "User_Research_Insights_Q4.pdf",
        url: "https://drive.google.com/file/d/4jkl012/view"
      }
    ]
  },
  {
    query: "User feedback and support tickets",
    totalResults: 15,
    searchTime: 934,
    timestamp: "2024-01-13T09:15:00Z",
    aiSummary: "Analysis of user feedback reveals strong satisfaction with core features but identifies key improvement areas. Support ticket analysis shows 89% resolution rate with average response time of 2.3 hours. Top feedback themes include mobile app improvements, search functionality, and integration requests. Customer satisfaction scores average 4.2/5 across all touchpoints.",
    results: [
      {
        id: "slack-4",
        title: "Support Team Weekly Summary - Ticket Resolution",
        content: "Weekly support team summary showing 47 tickets resolved this week with 94% customer satisfaction rate. Average resolution time improved to 2.3 hours, down from 3.1 hours last week.",
        snippet: "Weekly support team summary showing 47 tickets resolved this week with 94% customer satisfaction rate. Average resolution time improved to 2.3 hours, down from 3.1 hours last week.",
        source: "Slack",
        type: "message",
        author: "Tom Anderson",
        timestamp: "2024-01-12T14:20:00Z",
        relevanceScore: 0.87,
        channel: "support",
        url: "https://slack.com/messages/support/567890"
      },
      {
        id: "drive-5",
        title: "Customer Feedback Survey Results Q4 2023",
        content: "Comprehensive customer feedback survey with 1,247 responses showing 4.2/5 average satisfaction score. Key themes: mobile app needs improvement (67% mentioned), search functionality enhancement (54%), and better integrations (43%).",
        snippet: "Comprehensive customer feedback survey with 1,247 responses showing 4.2/5 average satisfaction score. Key themes: mobile app needs improvement (67% mentioned), search functionality enhancement (54%), and better integrations (43%).",
        source: "Google Drive",
        type: "excel",
        author: "Maria Garcia",
        timestamp: "2024-01-11T11:00:00Z",
        relevanceScore: 0.91,
        filename: "Customer_Feedback_Survey_Q4_2023.xlsx",
        url: "https://drive.google.com/file/d/5mno345/view"
      },
      {
        id: "notion-5",
        title: "Customer Feedback Database - Insights",
        content: "Customer feedback database containing 2,341 entries with sentiment analysis. Positive feedback (78%) highlights ease of use and reliability. Negative feedback (22%) focuses on mobile experience and feature gaps.",
        snippet: "Customer feedback database containing 2,341 entries with sentiment analysis. Positive feedback (78%) highlights ease of use and reliability. Negative feedback (22%) focuses on mobile experience and feature gaps.",
        source: "Notion",
        type: "page",
        author: "James Lee",
        timestamp: "2024-01-10T16:15:00Z",
        relevanceScore: 0.85,
        page: "Customer Feedback Database",
        url: "https://notion.so/customer-feedback-insights"
      },
      {
        id: "slack-5",
        title: "Customer Success Team - Feedback Highlights",
        content: "Customer success team sharing key feedback highlights from this month. Positive: 'Love the new dashboard design' (23 mentions), 'Much faster loading times' (18 mentions). Areas for improvement: mobile app crashes (12 reports), search accuracy (8 mentions).",
        snippet: "Customer success team sharing key feedback highlights from this month. Positive: 'Love the new dashboard design' (23 mentions), 'Much faster loading times' (18 mentions). Areas for improvement: mobile app crashes (12 reports), search accuracy (8 mentions).",
        source: "Slack",
        type: "message",
        author: "Rachel Green",
        timestamp: "2024-01-09T13:45:00Z",
        relevanceScore: 0.82,
        channel: "customer-success",
        url: "https://slack.com/messages/customer-success/678901"
      },
      {
        id: "drive-6",
        title: "Support Ticket Analysis - January 2024",
        content: "Monthly support ticket analysis showing 156 tickets with 89% resolution rate. Top categories: login issues (23%), mobile app problems (18%), search functionality (15%), and billing questions (12%).",
        snippet: "Monthly support ticket analysis showing 156 tickets with 89% resolution rate. Top categories: login issues (23%), mobile app problems (18%), search functionality (15%), and billing questions (12%).",
        source: "Google Drive",
        type: "pdf",
        author: "Support Team",
        timestamp: "2024-01-08T10:30:00Z",
        relevanceScore: 0.88,
        filename: "Support_Ticket_Analysis_January_2024.pdf",
        url: "https://drive.google.com/file/d/6pqr678/view"
      }
    ]
  }
];

// Helper function to get mock data by query
export const getMockSearchResults = (query: string): SearchResultsData | null => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Find matching mock data based on query similarity
  const match = mockSearchResults.find(data => 
    data.query.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes('performance') ||
    normalizedQuery.includes('roadmap') ||
    normalizedQuery.includes('feedback')
  );
  
  return match || mockSearchResults[0]; // Default to first result if no match
};

// Helper function to simulate search delay
export const simulateSearch = async (query: string): Promise<SearchResultsData> => {
  const delay = Math.random() * 2000 + 500; // 500-2500ms delay
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const results = getMockSearchResults(query);
  if (!results) {
    throw new Error('No results found');
  }
  
  // Add some randomness to search time
  results.searchTime = Math.floor(Math.random() * 1000 + 400);
  results.timestamp = new Date().toISOString();
  
  return results;
};
