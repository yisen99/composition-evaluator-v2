"use client";

import type { TeacherSubmissionDetail } from "@/lib/api/types";

interface SubmissionViewProps {
  submission: TeacherSubmissionDetail;
}

export function SubmissionView({ submission }: SubmissionViewProps) {
  const wordCount = submission.text_content ? submission.text_content.length : 0;

  return (
    <div className="paper-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-900">作文内容</h2>
        <span className="seal-chip text-xs">
          {submission.content_type === "text" ? "文本" : submission.content_type === "image" ? "图片" : "文档"}
        </span>
      </div>

      <div className="mb-4 space-y-2 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <div>
            <span className="font-medium">学生姓名：</span>
            <span>{submission.student_name}</span>
          </div>
          <div>
            <span className="font-medium">学号：</span>
            <span className="text-xs">{submission.student_id}</span>
          </div>
        </div>

        <div className="text-sm text-slate-700">
          <span className="font-medium">提交时间：</span>
          <span>{new Date(submission.created_at).toLocaleString("zh-CN")}</span>
        </div>

        <div className="text-sm text-slate-700">
          <span className="font-medium">字数统计：</span>
          <span>{wordCount} 字</span>
        </div>
      </div>

      {submission.content_type === "text" && submission.text_content ? (
        <div className="prose prose-slate max-w-none">
          <h3 className="text-lg font-medium text-slate-900">作文正文</h3>
          <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {submission.text_content}
          </div>
        </div>
      ) : submission.content_type === "image" && submission.file_url ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">图片附件</p>
          <img
            src={submission.file_url}
            alt="学生提交的作文图片"
            className="max-h-[600px] rounded-lg border border-slate-200 object-contain"
          />
        </div>
      ) : submission.content_type === "document" && submission.file_url ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">文档附件</p>
          <a
            href={submission.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 underline hover:text-blue-800"
          >
            点击查看文档
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">暂无内容</p>
        </div>
      )}
    </div>
  );
}
