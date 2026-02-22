import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export type AgentStyle = 'standard' | 'peach' | 'strict' | 'encouraging';

const STYLE_PROMPTS: Record<AgentStyle, string> = {
  standard: "作为一名专业的语文老师，提供客观、中肯的批改建议。",
  peach: "作为'桃子老师'，你的风格是活泼、亲切、充满想象力的。你会用更多鼓励性的语言，并从文学美感的角度给予学生启发，像大姐姐一样交流。",
  strict: "作为一名严厉的特级教师，你对字词句的要求极高，注重逻辑严密性和修辞的精准度，指出每一个细微的错误。",
  encouraging: "作为一名温柔的启蒙老师，你善于发现学生微小的闪光点，通过正向激励培养学生的写作兴趣。"
};

export const analyzeComposition = async (params: {
  content: string;
  title: string;
  style: AgentStyle;
  studentMemory: string;
  region: string;
}) => {
  const { content, title, style, studentMemory, region } = params;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你现在是一个多智能体协同批改系统。
      
      【当前角色设定】
      ${STYLE_PROMPTS[style]}
      
      【学生长期记忆（成长背景）】
      ${studentMemory}
      
      【地区作文要求】
      ${region} 地区的教学大纲与考纲要求。
      
      【批改任务】
      题目：${title}
      正文：${content}
      
      请结合学生的历史情况（长期记忆）和地区要求，以选定的老师风格进行深度批改。
      如果学生在长期记忆中提到的弱点有所改进，请务必重点表扬。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            detailedFeedback: { type: Type.STRING },
            memoryUpdate: { 
              type: Type.STRING, 
              description: "根据本次作文表现，更新学生的长期记忆（简明扼要，记录进步与新发现的问题）" 
            }
          },
          required: ["score", "pros", "cons", "detailedFeedback", "memoryUpdate"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
};

export const extractContentFromMedia = async (base64Data: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: "请提取并转录这张图片或文档中的作文文本内容。保持原有的段落结构，不要包含任何解释性文字，只输出作文正文。"
        }
      ]
    });
    return response.text;
  } catch (error) {
    console.error("Media Extraction Error:", error);
    return null;
  }
};
