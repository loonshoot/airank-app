# AIRank App Transformation Plan

## 🎯 Project Overview
Transform outrun-app into AIRank-app: a focused brand monitoring frontend that provides users with setup wizards, analytics dashboards, and prompt management for multi-LLM brand sentiment analysis.

## 🤖 Integration with Backend Task Generation

### Task Management System
This frontend connects to the `airank-core` backend which automatically generates development tasks using the `frontendInstructionGenerator.js` job. The backend analyzes this plan and current codebase state to output specific, actionable development instructions.

#### Task Retrieval Process:
1. **Daily Standup**: Query backend for high-priority tasks
2. **Task Execution**: Follow generated step-by-step instructions  
3. **Progress Tracking**: Mark tasks complete to unlock dependencies
4. **Automated Planning**: Backend generates next tasks based on completion

#### GraphQL Integration for Task Management:
```javascript
// Get current development tasks
const GET_FRONTEND_TASKS = gql`
  query GetFrontendTasks($phase: String, $priority: String) {
    frontendTasks(phase: $phase, priority: $priority) {
      taskId
      phase
      component
      priority
      instructions {
        title
        description
        steps {
          action
          target
          code
          reason
        }
      }
      estimatedHours
      dependencies
    }
  }
`;

// Mark task as completed
const COMPLETE_FRONTEND_TASK = gql`
  mutation CompleteFrontendTask($taskId: String!, $completionNotes: String) {
    completeFrontendTask(taskId: $taskId, notes: $completionNotes) {
      success
      nextTask {
        taskId
        title
      }
      progressUpdate {
        phaseCompletion
        totalProgress
      }
    }
  }
`;
```

## 🎨 Brand Identity & Design System

### Color Scheme
```css
:root {
  --color-paragraph: #211A1D;      /* Main text */
  --color-brand: #51F72B;          /* Primary brand color */
  --color-alt: #37B91A;            /* Subtitles & alts */
  --color-background: #F8F0FB;     /* Main background */
  --color-secondary: #CBD6D3;      /* Secondary elements */
  --color-accent: #43B929;         /* Additional accents */
}
```

### Subscription Plans
- **Small**: $99/month - 5 prompts, weekly execution
- **Medium**: $199/month - 25 prompts, weekly execution  
- **Large**: $299/month - 50 prompts, daily execution
- **XL**: $499/month - 500 prompts, daily execution

## 📋 Implementation Steps (Backend-Generated Tasks)

*Note: These phases will be automatically broken down into specific tasks by the backend `frontendInstructionGenerator.js` job.*

### Phase 1: Project Cleanup & Rebranding
**Backend-Generated Tasks Will Include**:
- [ ] Remove unused workflow, sources, destinations directories
- [ ] Update package.json with AIRank branding
- [ ] Implement new color scheme in Tailwind config
- [ ] Clean up unused Canvas and QueryBuilder components

### Phase 2: Navigation & Layout Restructure  
**Backend-Generated Tasks Will Include**:
- [ ] Update sidebar to show only: Reporting, Prompts, Competitors, Settings
- [ ] Modify header components for AIRank branding
- [ ] Update layout components for simplified navigation

### Phase 3: Setup Wizard Implementation
**Backend-Generated Tasks Will Include**:
- [ ] Create setup wizard directory structure
- [ ] Build Step 1: Brand input form
- [ ] Build Step 2: Competitor management
- [ ] Build Step 3: Prompt creation with templates
- [ ] Build Step 4: LLM provider selection
- [ ] Build Step 5: Setup completion summary

### Phase 4: Core Pages Development
**Backend-Generated Tasks Will Include**:
- [ ] Dashboard with key metrics cards and charts
- [ ] Prompts management page with CRUD operations
- [ ] Competitors/brands management interface
- [ ] Real-time analytics and reporting views

### Phase 5: Components Development
**Backend-Generated Tasks Will Include**:
- [ ] Chart components (sentiment, mentions, comparisons)
- [ ] Form components (prompts, brands) 
- [ ] Card components (metrics, prompts)
- [ ] Wizard components with progress tracking

### Phase 6: GraphQL Integration
**Backend-Generated Tasks Will Include**:
- [ ] Connect to brand management APIs
- [ ] Integrate prompt CRUD operations
- [ ] Implement analytics data fetching
- [ ] Add LLM provider configuration

