import type { SubmissionContentType } from "@/lib/api/types";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const DOCUMENT_EXTENSIONS = new Set(["doc", "docx", "pdf", "txt", "md"]);

export const MAX_SUBMISSION_FILE_BYTES = 10 * 1024 * 1024;

type ValidateSubmissionInput = {
  submissionType: SubmissionContentType;
  textContent: string;
  uploadFile: File | null;
};

function fileExtension(fileName: string): string {
  const normalized = fileName.toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex + 1) : "";
}

export function validateSubmissionDraft(input: ValidateSubmissionInput): string | null {
  if (input.submissionType === "text") {
    if (!input.textContent.trim()) {
      return "文本内容不能为空。";
    }
    return null;
  }

  if (!input.uploadFile) {
    return "图片/文档提交需要先选择文件。";
  }

  if (input.uploadFile.size > MAX_SUBMISSION_FILE_BYTES) {
    return "文件过大，最大支持 10MB。";
  }

  const extension = fileExtension(input.uploadFile.name);
  if (input.submissionType === "image" && !IMAGE_EXTENSIONS.has(extension)) {
    return "图片格式仅支持：jpg / jpeg / png / webp / gif。";
  }
  if (input.submissionType === "document" && !DOCUMENT_EXTENSIONS.has(extension)) {
    return "文档格式仅支持：doc / docx / pdf / txt / md。";
  }

  return null;
}
