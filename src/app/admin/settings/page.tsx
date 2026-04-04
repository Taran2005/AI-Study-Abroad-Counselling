"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/page-header";
import { Save, Loader2, Check, Mail, MessageSquare, Bell } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
	// Lead scoring weights
	const [intentWeight, setIntentWeight] = useState(40);
	const [financialWeight, setFinancialWeight] = useState(30);
	const [timelineWeight, setTimelineWeight] = useState(30);

	// Notification toggles
	const [emailNotify, setEmailNotify] = useState(true);
	const [whatsappNotify, setWhatsappNotify] = useState(false);
	const [hotLeadAlert, setHotLeadAlert] = useState(true);

	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const totalWeight = intentWeight + financialWeight + timelineWeight;

	const handleSave = async () => {
		if (totalWeight !== 100) {
			toast.error("Weights must sum to 100%");
			return;
		}
		setSaving(true);
		// Simulate save
		await new Promise((r) => setTimeout(r, 1000));
		setSaving(false);
		setSaved(true);
		toast.success("Settings saved successfully");
		setTimeout(() => setSaved(false), 2000);
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Settings"
				description="Configure lead scoring weights and notification preferences"
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Settings" },
				]}
				actions={
					<Button
						onClick={handleSave}
						disabled={saving || totalWeight !== 100}
						className="rounded-full gap-2"
					>
						{saving ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Saving...
							</>
						) : saved ? (
							<>
								<Check className="w-4 h-4" />
								Saved
							</>
						) : (
							<>
								<Save className="w-4 h-4" />
								Save Changes
							</>
						)}
					</Button>
				}
			/>

			{/* Lead Scoring Weights */}
			<Card className="border-primary/10 bg-card/80">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-semibold text-foreground">
							Lead Scoring Weights
						</CardTitle>
						<Badge
							variant="outline"
							className={`rounded-full text-xs ${
								totalWeight === 100
									? "border-primary/25 text-primary"
									: "border-destructive/25 text-destructive"
							}`}
						>
							Total: {totalWeight}%{" "}
							{totalWeight === 100 ? "✓" : "— must be 100%"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-8">
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-medium text-foreground">
								Intent Seriousness
							</Label>
							<span className="text-sm font-semibold text-primary">
								{intentWeight}%
							</span>
						</div>
						<Slider
							value={[intentWeight]}
							onValueChange={(v) => setIntentWeight(v[0])}
							max={100}
							step={5}
							className="w-full"
						/>
						<p className="text-xs text-muted-foreground">
							How clear and specific are the student&apos;s goals?
						</p>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-medium text-foreground">
								Financial Readiness
							</Label>
							<span className="text-sm font-semibold text-primary">
								{financialWeight}%
							</span>
						</div>
						<Slider
							value={[financialWeight]}
							onValueChange={(v) =>
								setFinancialWeight(v[0])
							}
							max={100}
							step={5}
							className="w-full"
						/>
						<p className="text-xs text-muted-foreground">
							Is the student financially prepared or aware of
							costs?
						</p>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-medium text-foreground">
								Timeline Urgency
							</Label>
							<span className="text-sm font-semibold text-primary">
								{timelineWeight}%
							</span>
						</div>
						<Slider
							value={[timelineWeight]}
							onValueChange={(v) =>
								setTimelineWeight(v[0])
							}
							max={100}
							step={5}
							className="w-full"
						/>
						<p className="text-xs text-muted-foreground">
							How urgently is the student planning to apply?
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Notification Settings */}
			<Card className="border-primary/10 bg-card/80">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold text-foreground">
						Notifications
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
								<Mail className="w-4.5 h-4.5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									Email Notifications
								</p>
								<p className="text-xs text-muted-foreground">
									Get email alerts for new leads
								</p>
							</div>
						</div>
						<Switch
							checked={emailNotify}
							onCheckedChange={setEmailNotify}
						/>
					</div>

					<Separator className="bg-border/60" />

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
								<MessageSquare className="w-4.5 h-4.5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									WhatsApp Notifications
								</p>
								<p className="text-xs text-muted-foreground">
									Send lead summaries to WhatsApp
								</p>
							</div>
						</div>
						<Switch
							checked={whatsappNotify}
							onCheckedChange={setWhatsappNotify}
						/>
					</div>

					<Separator className="bg-border/60" />

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
								<Bell className="w-4.5 h-4.5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									Hot Lead Alerts
								</p>
								<p className="text-xs text-muted-foreground">
									Immediate alert when a hot lead is detected
								</p>
							</div>
						</div>
						<Switch
							checked={hotLeadAlert}
							onCheckedChange={setHotLeadAlert}
						/>
					</div>
				</CardContent>
			</Card>

			{/* System Info */}
			<Card className="border-primary/10 bg-card/80">
				<CardHeader className="pb-3">
					<CardTitle className="text-base font-semibold text-foreground">
						System Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-muted-foreground">
								Agent Version
							</p>
							<p className="font-medium text-foreground">
								StudyBuddyAI v0.1.0
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">LLM Model</p>
							<p className="font-medium text-foreground">
								GPT-4o
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">
								TTS Engine
							</p>
							<p className="font-medium text-foreground">
								ElevenLabs Multilingual v2
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">
								STT Engine
							</p>
							<p className="font-medium text-foreground">
								Deepgram Nova-3
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
