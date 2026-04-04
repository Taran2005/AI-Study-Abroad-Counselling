"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	FileUp,
	X,
	CheckCircle2,
	AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface KnowledgeDoc {
	id: string;
	title: string;
	category: string;
	chunk_count: number;
	created_at: string;
}

const CATEGORIES = [
	{ value: "general", label: "General" },
	{ value: "universities", label: "Universities" },
	{ value: "visa", label: "Visa Information" },
	{ value: "scholarships", label: "Scholarships" },
	{ value: "tests", label: "Test Preparation" },
	{ value: "faq", label: "FAQ" },
	{ value: "costs", label: "Costs & Fees" },
];

function getCategoryColor(cat: string) {
	const map: Record<string, string> = {
		universities: "bg-primary/10 text-primary border-primary/20",
		visa: "bg-chart-1/10 text-chart-1 border-chart-1/20",
		scholarships: "bg-chart-4/10 text-chart-4 border-chart-4/20",
		tests: "bg-chart-2/10 text-chart-2 border-chart-2/20",
		faq: "bg-chart-3/10 text-chart-3 border-chart-3/20",
		costs: "bg-chart-5/10 text-chart-5 border-chart-5/20",
	};
	return map[cat] || "bg-muted text-muted-foreground border-border";
}

export default function KnowledgeBasePage() {
	const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [dialogOpen, setDialogOpen] = useState(false);

	// Text upload form state
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [category, setCategory] = useState("general");

	// File upload state
	const [dragActive, setDragActive] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [fileTitle, setFileTitle] = useState("");
	const [fileCategory, setFileCategory] = useState("general");
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	// ── Text upload handler ──
	const handleTextUpload = async () => {
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

	// ── File upload handler ──
	const handleFileUpload = async () => {
		if (!selectedFile) {
			toast.error("Please select a file first");
			return;
		}

		setUploading(true);
		setUploadProgress(15);

		try {
			const formData = new FormData();
			formData.append("file", selectedFile);
			if (fileTitle.trim()) formData.append("title", fileTitle);
			formData.append("category", fileCategory);

			setUploadProgress(30);

			const res = await fetch("/api/knowledge/upload-file", {
				method: "POST",
				body: formData,
			});

			setUploadProgress(80);
			const data = await res.json();

			if (data.success) {
				setUploadProgress(100);
				toast.success(
					`Uploaded "${data.title}" — ${data.chunksCreated} chunks created`,
				);
				setSelectedFile(null);
				setFileTitle("");
				setFileCategory("general");
				setDialogOpen(false);
				fetchDocs();
			} else {
				toast.error(data.error || "File upload failed");
			}
		} catch (error) {
			toast.error("Failed to upload file");
			console.error(error);
		} finally {
			setUploading(false);
			setUploadProgress(0);
		}
	};

	// ── Drag & Drop handlers ──
	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			const file = e.dataTransfer.files[0];
			validateAndSetFile(file);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			validateAndSetFile(e.target.files[0]);
		}
	};

	const validateAndSetFile = (file: File) => {
		const validTypes = [
			"application/pdf",
			"text/plain",
			"text/markdown",
		];
		const validExtensions = [".pdf", ".txt", ".md"];
		const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

		if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
			toast.error("Unsupported file type. Use PDF, TXT, or MD files.");
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			toast.error("File too large. Maximum size is 10 MB.");
			return;
		}

		setSelectedFile(file);
		if (!fileTitle) {
			setFileTitle(file.name.replace(/\.(pdf|txt|md)$/i, ""));
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

	function formatFileSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

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
						<DialogContent className="sm:max-w-xl">
							<DialogHeader>
								<DialogTitle className="text-foreground">
									Upload Knowledge Document
								</DialogTitle>
							</DialogHeader>

							<Tabs defaultValue="file" className="mt-4">
								<TabsList className="w-full">
									<TabsTrigger value="file" className="flex-1 gap-1.5">
										<FileUp className="w-3.5 h-3.5" />
										Upload File
									</TabsTrigger>
									<TabsTrigger value="text" className="flex-1 gap-1.5">
										<FileText className="w-3.5 h-3.5" />
										Paste Text
									</TabsTrigger>
								</TabsList>

								{/* ── File Upload Tab ── */}
								<TabsContent value="file" className="space-y-4 mt-4">
									{/* Drop Zone */}
									<div
										className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
											dragActive
												? "border-primary bg-primary/5 scale-[1.01]"
												: selectedFile
													? "border-primary/30 bg-primary/5"
													: "border-border hover:border-primary/40 hover:bg-accent/30"
										}`}
										onDragEnter={handleDrag}
										onDragOver={handleDrag}
										onDragLeave={handleDrag}
										onDrop={handleDrop}
										onClick={() => fileInputRef.current?.click()}
									>
										<input
											ref={fileInputRef}
											type="file"
											accept=".pdf,.txt,.md"
											className="hidden"
											onChange={handleFileSelect}
										/>

										{selectedFile ? (
											<div className="flex flex-col items-center gap-3">
												<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
													<CheckCircle2 className="w-6 h-6 text-primary" />
												</div>
												<div>
													<p className="text-sm font-semibold text-foreground">
														{selectedFile.name}
													</p>
													<p className="text-xs text-muted-foreground mt-0.5">
														{formatFileSize(selectedFile.size)}
													</p>
												</div>
												<Button
													variant="ghost"
													size="sm"
													className="text-xs text-muted-foreground hover:text-destructive"
													onClick={(e) => {
														e.stopPropagation();
														setSelectedFile(null);
														setFileTitle("");
													}}
												>
													<X className="w-3 h-3 mr-1" />
													Remove
												</Button>
											</div>
										) : (
											<div className="flex flex-col items-center gap-3">
												<div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
													<Upload className="w-6 h-6 text-muted-foreground" />
												</div>
												<div>
													<p className="text-sm font-medium text-foreground">
														Drag & drop your file here
													</p>
													<p className="text-xs text-muted-foreground mt-0.5">
														or click to browse • PDF, TXT, MD (max 10 MB)
													</p>
												</div>
											</div>
										)}
									</div>

									{selectedFile && (
										<>
											<div className="space-y-2">
												<Label htmlFor="file-title">
													Document Title
												</Label>
												<Input
													id="file-title"
													placeholder="e.g. UK Visa Requirements 2025"
													value={fileTitle}
													onChange={(e) =>
														setFileTitle(e.target.value)
													}
												/>
											</div>

											<div className="space-y-2">
												<Label htmlFor="file-category">
													Category
												</Label>
												<Select
													value={fileCategory}
													onValueChange={setFileCategory}
												>
													<SelectTrigger id="file-category">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{CATEGORIES.map((c) => (
															<SelectItem key={c.value} value={c.value}>
																{c.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</>
									)}

									{uploading && (
										<div className="space-y-2">
											<Progress
												value={uploadProgress}
												className="h-2"
											/>
											<p className="text-xs text-muted-foreground text-center">
												Extracting text, chunking, embedding, and
												storing...
											</p>
										</div>
									)}

									<Button
										onClick={handleFileUpload}
										disabled={uploading || !selectedFile}
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
								</TabsContent>

								{/* ── Text Paste Tab ── */}
								<TabsContent value="text" className="space-y-4 mt-4">
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
												{CATEGORIES.map((c) => (
													<SelectItem key={c.value} value={c.value}>
														{c.label}
													</SelectItem>
												))}
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
										onClick={handleTextUpload}
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
								</TabsContent>
							</Tabs>
						</DialogContent>
					</Dialog>
				}
			/>

			{/* Stats Bar */}
			{!loading && docs.length > 0 && (
				<div className="flex items-center gap-3 flex-wrap">
					<Badge
						variant="outline"
						className="rounded-full gap-1.5 border-border text-muted-foreground px-3 py-1"
					>
						<FileText className="w-3.5 h-3.5" />
						{docs.length} documents
					</Badge>
					<Badge
						variant="outline"
						className="rounded-full gap-1.5 border-border text-muted-foreground px-3 py-1"
					>
						<Layers className="w-3.5 h-3.5" />
						{docs.reduce((sum, d) => sum + d.chunk_count, 0)} total chunks
					</Badge>
				</div>
			)}

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
								<div className="flex items-center gap-2 text-xs">
									<Badge
										variant="outline"
										className={`text-[10px] rounded-full px-2 py-0 capitalize ${getCategoryColor(doc.category)}`}
									>
										{doc.category}
									</Badge>
								</div>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Calendar className="w-3.5 h-3.5" />
									<span>
										{new Date(doc.created_at).toLocaleDateString()}
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
