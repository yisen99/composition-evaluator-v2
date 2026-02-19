import { describe, expect, it } from "vitest";
import { MAX_SUBMISSION_FILE_BYTES, validateSubmissionDraft } from "@/lib/submission/validation";

describe("submission validation", () => {
  it("rejects empty text submission", () => {
    const error = validateSubmissionDraft({
      submissionType: "text",
      textContent: "   ",
      uploadFile: null
    });
    expect(error).toBe("文本内容不能为空。");
  });

  it("rejects invalid image extension", () => {
    const file = new File(["pdf"], "bad.pdf", { type: "application/pdf" });
    const error = validateSubmissionDraft({
      submissionType: "image",
      textContent: "",
      uploadFile: file
    });
    expect(error).toBe("图片格式仅支持：jpg / jpeg / png / webp / gif。");
  });

  it("rejects oversize file", () => {
    const bytes = new Uint8Array(MAX_SUBMISSION_FILE_BYTES + 1);
    const file = new File([bytes], "essay.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const error = validateSubmissionDraft({
      submissionType: "document",
      textContent: "",
      uploadFile: file
    });
    expect(error).toContain("文件过大");
  });

  it("passes valid document", () => {
    const file = new File(["ok"], "essay.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const error = validateSubmissionDraft({
      submissionType: "document",
      textContent: "",
      uploadFile: file
    });
    expect(error).toBeNull();
  });
});