### Phase 7: Authentication & Routing Updates
**Backend-Generated Tasks Will Include**:
- [ ] Setup wizard requirement enforcement
- [ ] Plan-based access control implementation
- [ ] Middleware updates for setup completion tracking

### Phase 8: Billing & Subscription Updates
**Backend-Generated Tasks Will Include**:
- [ ] Update subscription plan definitions
- [ ] Implement usage tracking and limits
- [ ] Build subscription management UI

## 🔧 Development Workflow Integration

### Daily Development Process:
1. **Morning**: Query backend for today's high-priority tasks
2. **Development**: Follow generated step-by-step instructions
3. **Completion**: Mark tasks complete and get next suggestions
4. **Progress**: Track overall transformation progress

### Example Backend-Generated Task:
```javascript
{
  taskId: "FE_003",
  phase: "Phase 1 - Cleanup",
  component: "Color Scheme Implementation",
  priority: "high",
  estimatedHours: 2,
  dependencies: ["FE_001", "FE_002"],
  instructions: {
    title: "Implement AIRank color scheme",
    description: "Update Tailwind config and create theme CSS",
    steps: [
      {
        action: "update",
        target: "tailwind.config.js",
        code: `module.exports = {
  theme: {
    extend: {
      colors: {
        'airank-paragraph': '#211A1D',
        'airank-brand': '#51F72B',
        'airank-alt': '#37B91A',
        'airank-background': '#F8F0FB',
        'airank-secondary': '#CBD6D3',
        'airank-accent': '#43B929'
      }
    }
  }
}`,
        reason: "Implement the new AIRank color palette"
      },
      {
        action: "create",
        target: "src/styles/airank-theme.css",
        code: `:root {
  --color-paragraph: #211A1D;
  --color-brand: #51F72B;
  --color-alt: #37B91A;
  --color-background: #F8F0FB;
  --color-secondary: #CBD6D3;
  --color-accent: #43B929;
}`,
        reason: "Create CSS custom properties for consistent theming"
      }
    ],
    testingNotes: "Verify colors display correctly across all components",
    documentation: "Update style guide with new color palette"
  }
}
```

## 🏗️ Component Architecture

### Directory Structure (Will be created via backend tasks):
```
src/
├── app/
│   └── [workspaceSlug]/
│       ├── setup/               # Setup wizard (Generated)
│       ├── prompts/            # Prompt management (Generated)
│       ├── competitors/        # Brand/competitor management (Generated)
│       └── page.jsx           # Dashboard (Generated)
├── components/
│   ├── Charts/                # Data visualization (Generated)
│   ├── Forms/                 # Form components (Generated)
│   ├── Cards/                 # Metric & data cards (Generated)
│   └── Wizard/                # Setup wizard components (Generated)
└── hooks/
    ├── useBrands.js           # Brand management (Generated)
    ├── usePrompts.js          # Prompt operations (Generated)
    └── useAnalytics.js        # Dashboard data (Generated)
```

## 📱 Responsive Design Requirements
- Mobile-first approach
- Dashboard optimized for tablets
- Setup wizard works on all devices
- Charts responsive and touch-friendly

## 🧪 Testing Strategy (Backend Will Generate Test Tasks)
- Component testing with React Testing Library
- Integration tests for setup wizard flow
- E2E tests for critical user journeys
- Visual regression testing for charts

## 📅 Timeline (Managed by Backend Task Generation)
- **Week 1**: Phase 1-3 (Cleanup, navigation, setup wizard)
- **Week 2**: Phase 4-5 (Core pages, components)
- **Week 3**: Phase 6-7 (GraphQL integration, auth)
- **Week 4**: Phase 8 (Billing, final polish)

## 🚀 Launch Readiness Checklist (Backend-Tracked)
- [ ] Setup wizard fully functional
- [ ] Dashboard displays real analytics data
- [ ] Billing integration complete
- [ ] Mobile responsive across all pages
- [ ] Performance optimized
- [ ] Error handling comprehensive
- [ ] All backend-generated tasks completed

---

*This plan works in conjunction with the airank-core backend which automatically generates specific, actionable development tasks. Check the backend daily for new tasks and progress updates.* 