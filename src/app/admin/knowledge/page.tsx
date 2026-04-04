"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import {
	BookOpen,
	Upload,
	Trash2,
	FileText,
	Plus,
	Layers,
	Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface KnowledgeDoc {
	id: string;
	title: string;
	category: string;
	chunk_count: number;
	created_at: string;
}

export default function KnowledgeBasePage() {
	const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [dialogOpen, setDialogOpen] = useState(false);

	// Upload form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [category, setCategory] = useState("general");

	const fetchDocs = useCallback(async () => {
		try {
			const res = await fetch("/api/knowledge");
			const data = await res.json();
			setDocs(data.documents || []);
		} catch (error) {
			console.error("Failed to fetch docs:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchDocs();
	}, [fetchDocs]);

	const handleUpload = async () => {
		if (!title.trim() || !content.trim()) {
			toast.error("Title and content are required");
			return;
		}

		setUploading(true);
		setUploadProgress(20);

		try {
			setUploadProgress(40);
			const res = await fetch("/api/knowledge/upload", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, content, category }),
			});

			setUploadProgress(80);
			const data = await res.json();

			if (data.success) {
				setUploadProgress(100);
				toast.success(
					`Uploaded "${title}" — ${data.chunksCreated} chunks created`,
				);
				setTitle("");
				setContent("");
				setCategory("general");
				setDialogOpen(false);
				fetchDocs();
			} else {
				toast.error(data.error || "Upload failed");
			}
		} catch (error) {
			toast.error("Failed to upload document");
			console.error(error);
		} finally {
			setUploading(false);
			setUploadProgress(0);
		}
	};

	const handleDelete = async (id: string, docTitle: string) => {
		try {
			const res = await fetch(`/api/knowledge/${id}`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (data.success) {
				toast.success(`Deleted "${docTitle}"`);
				fetchDocs();
			} else {
				toast.error("Failed to delete document");
			}
		} catch (error) {
			toast.error("Failed to delete document");
			console.error(error);
		}
	};

	return (
		<div className="space-y-6">
			<PageHeader
				title="Knowledge Base"
				description="Manage documents that power the AI counsellor's knowledge"
				breadcrumbs={[
					{ label: "Admin", href: "/admin" },
					{ label: "Knowledge Base" },
				]}
				actions={
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button className="rounded-full gap-2">
								<Plus className="w-4 h-4" />
								Add Document
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-lg">
							<DialogHeader>
								<DialogTitle className="text-foreground">
									Upload Knowledge Document
								</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 mt-4">
								<div className="space-y-2">
									<Label htmlFor="doc-title">Title</Label>
									<Input
										id="doc-title"
										placeholder="e.g. UK Visa Requirements 2025"
										value={title}
										onChange={(e) =>
											setTitle(e.target.value)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="doc-category">
										Category
									</Label>
									<Select
										value={category}
										onValueChange={setCategory}
									>
										<SelectTrigger id="doc-category">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="general">
												General
											</SelectItem>
											<SelectItem value="universities">
												Universities
											</SelectItem>
											<SelectItem value="visa">
												Visa Information
											</SelectItem>
											<SelectItem value="scholarships">
												Scholarships
											</SelectItem>
											<SelectItem value="tests">
												Test Preparation
											</SelectItem>
											<SelectItem value="faq">
												FAQ
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="doc-content">
										Content
									</Label>
									<Textarea
										id="doc-content"
										placeholder="Paste the document content here..."
										rows={10}
										value={content}
										onChange={(e) =>
											setContent(e.target.value)
										}
									/>
								</div>

								{uploading && (
									<div className="space-y-2">
										<Progress
											value={uploadProgress}
											className="h-2"
										/>
										<p className="text-xs text-muted-foreground text-center">
											Chunking, embedding, and
											storing...
										</p>
									</div>
								)}

								<Button
									onClick={handleUpload}
									disabled={uploading}
									className="w-full rounded-full gap-2"
								>
									{uploading ? (
										<>Processing...</>
									) : (
										<>
											<Upload className="w-4 h-4" />
											Upload & Embed
										</>
									)}
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				}
			/>

			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-36 rounded-xl" />
					))}
				</div>
			) : docs.length === 0 ? (
				<EmptyState
					icon={BookOpen}
					title="No documents uploaded"
					description="Upload university guides, visa information, or FAQ documents to power the AI counsellor."
					actionLabel="Add Document"
					onAction={() => setDialogOpen(true)}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{docs.map((doc, i) => (
						<Card
							key={doc.id}
							className="border-primary/10 bg-card/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
							style={{ animationDelay: `${i * 80}ms` }}
						>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-2.5 min-w-0">
										<div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
											<FileText className="w-4.5 h-4.5 text-primary" />
										</div>
										<CardTitle className="text-sm font-semibold text-foreground truncate">
											{doc.title}
										</CardTitle>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
										onClick={() =>
											handleDelete(doc.id, doc.title)
										}
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Layers className="w-3.5 h-3.5" />
									<span>{doc.chunk_count} chunks</span>
								</div>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<BookOpen className="w-3.5 h-3.5" />
									<span className="capitalize">
										{doc.category}
									</span>
								</div>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Calendar className="w-3.5 h-3.5" />
									<span>
										{new Date(
											doc.created_at,
										).toLocaleDateString()}
									</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
