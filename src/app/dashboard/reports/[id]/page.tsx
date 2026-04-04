"use client";

import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Globe,
  GraduationCap,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface ProfileSummary {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  education_level?: string;
  field_of_study?: string;
  institution?: string;
  gpa?: string;
  target_countries?: string[];
  course_interest?: string;
  test_type?: string;
  test_score?: string;
  budget_range?: string;
  scholarship_interest?: boolean;
  timeline?: string;
}

interface UniversityRecommendation {
  name: string;
  country: string;
  city: string | null;
  ranking: number | null;
  course: string;
  match_reason: string;
  category: "ambitious" | "target" | "safe";
  tuition: string | null;
  requirements: Record<string, unknown>;
  scholarships: string[];
}

interface GapAnalysis {
  strengths: string[];
  gaps: { category: string; description: string; action_items: string[] }[];
  overall_readiness: number;
}

interface TimelineMilestone {
  month: number;
  title: string;
  description: string;
  type: "test" | "application" | "document" | "visa" | "milestone";
  completed: boolean;
}

interface ConversationHighlight {
  topic: string;
  question: string;
  answer: string;
  relevance: "high" | "medium" | "low";
}

interface NextStep {
  action: string;
  priority: "high" | "medium" | "low";
  deadline: string | null;
  completed: boolean;
}

interface LeadScoreSnapshot {
  intent_score: number;
  financial_score: number;
  timeline_score: number;
  total_score: number;
  classification: string;
}

interface Report {
  id: string;
  conversation_id: string;
  student_name: string | null;
  profile_summary: ProfileSummary;
  university_recommendations: UniversityRecommendation[];
  gap_analysis: GapAnalysis;
  personalized_timeline: TimelineMilestone[];
  conversation_highlights: ConversationHighlight[];
  next_steps: NextStep[];
  lead_score_snapshot: LeadScoreSnapshot;
  sentiment_journey: { turn: number; sentiment: string; confidence: number }[];
  generated_at: string;
  status: "generating" | "ready" | "failed";
  created_at: string;
}

const CATEGORY_COLORS = {
  ambitious: "border-amber-400/50 bg-amber-500/10",
  target: "border-green-400/50 bg-green-500/10",
  safe: "border-blue-400/50 bg-blue-500/10",
};

const CATEGORY_LABELS = {
  ambitious: "Ambitious",
  target: "Target",
  safe: "Safe",
};

