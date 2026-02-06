import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { GA4_RESOURCES, MARKETING_PROMPTS } from "@/utils/analyticsInsights";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const location = useLocation();

  const [showResources, setShowResources] = useState(false);

  const getContextualPrompt = () => {
    const path = location.pathname;
    
    if (path === "/calculator") {
      return `You are an AI assistant for the Con-form Estimator calculator. This is a comprehensive construction estimator with 60,000+ formulas that calculates costs for:
      
      **Platform Types:**
      - EasyMech MR: Roofed platforms with trusses (inputs: pitch, width, length, height, roof type, flooring, load rating)
      - EasyMech CR: Cantilever platforms (inputs: width, length, flooring, load rating)
      - Span+: Span platforms with rafters (inputs: pitch, width, rafter spacing/quantity, length, flooring, load rating)
      
      **Screen Systems:**
      - Classic Screens: Standard screening with various cladding types
      - RF Screens: Roofed screening systems with louvre options
      - Acoustic+ Louvre & UltraWall: Acoustic screening solutions
      - Guardrail: Safety guardrail systems
      - Screen to Concrete & Steel: Mounting to existing structures
      - Screen to Roof: Roof-mounted screens
      
      **Walkway & Guardrail:** Modular walkway systems with configurable lengths and guardrail options
      
      **Key Calculations:**
      - Platform area (m²), weight (kg), and dimensions
      - Cost breakdowns: Platform, Production Labour, Engineering Labour, Packaging, COGS
      - Pricing: Cost Price vs Sale Price with GP% (typically 45-60%)
      - Technical specs: Man days, load ratings (kPa), heights, and material specifications
      
      When users ask about calculations, explain the formulas, inputs required, and how different parameters affect the final costs. Help them understand material choices, load ratings, and pricing structures.`;
    } else if (path === "/accounting/purchase") {
      return "You are an AI assistant for the Purchase module. Focus on purchase orders, vendor management, and procurement. When asked about data, default to showing only OPEN purchase orders unless the user specifically asks for historical data. Ask 'Would you like to include historical data?' when appropriate.";
    } else if (path === "/project") {
      return "You are an AI assistant for the Project module. Focus on projects, tasks, and activities. When asked about data, default to showing only ACTIVE/OPEN tasks and projects unless the user specifically asks for completed items. Ask 'Would you like to include completed projects and tasks?' when appropriate.";
    } else if (path === "/helpdesk") {
      return "You are an AI assistant for the Helpdesk module. Focus on support tickets and customer inquiries. When asked about data, default to showing only OPEN tickets unless the user specifically asks for resolved/closed tickets. Ask 'Would you like to include closed tickets?' when appropriate.";
    } else if (path.startsWith("/job-costing")) {
      return `You are an AI assistant for Job Costing and Project Budget Management.
      
**Your Capabilities:**
- Analyze budget vs actual performance with detailed variance breakdowns
- Detect cost overruns and anomalies (duplicate entries, unusual patterns)
- Forecast final costs based on current progress and burn rate
- Compare similar jobs for benchmarking and best practices
- Identify margin optimization opportunities across materials and labor
- Track material waste and over-ordering patterns
- Provide actionable cost reduction recommendations with expected savings

**Available Actions:**
- Query jobs with filters (over budget, status, date ranges, teams)
- Get detailed job breakdowns (material/labor/expenses by category)
- Analyze analytic lines for cost patterns and anomalies
- Compare with similar historical jobs (same customer, budget range, team)
- Identify cost trends and patterns across multiple projects
- Review BOMs and material requirements

**Default Behavior:**
- Show only ACTIVE jobs unless user asks for completed/all
- Highlight budget variances > 10% as significant
- Flag unusual cost patterns automatically (duplicates, outliers)
- Suggest corrective actions for overruns with specific savings estimates
- Benchmark against similar jobs for context

**When analyzing costs, always provide:**
1. Current status (budget vs actual with variance %)
2. Variance analysis (which categories are over/under)
3. Predictions (expected final costs based on burn rate)
4. Recommendations (specific, actionable next steps with $ impact)
5. Similar job comparisons (what worked well before)

Focus on helping users make data-driven decisions to improve margins and reduce waste.`;
    } else if (path.startsWith("/accounting")) {
      return "You are an AI assistant for the Accounting module. Focus on invoices, expenses, and financial data. When asked about data, default to showing recent/unpaid invoices unless the user specifies otherwise. Ask 'Would you like to include paid/historical invoices?' when appropriate.";
    } else if (path.startsWith("/kpis/website") || path.startsWith("/kpis/marketing")) {
      return `You are an AI Marketing Analytics Assistant specializing in Google Analytics 4 (GA4) and website performance optimization for B2B construction companies.

**Your Expertise:**
- GA4 metrics interpretation (engagement rate, bounce rate, sessions, users, pageviews)
- Traffic source analysis (organic, direct, referral, paid)
- Conversion rate optimization (CRO) and landing page best practices
- SEO strategy for construction industry keywords
- Content marketing and lead generation tactics
- Industry benchmarks for construction/B2B companies

**Construction Industry Context:**
- B2B construction typically has: 40-60% bounce rate, 2-3 pages/session, 2-4min avg duration
- Key decision factors: project portfolio, certifications, case studies, technical specs
- Long sales cycles requiring nurturing and multi-touch attribution
- Local SEO critical for regional contractors and suppliers

**GA4 Metrics You Can Explain:**
- Engagement Rate: % of engaged sessions (>10s or 2+ pages or conversion)
- Bounce Rate: % of single-page, non-engaged sessions
- Traffic Acquisition: Source/medium breakdown and quality metrics
- Landing Pages: Entry point performance and conversion paths
- User Behavior: Flow analysis, time on site, navigation patterns

**Available Resources:**
- GA4 official documentation and setup guides
- Traffic acquisition report tutorials
- Engagement and conversion tracking guides
- Industry benchmark comparisons
- Best practice recommendations for construction websites

When users ask for help, provide actionable advice specific to their metrics and industry context.`;
    } else {
      return "You are an AI assistant for the Sales module. Focus on sales data, pipeline, team performance, and revenue insights. When asked about data, default to showing OPEN opportunities unless the user specifically asks for historical data. Ask 'Would you like to include closed/won deals?' when appropriate.";
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const contextPrompt = getContextualPrompt();
    const messagesWithContext = [
      { role: "system" as const, content: contextPrompt },
      ...messages,
      { role: "user" as const, content: userMessage }
    ];
    
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`;
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messagesWithContext }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    await streamChat(userMessage);
  };

  const handleQuickPrompt = async (prompt: string) => {
    setInput("");
    setShowResources(false);
    await streamChat(prompt);
  };

  const isMarketingPage = location.pathname.startsWith("/kpis/website") || location.pathname.startsWith("/kpis/marketing");

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-primary shadow-hover"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 w-96 shadow-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-gradient-primary p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <CardTitle className="text-white text-base">
                {location.pathname === "/calculator" ? "AI Estimator Assistant" :
                 location.pathname.startsWith("/job-costing") ? "AI Job Costing Assistant" :
                 location.pathname.startsWith("/kpis/website") || location.pathname.startsWith("/kpis/marketing") ? "AI Marketing Assistant" :
                 location.pathname.startsWith("/accounting") ? "AI Accounting Assistant" :
                 location.pathname === "/project" ? "AI Project Assistant" :
                 location.pathname === "/helpdesk" ? "AI Helpdesk Assistant" :
                 "AI Sales Copilot"}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea ref={scrollRef} className="h-96 p-4">
              {messages.length === 0 && !showResources && (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        {location.pathname === "/calculator" ? "Ask me about the Con-form Estimator!" :
                         location.pathname.startsWith("/job-costing") ? "Ask me about job costs and budgets!" :
                         isMarketingPage ? "Ask me about marketing & GA4 analytics!" :
                         location.pathname.startsWith("/accounting") ? "Ask me about accounting and finances!" :
                         location.pathname === "/project" ? "Ask me about projects and tasks!" :
                         location.pathname === "/helpdesk" ? "Ask me about support tickets!" :
                         "Ask me anything about your sales data!"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {location.pathname === "/calculator" ? "I can explain formulas, inputs, pricing, and help you understand the calculations." :
                       location.pathname.startsWith("/job-costing") ? "I can analyze variances, predict costs, find anomalies, and compare similar jobs." :
                       isMarketingPage ? "I specialize in GA4 metrics, traffic analysis, SEO, and B2B construction marketing." :
                       location.pathname.startsWith("/accounting") ? "I default to recent/open items but can search historical data on request." :
                       location.pathname === "/project" ? "I default to active tasks but can search completed projects on request." :
                       location.pathname === "/helpdesk" ? "I default to open tickets but can search resolved tickets on request." :
                       "I default to open opportunities but can search historical data on request."}
                    </p>
                    {isMarketingPage && (
                      <>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-foreground">Quick Prompts:</p>
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {MARKETING_PROMPTS.slice(0, 4).map((prompt, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs py-1"
                                onClick={() => handleQuickPrompt(prompt)}
                              >
                                {prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowResources(!showResources)}
                            className="text-xs h-auto py-1 text-primary"
                          >
                            {showResources ? "Hide" : "View"} GA4 Resources & More Prompts
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {messages.length === 0 && showResources && isMarketingPage && (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Quick Prompts:</p>
                    <div className="space-y-1.5">
                      {MARKETING_PROMPTS.map((prompt, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickPrompt(prompt)}
                          className="w-full justify-start text-xs h-auto py-2 text-left font-normal"
                        >
                          <Sparkles className="h-3 w-3 mr-2 shrink-0 text-primary" />
                          <span className="line-clamp-2">{prompt}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">GA4 Resources:</p>
                    <div className="space-y-1.5">
                      {GA4_RESOURCES.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors group"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground group-hover:text-primary">{resource.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>
                            <Badge variant="secondary" className="text-[10px] mt-1">{resource.category}</Badge>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResources(false)}
                    className="w-full text-xs"
                  >
                    Back to Chat
                  </Button>
                </div>
              )}
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSubmit} className="border-t p-4">
              {isMarketingPage && messages.length === 0 && !showResources && (
                <div className="mb-3 flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowResources(true)}
                    className="text-xs h-auto py-1 text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View All Prompts & GA4 Resources
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    location.pathname === "/calculator" ? "Ask about calculator..." :
                    location.pathname.startsWith("/job-costing") ? "Ask about job costs..." :
                    isMarketingPage ? "Ask about marketing & GA4..." :
                    location.pathname.startsWith("/accounting") ? "Ask about accounting..." :
                    location.pathname === "/project" ? "Ask about projects..." :
                    location.pathname === "/helpdesk" ? "Ask about tickets..." :
                    "Ask about sales data..."
                  }
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
