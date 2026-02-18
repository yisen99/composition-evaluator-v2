from app.schemas.review import ReviewAgentName


def _normalize_text(text: str | None) -> str:
    return (text or "").strip()


def build_agent_review(
    *,
    agent_name: ReviewAgentName,
    title: str,
    prompt: str,
    content_type: str,
    text_content: str | None,
) -> tuple[int, str, str]:
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
        feedback = f"结构评审：围绕《{title}》的中心表达清晰，建议增加首尾呼应与段落层次。"
        memory_note = "结构上能聚焦主题，后续训练优先补强过渡句与段间衔接。"
    elif agent_name == "language":
        feedback = f"语言评审：表达较自然，建议结合题目“{prompt[:16]}”增加更具体的动词与细节描写。"
        memory_note = "语言表现稳定，长期建议积累高频好词并减少重复句式。"
    else:
        feedback = "立意评审：情感方向积极，建议在观点后补充一处具体事例来增强说服力。"
        memory_note = "立意基础良好，后续重点培养“观点-事例-反思”三段式表达。"

    return score, feedback, memory_note