const PRIORITY_COLORS = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-green-500",
};

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      setReport(data.report || null);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();

    const channel = supabaseBrowser
      .channel(`report-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reports",
          filter: `id=eq.${id}`,
        },
        () => {
          fetchReport();
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [id, fetchReport]);

  // Inject print-specific CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "report-print-styles";
    style.textContent = `
      @media print {
        /* Hide sidebar, navigation, and interactive elements */
        aside,
        nav,
        header,
        [data-print-hide],
        button,
        a[role="button"],
        [data-radix-portal],
        [role="dialog"] {
          display: none !important;
        }

        /* Reset backgrounds for print */
        body, html, main, [data-report-content] {
          background: white !important;
          color: black !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        /* Make the main content area full width (remove sidebar offset) */
        body > div,
        body > div > div,
        main {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Ensure cards are visible */
        [data-report-content] [class*="card"],
        [data-report-content] [class*="Card"] {
          border: 1px solid #e5e7eb !important;
          background: white !important;
          box-shadow: none !important;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Badge styling for print */
        [data-report-content] [class*="badge"],
        [data-report-content] [class*="Badge"] {
          border: 1px solid #d1d5db !important;
          background: #f9fafb !important;
          color: #374151 !important;
        }

        /* Full width for print */
        [data-report-content] {
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Force page breaks between major sections */
        [data-report-content] > div > div:nth-child(n+3) {
          page-break-before: auto;
        }

        /* Page margins */
        @page {
          margin: 1.5cm;
          size: A4;
        }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;

    return () => {
      style.remove();
    };
  }, []);

  const handleDownloadPDF = () => {
    // Set document title for the PDF filename
    const originalTitle = document.title;
    const studentName = report?.profile_summary
      ? (report.profile_summary as ProfileSummary).name || "Student"
      : "Student";
    document.title = `StudyBuddyAI Report - ${studentName}`;

    // Trigger native browser print dialog (Save as PDF option)
    window.print();

    // Restore title
    document.title = originalTitle;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeader title="Report Not Found" />
        <p className="text-muted-foreground">
          This report does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/conversations")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Conversations
        </Button>
      </div>
    );
  }

  if (report.status === "generating") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Report Generating"
          description="Your report is being generated. This page will update automatically."
        />
        <Card className="border-primary/20 bg-card/80">
          <CardContent className="py-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Generating Your Report
            </h3>
            <p className="text-muted-foreground">
              Please wait while we analyze your session and compile your
              personalized report...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = report.profile_summary as ProfileSummary;
  const leadScore = report.lead_score_snapshot as LeadScoreSnapshot;

  return (
    <div className="space-y-6" data-report-content>
      <PageHeader
        title={`${profile?.name || "Student"} Report`}
        description={`Generated on ${new Date(
          report.generated_at || report.created_at,
        ).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Call History", href: "/dashboard/conversations/history" },
          { label: "Report" },
        ]}
        actions={
          <div className="flex items-center gap-3" data-print-hide>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Link href="/dashboard/conversations/history">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      {/* Lead Score Card */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Lead Score
          </CardTitle>
        </CardHeader>
        <Separator className="bg-border/40" />
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {leadScore?.intent_score || 0}
              </p>
              <p className="text-xs text-muted-foreground">Intent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {leadScore?.financial_score || 0}
              </p>
              <p className="text-xs text-muted-foreground">Financial</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {leadScore?.timeline_score || 0}
              </p>
              <p className="text-xs text-muted-foreground">Timeline</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {leadScore?.total_score?.toFixed(0) || 0}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Badge
              variant="outline"
              className={`gap-1.5 rounded-full ${
                leadScore?.classification === "hot"
                  ? "border-red-400/50 text-red-500"
                  : leadScore?.classification === "warm"
                    ? "border-yellow-400/50 text-yellow-500"
                    : "border-blue-400/50 text-blue-500"
              }`}
            >
              {leadScore?.classification?.toUpperCase() || "COLD"} Lead
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Profile Summary */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Summary
          </CardTitle>
        </CardHeader>
        <Separator className="bg-border/40" />
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {profile?.name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{profile.name}</p>
                </div>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{profile.email}</p>
                </div>
              </div>
            )}
            {profile?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
            {profile?.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{profile.location}</p>
                </div>
              </div>
            )}
            {profile?.education_level && (
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Education</p>
                  <p className="text-sm font-medium">
                    {profile.education_level}
                  </p>
                </div>
              </div>
            )}
            {profile?.field_of_study && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Field</p>
                  <p className="text-sm font-medium">
                    {profile.field_of_study}
                  </p>
                </div>
              </div>
            )}
            {profile?.target_countries &&
              profile.target_countries.length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Countries</p>
                    <p className="text-sm font-medium">
                      {profile.target_countries.join(", ")}
                    </p>
                  </div>
                </div>
              )}
            {profile?.budget_range && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm font-medium">{profile.budget_range}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* University Recommendations */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            University Recommendations
          </CardTitle>
        </CardHeader>
        <Separator className="bg-border/40" />
        <CardContent className="pt-4 space-y-4">
          {(
            report.university_recommendations as UniversityRecommendation[]
          ).map((uni, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border ${CATEGORY_COLORS[uni.category as keyof typeof CATEGORY_COLORS]}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{uni.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      #{uni.ranking}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {uni.city}, {uni.country}
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Course:</strong> {uni.course}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {uni.match_reason}
                  </p>
                </div>
                <Badge className="text-xs">
                  {
                    CATEGORY_LABELS[
                      uni.category as keyof typeof CATEGORY_LABELS
                    ]
                  }
                </Badge>
              </div>
              {uni.tuition && (
                <p className="text-sm mt-2">
                  <strong>Tuition:</strong> {uni.tuition}
                </p>
              )}
              {uni.scholarships && uni.scholarships.length > 0 && (
                <p className="text-sm mt-2 text-muted-foreground">
                  <strong>Scholarships:</strong> {uni.scholarships.join(", ")}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {(report.gap_analysis as GapAnalysis)?.strengths?.length > 0 && (
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Gap Analysis
            </CardTitle>
          </CardHeader>
          <Separator className="bg-border/40" />
          <CardContent className="pt-4 space-y-4">
            <div>
              <h4 className="font-medium mb-2">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {(report.gap_analysis as GapAnalysis).strengths.map((s, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-green-500/10 border-green-400/30"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            {(report.gap_analysis as GapAnalysis).gaps?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Areas to Improve</h4>
                <div className="space-y-3">
                  {(report.gap_analysis as GapAnalysis).gaps.map((gap, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm">{gap.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {gap.description}
                      </p>
                      {gap.action_items?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {gap.action_items.map((item, j) => (
                            <Badge
                              key={j}
                              variant="outline"
                              className="text-xs"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {(report.personalized_timeline as TimelineMilestone[])?.length > 0 && (
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Personalized Timeline
            </CardTitle>
          </CardHeader>
          <Separator className="bg-border/40" />
          <CardContent className="pt-4">
            <div className="space-y-4">
              {(report.personalized_timeline as TimelineMilestone[]).map(
                (milestone, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          milestone.completed ? "bg-green-500" : "bg-primary"
                        }`}
                      />
                      {i <
                        (report.personalized_timeline as TimelineMilestone[])
                          .length -
                          1 && (
                        <div className="w-0.5 h-full bg-border flex-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{milestone.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {milestone.month} months
                        </Badge>
                        {milestone.completed && (
                          <Badge className="bg-green-500/10 text-green-500 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {(report.next_steps as NextStep[])?.length > 0 && (
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <Separator className="bg-border/40" />
          <CardContent className="pt-4 space-y-3">
            {(report.next_steps as NextStep[]).map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <CheckCircle
                  className={`w-5 h-5 mt-0.5 ${PRIORITY_COLORS[step.priority as keyof typeof PRIORITY_COLORS]}`}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.action}</p>
                  {step.deadline && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Deadline: {step.deadline}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${PRIORITY_COLORS[step.priority as keyof typeof PRIORITY_COLORS]}`}
                >
                  {step.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Conversation Highlights */}
      {(report.conversation_highlights as ConversationHighlight[])?.length >
        0 && (
        <Card className="border-border/40 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Conversation Highlights
            </CardTitle>
          </CardHeader>
          <Separator className="bg-border/40" />
          <CardContent className="pt-4 space-y-3">
            {(report.conversation_highlights as ConversationHighlight[]).map(
              (highlight, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        highlight.relevance === "high"
                          ? "border-red-400/50 text-red-500"
                          : highlight.relevance === "medium"
                            ? "border-yellow-400/50 text-yellow-500"
                            : "border-blue-400/50 text-blue-500"
                      }`}
                    >
                      {highlight.relevance}
                    </Badge>
                    <span className="font-medium text-sm">
                      {highlight.topic}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Q:</strong> {highlight.question}
                  </p>
                  <p className="text-sm">
                    <strong>A:</strong> {highlight.answer}
                  </p>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
