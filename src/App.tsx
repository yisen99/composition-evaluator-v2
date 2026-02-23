import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  FileText,
  Send,
  UserCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Task, Submission } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Sidebar = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const navigate = useNavigate();
  const isTeacher = user.role === 'teacher';

  const menuItems = isTeacher ? [
    { icon: LayoutDashboard, label: '任务中心', path: '/teacher' },
    { icon: BookOpen, label: '班级管理', path: '/teacher/classes' },
    { icon: TrendingUp, label: '运营看板', path: '/teacher/stats' },
  ] : [
    { icon: LayoutDashboard, label: '我的工作台', path: '/student' },
    { icon: TrendingUp, label: '成长轨迹', path: '/student/growth' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0">
      <div className="p-6 border-bottom">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          <BookOpen className="w-8 h-8" />
          <span>作文协同台</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500">{isTeacher ? '教师' : '学生'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">退出登录</span>
        </button>
      </div>
    </div>
  );
};

// --- Pages ---

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [method, setMethod] = useState<'password' | 'phone' | 'wechat'>('phone');
  const [tempUser, setTempUser] = useState<User | null>(null);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  
  // Profile states
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [region, setRegion] = useState('');
  const [grade, setGrade] = useState('');
  
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone) return alert('请输入手机号');
    await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    setCountdown(60);
    alert('验证码已发送，请查看控制台日志');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let url = '/api/login';
    let body: any = { username, password };

    if (method === 'phone') {
      url = '/api/auth/phone-login';
      body = { phone, code };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const user = await res.json();
        if (user.isNewUser) {
          setTempUser(user);
        } else {
          onLogin(user);
        }
      } else {
        const data = await res.json();
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('连接服务器失败');
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUser) return;
    
    try {
      const res = await fetch(`/api/users/${tempUser.id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, region, grade }),
      });
      if (res.ok) {
        onLogin({ ...tempUser, name, role, region, grade, isNewUser: false });
      } else {
        setError('完善信息失败');
      }
    } catch (err) {
      setError('连接服务器失败');
    }
  };

  if (tempUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4">
              <UserCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">完善个人信息</h1>
            <p className="text-slate-500 mt-2">首次登录，请告诉我们更多关于您的信息</p>
          </div>

          <form onSubmit={handleCompleteProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">真实姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="请输入姓名"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">身份选择</label>
              <div className="flex gap-3">
                {(['student', 'teacher'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border font-bold text-sm transition-all",
                      role === r ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {r === 'student' ? '学生' : '老师'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">地区</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="例如：江苏、北京"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">年级</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              >
                <option value="">请选择年级</option>
                {['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              进入系统
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">欢迎回来</h1>
          <p className="text-slate-500 mt-2">请登录您的语文作文协同台账号</p>
        </div>

        <div className="flex gap-4 mb-8 border-b border-slate-100">
          {(['phone', 'password', 'wechat'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative",
                method === m ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {m === 'password' ? '密码登录' : m === 'phone' ? '手机登录' : '微信登录'}
              {method === m && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {method === 'password' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </>
          ) : method === 'phone' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">手机号</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="请输入手机号"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="6位验证码"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="px-4 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 disabled:opacity-50"
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="bg-slate-50 p-4 rounded-2xl inline-block mb-4 border border-slate-100">
                <img src="https://picsum.photos/180/180?random=wechat" alt="WeChat QR" className="rounded-lg" />
              </div>
              <p className="text-sm text-slate-500">请使用微信扫码登录</p>
              <p className="text-xs text-slate-400 mt-2">（演示环境：扫码后将自动模拟登录）</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          
          {method !== 'wechat' && (
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
            >
              登录系统
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">未注册手机号验证后将自动创建账号</p>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard = ({ user }: { user: User }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await fetch(`/api/teacher/tasks?teacherId=${user.id}`);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  };

  const getPriorityTasks = () => {
    const now = new Date();
    return tasks.filter(t => {
      const deadline = new Date(t.deadline);
      const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff < 3 && diff > 0;
    });
  };

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">任务中心</h1>
          <p className="text-slate-500 mt-1">管理您的作文任务与批改进度</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          <Plus className="w-5 h-5" />
          发布新任务
        </button>
      </header>

      {/* Priority Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">P0</span>
          </div>
          <p className="text-slate-500 text-sm">临近截止</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{getPriorityTasks().length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">P1</span>
          </div>
          <p className="text-slate-500 text-sm">待回复反馈</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">3</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">P2</span>
          </div>
          <p className="text-slate-500 text-sm">待批改</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {tasks.reduce((acc, t) => acc + (t.submission_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">无提交任务</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">0</p>
        </div>
      </section>

      {/* Task List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">全部任务</h2>
          <div className="flex gap-2">
            <button className="text-sm text-slate-500 hover:text-indigo-600 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors">批量提醒</button>
            <button className="text-sm text-slate-500 hover:text-indigo-600 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors">批量归档</button>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.map((task) => (
            <Link 
              key={task.id} 
              to={`/teacher/tasks/${task.id}`}
              className="flex items-center p-6 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    task.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {task.status === 'published' ? '进行中' : '草稿'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
              </div>
              <div className="flex items-center gap-12 text-right">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">提交进度</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {task.submission_count} / {task.total_students}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">截止日期</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{task.deadline}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const TeacherTaskDetail = ({ user }: { user: User }) => {
  const { id } = (window as any).location.pathname.split('/').pop(); // Simple hack for demo
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const taskId = window.location.pathname.split('/').pop();
    fetch(`/api/tasks/${taskId}/submissions`)
      .then(res => res.json())
      .then(data => {
        setSubmissions(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <Link to="/teacher" className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-4">
          <ChevronRight className="w-4 h-4 rotate-180" />
          返回任务中心
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">提交详情</h1>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {submissions.map((sub) => (
          <div key={sub.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                {sub.student_name[0]}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{sub.student_name}</h3>
                <p className="text-sm text-slate-500">提交于 {new Date(sub.submitted_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">状态</p>
                <span className={cn(
                  "text-xs font-bold mt-1 inline-block",
                  sub.status === 'corrected' ? "text-emerald-600" : "text-orange-600"
                )}>
                  {sub.status === 'corrected' ? '已批改' : '待批改'}
                </span>
              </div>
              {sub.score !== null && (
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">分数</p>
                  <p className="text-xl font-black text-indigo-600">{sub.score}</p>
                </div>
              )}
              <Link 
                to={`/submissions/${sub.id}`}
                className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                进入批改
              </Link>
            </div>
          </div>
        ))}
        {submissions.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">暂无学生提交</p>
          </div>
        )}
      </div>
    </div>
  );
};

import { analyzeComposition, extractContentFromMedia, AgentStyle } from './services/geminiService';
import { Image, FileUp, Sparkles, BrainCircuit, MapPin } from 'lucide-react';

const SubmissionCorrection = ({ user }: { user: User }) => {
  const submissionId = window.location.pathname.split('/').pop();
  const [sub, setSub] = useState<Submission | null>(null);
  const [student, setStudent] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number>(85);
  const [message, setMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [agentStyle, setAgentStyle] = useState<AgentStyle>('peach');

  useEffect(() => {
    fetch(`/api/submissions/${submissionId}`)
      .then(res => res.json())
      .then(data => {
        setSub(data);
        setFeedback(data.teacher_feedback || '');
        setScore(data.score || 85);
        setAgentStyle(data.agent_style as AgentStyle || 'peach');
        
        // Fetch student details for memory
        if (data.student_id) {
          fetch(`/api/users/${data.student_id}`)
            .then(r => r.json())
            .then(u => setStudent(u));
        }
      });
  }, [submissionId]);

  const handleSave = async () => {
    await fetch(`/api/submissions/${submissionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        teacher_feedback: feedback, 
        score, 
        status: 'corrected',
        agent_style: agentStyle
      }),
    });
    alert('保存成功');
  };

  const handleAiAssist = async () => {
    if (!sub || !student) return;
    setIsAiLoading(true);
    try {
      const result = await analyzeComposition({
        content: sub.content,
        title: sub.task_title,
        style: agentStyle,
        studentMemory: student.long_term_memory || '暂无历史记录',
        region: student.region || '通用'
      });
      
      if (result) {
        const aiText = `【${agentStyle === 'peach' ? '桃子老师' : '智能'}批改反馈】
评分：${result.score}
优点：
${result.pros.map((p: string) => `· ${p}`).join('\n')}
改进：
${result.cons.map((c: string) => `· ${c}`).join('\n')}

详细建议：
${result.detailedFeedback}`;
        
        setFeedback(aiText);
        setScore(result.score);

        // Update long-term memory
        await fetch(`/api/users/${student.id}/memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ long_term_memory: result.memoryUpdate }),
        });
      }
    } catch (err) {
      alert('AI 分析失败');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await fetch(`/api/submissions/${submissionId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_id: user.id, message }),
    });
    setMessage('');
    // Refresh
    const res = await fetch(`/api/submissions/${submissionId}`);
    setSub(await res.json());
  };

  if (!sub) return <div className="p-8">加载中...</div>;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left: Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{sub.task_title}</h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-slate-500">学生：{sub.student_name}</p>
                <div className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                  <MapPin className="w-3 h-3" />
                  {student?.region || '通用地区'}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
                {(['peach', 'strict', 'encouraging', 'standard'] as AgentStyle[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setAgentStyle(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      agentStyle === s ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {s === 'peach' ? '桃子老师' : s === 'strict' ? '严师' : s === 'encouraging' ? '鼓励' : '标准'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleAiAssist}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAiLoading ? '多智能体协同中...' : 'AI 深度批改'}
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6">
            {student?.long_term_memory && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                <BrainCircuit className="w-5 h-5 text-amber-600 shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">学生长期记忆 (AI 自动同步)</p>
                  <p className="text-sm text-amber-700 leading-relaxed">{student.long_term_memory}</p>
                </div>
              </div>
            )}
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 min-h-[600px] leading-relaxed text-lg text-slate-800 whitespace-pre-wrap font-serif">
              {sub.content}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Feedback & Chat */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 mb-4">批改面板</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">评分 (0-100)</label>
              <input 
                type="number" 
                value={score} 
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">批改建议</label>
              <textarea 
                rows={6}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                placeholder="输入您的批改建议..."
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">沟通记录</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sub.threads?.map((t) => (
              <div key={t.id} className={cn(
                "max-w-[85%] p-3 rounded-2xl text-sm",
                t.sender_role === 'teacher' ? "bg-indigo-600 text-white self-end ml-auto" : "bg-slate-100 text-slate-800"
              )}>
                <p className="font-bold text-[10px] mb-1 opacity-70">{t.sender_name}</p>
                <p>{t.message}</p>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="发送消息..."
                className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button 
                onClick={handleSendMessage}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ user }: { user: User }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/student/dashboard?studentId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      });
  }, []);

  const handleFileUpload = async (taskId: number, type: 'image' | 'doc') => {
    setIsUploading(true);
    // Simulation of file picking and OCR
    try {
      await new Promise(r => setTimeout(r, 1500));
      const mockContent = "这是通过图片/文档提取出的作文内容：\n\n今天我参加了一次非常有意义的志愿活动。在社区里，我帮助老人们打扫卫生，陪他们聊天。虽然身体有些疲惫，但看到老人们开心的笑容，我心里感到无比的充实和快乐。这次活动让我明白了，奉献不仅是帮助他人，更是提升自己。";
      
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_id: taskId, 
          student_id: user.id, 
          content: mockContent,
          submission_type: type
        }),
      });
      
      alert('提交成功！已通过智能工具提取文本。');
      window.location.reload();
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;

  const pendingTasks = tasks.filter(t => !t.submission_status);
  const correctedTasks = tasks.filter(t => t.submission_status === 'corrected');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">你好，{user.name}</h1>
        <p className="text-slate-500 mt-1">今天有 {pendingTasks.length} 个任务待完成</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">待提交任务</h2>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">优先处理</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {pendingTasks.map((task) => (
                <div key={task.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">截止日期</p>
                      <p className="text-sm font-bold text-slate-700">{task.deadline}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      文本提交
                    </button>
                    <button 
                      onClick={() => handleFileUpload(task.id, 'image')}
                      disabled={isUploading}
                      className="px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                      title="图片提交 (支持 OCR)"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleFileUpload(task.id, 'doc')}
                      disabled={isUploading}
                      className="px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                      title="文档提交 (支持解析)"
                    >
                      <FileUp className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-slate-500">所有任务已完成，太棒了！</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">最近反馈</h2>
            <div className="space-y-4">
              {correctedTasks.slice(0, 3).map((task) => (
                <Link 
                  key={task.id} 
                  to={`/submissions/${task.submission_id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                    {task.score}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500">老师已完成批改，点击查看详情</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              成长概览
            </h3>
            <div className="space-y-4">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">平均得分</p>
                <p className="text-3xl font-black mt-1">88.5</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">本月提交</p>
                <p className="text-3xl font-black mt-1">4 篇</p>
              </div>
            </div>
            <Link to="/student/growth" className="block text-center mt-6 text-sm font-bold hover:underline">
              查看详细成长轨迹 →
            </Link>
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              待回复老师
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">张</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">张老师</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">“关于你作文中提到的那个细节，可以再展开说说吗？”</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const StudentGrowth = ({ user }: { user: User }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/student/${user.id}/growth`).then(res => res.json()),
      fetch(`/api/users/${user.id}`).then(res => res.json())
    ]).then(([historyData, userData]) => {
      setHistory(historyData);
      setFullUser(userData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900">成长轨迹</h1>
        <p className="text-slate-500 mt-1">记录你的每一步进步</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-indigo-900">AI 长期记忆 (实时画像)</h2>
          </div>
          <p className="text-indigo-800 leading-relaxed text-lg italic">
            “{fullUser?.long_term_memory || '暂无历史记录'}”
          </p>
          <div className="mt-6 pt-6 border-t border-indigo-100 flex items-center gap-4 text-sm text-indigo-600 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              所在地区：{fullUser?.region || '通用'}
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              画像状态：动态迭代中
            </span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">分数趋势</h2>
          <div className="h-64 w-full bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
            {/* Recharts would go here in a real app */}
            [趋势图表占位：展示历史作文分数变化]
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">阶段性建议</h2>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</div>
                <p className="text-sm text-slate-600">叙事逻辑清晰，能够准确把握文章主旨。</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">!</div>
                <p className="text-sm text-slate-600">词汇量有待提升，建议多阅读经典文学作品。</p>
              </li>
            </ul>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">高频关键词</h2>
            <div className="flex flex-wrap gap-2">
              {['真挚', '生动', '细节丰富', '结构严谨', '感情充沛'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, action: 'login' }),
    });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) return null;

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {user.role === 'teacher' ? (
              <>
                <Route path="/teacher" element={<TeacherDashboard user={user} />} />
                <Route path="/teacher/tasks/:id" element={<TeacherTaskDetail user={user} />} />
                <Route path="/submissions/:id" element={<SubmissionCorrection user={user} />} />
                <Route path="*" element={<Navigate to="/teacher" />} />
              </>
            ) : (
              <>
                <Route path="/student" element={<StudentDashboard user={user} />} />
                <Route path="/student/growth" element={<StudentGrowth user={user} />} />
                <Route path="/submissions/:id" element={<SubmissionCorrection user={user} />} />
                <Route path="*" element={<Navigate to="/student" />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
