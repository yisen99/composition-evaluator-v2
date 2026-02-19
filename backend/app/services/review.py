import json
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.schemas.review import ReviewAgentName


@dataclass
class AgentReviewResult:
    score: int
    feedback: str
    memory_note: str
    rewrite_suggestions: list[str]
    tags: list[str]


def _normalize_text(text: str | None) -> str:
    return (text or "").strip()


def _has_qwen_key() -> bool:
    token = (settings.qwen_api_key or "").strip()
    return bool(token and not token.startswith("your-"))


def _build_agent_system_prompt(agent_name: ReviewAgentName) -> str:
    role_map = {
        "structure": "你是语文作文结构评审老师，关注开头-主体-结尾组织与段落衔接。",
        "language": "你是语文作文语言评审老师，关注词汇准确、句式变化、细节描写。",
        "value": "你是语文作文立意评审老师，关注主题深度、价值观表达与论证完整性。",
    }
    return (
        role_map[agent_name]
        + "请严格输出 JSON 对象，字段必须为：score, feedback, memory_note, rewrite_suggestions, tags。"
    )


def _call_qwen_agent_review(
    *,
    agent_name: ReviewAgentName,
    title: str,
    prompt: str,
    content_type: str,
    text_content: str | None,
) -> AgentReviewResult | None:
    if not _has_qwen_key():
        return None

    input_excerpt = _normalize_text(text_content)[:1200] if text_content else "(非文本提交)"
    user_prompt = (
        "请针对以下作文提交给出评审：\n"
        f"- 题目: {title}\n"
        f"- 作文要求: {prompt}\n"
        f"- 提交类型: {content_type}\n"
        f"- 内容片段: {input_excerpt}\n"
        "返回 JSON，score 为 0-100 整数；rewrite_suggestions 为 2-4 条可执行改写建议；"
        "tags 为 2-5 个标签。"
    )

    try:
        with httpx.Client(timeout=settings.qwen_timeout_seconds) as client:
            response = client.post(
                f"{settings.qwen_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.qwen_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.qwen_model,
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": _build_agent_system_prompt(agent_name)},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
        response.raise_for_status()
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        score = int(parsed.get("score", 0))
        score = max(0, min(100, score))
        feedback = str(parsed.get("feedback", "")).strip()
        memory_note = str(parsed.get("memory_note", "")).strip()
        suggestions = [str(item).strip() for item in parsed.get("rewrite_suggestions", []) if str(item).strip()]
        tags = [str(item).strip() for item in parsed.get("tags", []) if str(item).strip()]

        if not feedback or not memory_note:
            return None
        if not suggestions:
            suggestions = ["补充一处具体事例，再增强细节描写。"]
        if not tags:
            tags = [f"agent:{agent_name}", f"score:{score}"]

        return AgentReviewResult(
            score=score,
            feedback=feedback,
            memory_note=memory_note,
            rewrite_suggestions=suggestions[:4],
            tags=tags[:5],
        )
    except Exception:
        return None


def _build_fallback_review(
    *,
    agent_name: ReviewAgentName,
    title: str,
    prompt: str,
    content_type: str,
    text_content: str | None,
) -> AgentReviewResult:
    base_scores = {
        "structure": 78,
        "language": 80,
        "value": 82,
    }
    base_score = base_scores[agent_name]
    normalized_text = _normalize_text(text_content)
    length_bonus = min(12, len(normalized_text) // 18) if normalized_text else 0
    type_bonus = 0 if content_type == "text" else 3
    score = min(100, base_score + length_bonus + type_bonus)

    if agent_name == "structure":
        feedback = f"结构评审：围绕《{title}》中心表达清晰，建议增加首尾呼应与段落层次。"
        memory_note = "结构聚焦主题，后续优先补强过渡句和段间衔接。"
        suggestions = [
            "开头先点明场景与情绪，再进入主体。",
            "主体段按“观察-细节-感受”三步展开。",
            "结尾回扣题目并补一句个人反思。",
        ]
    elif agent_name == "language":
        feedback = f"语言评审：表达较自然，建议围绕“{prompt[:16]}”增加动词与细节描写。"
        memory_note = "语言表现稳定，长期建议积累高频好词并减少重复句式。"
        suggestions = [
            "把“很美/很好”替换为具体感官描写。",
            "每段至少加入一个动作动词强化画面。",
            "使用一处短句做情绪停顿，增强节奏。",
        ]
    else:
        feedback = "立意评审：情感方向积极，建议在观点后补一处具体事例增强说服力。"
        memory_note = "立意基础良好，后续重点培养“观点-事例-反思”三段式表达。"
        suggestions = [
            "中心观点后增加一个亲历细节做支撑。",
            "结尾加入一条可执行行动，体现成长。",
            "避免空泛抒情，优先写“我做了什么”。",
        ]

    return AgentReviewResult(
        score=score,
        feedback=feedback,
        memory_note=memory_note,
        rewrite_suggestions=suggestions,
        tags=[f"agent:{agent_name}", f"score:{score}"],
    )


def run_agent_review(
    *,
    agent_name: ReviewAgentName,
    title: str,
    prompt: str,
    content_type: str,
    text_content: str | None,
) -> AgentReviewResult:
    llm_result = _call_qwen_agent_review(
        agent_name=agent_name,
        title=title,
        prompt=prompt,
        content_type=content_type,
        text_content=text_content,
    )
    if llm_result:
        return llm_result
    return _build_fallback_review(
        agent_name=agent_name,
        title=title,
        prompt=prompt,
        content_type=content_type,
        text_content=text_content,
    )


def build_summary_suggestions(*, feedbacks: dict[str, str], prompt: str) -> list[str]:
    suggestions: list[str] = []
    if feedbacks.get("structure"):
        suggestions.append("先重排段落顺序：开头点题，主体分两段，结尾回扣主题。")
    if feedbacks.get("language"):
        suggestions.append("每段补一处“动作+感官”描写，减少抽象形容词。")
    if feedbacks.get("value"):
        suggestions.append("在结尾加入“观点+事例+反思”一句式，强化立意。")
    if not suggestions:
        suggestions.append(f"结合题目要求“{prompt[:18]}”，先补充细节再优化句式。")
    return suggestions[:4]
