import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('composition.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    phone TEXT UNIQUE,
    wechat_id TEXT UNIQUE,
    name TEXT,
    role TEXT CHECK(role IN ('teacher', 'student')),
    region TEXT DEFAULT '通用',
    grade TEXT,
    long_term_memory TEXT DEFAULT '该学生暂无长期记忆积累。'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    title TEXT,
    description TEXT,
    deadline DATETIME,
    status TEXT DEFAULT 'published',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    student_id INTEGER,
    content TEXT,
    score INTEGER,
    ai_feedback TEXT,
    teacher_feedback TEXT,
    status TEXT DEFAULT 'pending',
    submission_type TEXT DEFAULT 'text',
    file_url TEXT,
    agent_style TEXT DEFAULT 'standard',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS feedback_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER,
    sender_id INTEGER,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(submission_id) REFERENCES submissions(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN grade TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN long_term_memory TEXT DEFAULT '该学生暂无长期记忆积累。'"); } catch(e) {}
try { db.exec("ALTER TABLE submissions ADD COLUMN submission_type TEXT DEFAULT 'text'"); } catch(e) {}
try { db.exec("ALTER TABLE submissions ADD COLUMN file_url TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE submissions ADD COLUMN agent_style TEXT DEFAULT 'standard'"); } catch(e) {}

// Seed initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('teacher1', '123456', '张老师', 'teacher');
  db.prepare('INSERT INTO users (username, password, name, role, region, long_term_memory) VALUES (?, ?, ?, ?, ?, ?)').run(
    'student1', '123456', '小明', 'student', '江苏', '该学生基础扎实，但在描写细腻度上略显不足，喜欢使用成语。'
  );
  db.prepare('INSERT INTO users (username, password, name, role, region, long_term_memory) VALUES (?, ?, ?, ?, ?, ?)').run(
    'student2', '123456', '小红', 'student', '北京', '该学生富有想象力，但文章结构有时不够严谨。'
  );
  
  db.prepare('INSERT INTO tasks (teacher_id, title, description, deadline) VALUES (?, ?, ?, ?)').run(
    1, '我的家乡', '描写家乡的美景或趣事，不少于600字。', '2026-03-01'
  );
  db.prepare('INSERT INTO tasks (teacher_id, title, description, deadline) VALUES (?, ?, ?, ?)').run(
    1, '记一次难忘的活动', '记叙文，要求感情真挚。', '2026-02-25'
  );

  db.prepare('INSERT INTO submissions (task_id, student_id, content, status, score) VALUES (?, ?, ?, ?, ?)').run(
    1, 2, '我的家乡在江南的一个小镇上。那里有清澈的小河，绿油油的稻田，还有我最亲爱的爷爷奶奶。每到春天，油菜花开满大地，金灿灿的一片，美极了...', 'corrected', 92
  );
  db.prepare('INSERT INTO submissions (task_id, student_id, content, status) VALUES (?, ?, ?, ?)').run(
    2, 2, '那是一个阳光明媚的下午，学校组织了一次登山活动。虽然过程很累，但当我站在山顶看到远方的风景时，我明白了坚持的意义...', 'pending'
  );
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth API
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    if (user) {
      res.json({ id: user.id, name: user.name, role: user.role });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  });

  app.post('/api/register', (req, res) => {
    const { username, password, name, role, phone } = req.body;
    try {
      const result = db.prepare('INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)').run(username, password, name, role, phone);
      res.json({ id: result.lastInsertRowid, name, role });
    } catch (err) {
      res.status(400).json({ error: '用户名或手机号已存在' });
    }
  });

  // Mock SMS Code
  const smsCodes = new Map<string, string>();
  app.post('/api/auth/send-code', (req, res) => {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    smsCodes.set(phone, code);
    console.log(`[SMS MOCK] Code for ${phone}: ${code}`);
    res.json({ success: true, message: '验证码已发送（演示环境请查看控制台）' });
  });

  app.post('/api/auth/phone-login', (req, res) => {
    const { phone, code } = req.body;
    if (smsCodes.get(phone) === code) {
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
      let isNewUser = false;
      if (!user) {
        // Auto register as student if not exists
        const result = db.prepare('INSERT INTO users (username, name, role, phone) VALUES (?, ?, ?, ?)').run(`user_${phone}`, '', 'student', phone);
        user = { id: result.lastInsertRowid, name: '', role: 'student' };
        isNewUser = true;
      } else if (!user.name) {
        isNewUser = true;
      }
      res.json({ id: user.id, name: user.name, role: user.role, isNewUser });
    } else {
      res.status(401).json({ error: '验证码错误' });
    }
  });

  app.post('/api/users/:id/profile', (req, res) => {
    const { name, role, region, grade } = req.body;
    try {
      db.prepare('UPDATE users SET name = ?, role = ?, region = ?, grade = ? WHERE id = ?')
        .run(name, role, region, grade, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: '更新失败' });
    }
  });

  // WeChat Mock
  app.get('/api/auth/wechat-qr', (req, res) => {
    res.json({ qr_url: 'https://picsum.photos/200/200?random=wechat', scene_id: 'mock_scene_' + Date.now() });
  });

  app.get('/api/auth/wechat-check', (req, res) => {
    // Mock polling: success after 5 seconds
    const { scene_id } = req.query;
    res.json({ status: 'pending' }); // In real app, check DB for scan event
  });

  // Teacher Tasks API
  app.get('/api/teacher/tasks', (req, res) => {
    const teacherId = req.query.teacherId;
    const tasks = db.prepare(`
      SELECT t.*, 
      (SELECT COUNT(*) FROM submissions WHERE task_id = t.id) as submission_count,
      (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students
      FROM tasks t WHERE teacher_id = ?
      ORDER BY deadline ASC
    `).all(teacherId);
    res.json(tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const { teacher_id, title, description, deadline } = req.body;
    const result = db.prepare('INSERT INTO tasks (teacher_id, title, description, deadline) VALUES (?, ?, ?, ?)').run(teacher_id, title, description, deadline);
    res.json({ id: result.lastInsertRowid });
  });

  // Task Submissions
  app.get('/api/tasks/:id/submissions', (req, res) => {
    const submissions = db.prepare(`
      SELECT s.*, u.name as student_name 
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      WHERE s.task_id = ?
    `).all(req.params.id);
    res.json(submissions);
  });

  // Student Dashboard
  app.get('/api/student/dashboard', (req, res) => {
    const studentId = req.query.studentId;
    const tasks = db.prepare(`
      SELECT t.*, s.status as submission_status, s.score, s.id as submission_id
      FROM tasks t
      LEFT JOIN submissions s ON t.id = s.task_id AND s.student_id = ?
      WHERE t.status = 'published'
      ORDER BY t.deadline ASC
    `).all(studentId);
    res.json(tasks);
  });

  // Submission Detail & Feedback
  app.get('/api/submissions/:id', (req, res) => {
    const submission = db.prepare(`
      SELECT s.*, t.title as task_title, u.name as student_name
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);
    
    const threads = db.prepare(`
      SELECT f.*, u.name as sender_name, u.role as sender_role
      FROM feedback_threads f
      JOIN users u ON f.sender_id = u.id
      WHERE f.submission_id = ?
      ORDER BY f.created_at ASC
    `).all(req.params.id);
    
    res.json({ ...submission, threads });
  });

  app.post('/api/submissions', (req, res) => {
    const { task_id, student_id, content, submission_type } = req.body;
    const result = db.prepare('INSERT INTO submissions (task_id, student_id, content, submission_type) VALUES (?, ?, ?, ?)').run(task_id, student_id, content, submission_type || 'text');
    res.json({ id: result.lastInsertRowid });
  });

  app.post('/api/submissions/:id/feedback', (req, res) => {
    const { teacher_feedback, score, status, agent_style } = req.body;
    db.prepare('UPDATE submissions SET teacher_feedback = ?, score = ?, status = ?, agent_style = ? WHERE id = ?')
      .run(teacher_feedback, score, status, agent_style || 'standard', req.params.id);
    res.json({ success: true });
  });

  app.post('/api/users/:id/memory', (req, res) => {
    const { long_term_memory } = req.body;
    db.prepare('UPDATE users SET long_term_memory = ? WHERE id = ?').run(long_term_memory, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare('SELECT id, username, name, role, region, long_term_memory FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  });

  app.post('/api/submissions/:id/threads', (req, res) => {
    const { sender_id, message } = req.body;
    db.prepare('INSERT INTO feedback_threads (submission_id, sender_id, message) VALUES (?, ?, ?)')
      .run(req.params.id, sender_id, message);
    res.json({ success: true });
  });

  // Growth Data
  app.get('/api/student/:id/growth', (req, res) => {
    const history = db.prepare(`
      SELECT s.score, s.submitted_at, t.title
      FROM submissions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.student_id = ? AND s.status = 'corrected'
      ORDER BY s.submitted_at ASC
    `).all(req.params.id);
    res.json(history);
  });

  // Logs
  app.post('/api/logs', (req, res) => {
    const { user_id, action } = req.body;
    db.prepare('INSERT INTO activity_logs (user_id, action) VALUES (?, ?)').run(user_id, action);
    res.json({ success: true });
  });

  app.get('/api/stats/summary', (req, res) => {
    const stats = {
      activeUsers: db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM activity_logs WHERE timestamp > date('now', '-7 days')").get() as any,
      totalSubmissions: db.prepare("SELECT COUNT(*) as count FROM submissions WHERE submitted_at > date('now', '-7 days')").get() as any,
      avgScore: db.prepare("SELECT AVG(score) as avg FROM submissions WHERE status = 'corrected'").get() as any
    };
    res.json(stats);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
