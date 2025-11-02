const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch'); // node-fetch v2는 require를 사용해야 합니다.
const helmet = require('helmet'); // helmet 모듈 추가
const session = require('express-session'); // express-session 모듈 추가

const db = require('./db'); // db.js 파일 불러오기
// 라우터 가져오기
const authRouter = require('./routes/auth/auth');
const signupRouter = require('./routes/auth/signup');
const loginRouter = require('./routes/auth/login');
const reserveRouter = require('./routes/auth/reserve'); // 예약 라우터 추가
const adminRouter = require('./routes/auth/admin_api'); // 관리자 API 라우터 추가

// .env 파일 로드
dotenv.config();

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 세션 미들웨어 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // .env 파일에 SESSION_SECRET을 추가하는 것이 좋습니다.
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: false // 개발 환경에서는 false, 배포 시에는 true로 변경
    }
}));

// Helmet을 사용하여 보안 헤더 설정
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // 인라인 스크립트 및 FullCalendar CDN 허용
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"], // 인라인 스타일, 구글 폰트, FullCalendar CDN 허용
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"], // 구글 폰트 및 인라인 폰트(data:) 소스 허용
            connectSrc: ["'self'", "http://localhost:3000", "https://calendarific.com", "https://v1.hitokoto.cn"], // API 요청 허용
            imgSrc: ["'self'", "data:", "http://localhost:3000"] // 이미지 소스 허용 (data:는 인라인 이미지용)
        },
    })
);

// 정적 파일 제공
// public, style, views 폴더 안의 파일들을 각각의 경로로 제공합니다.
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views'))); // views 폴더를 루트에서 정적 파일로 제공
app.use('/style', express.static(path.join(__dirname, 'style')));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/routes', express.static(path.join(__dirname, 'routes'))); // reserve2.js 같은 파일을 위해 추가

// 라우터 연결

// 접근 제어 미들웨어
const isTeacher = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'teacher') {
        next();
    } else {
        res.status(403).send('선생님 계정으로 로그인해야 접근할 수 있습니다.');
    }
};

app.use('/auth', authRouter);
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/reserve', reserveRouter); // 예약 라우터 연결
app.use('/admin/api', adminRouter); // 관리자 API 라우터 경로 수정

// 기본 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'main.html'));
});

// 예약 페이지 라우트
app.get('/reserve', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reserve.html'));
});

// 마이페이지 라우트
app.get('/mypage', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'mypage.html'));
});

// 관리자 페이지 라우트 (선생님만 접근 가능)
app.get('/admin_students.html', isTeacher, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin_students.html'));
});

app.get('/admin_calendar.html', isTeacher, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin_calendar.html'));
});

// 선생님 계정으로 로그인 시 기본적으로 학생 관리 페이지로 이동
// 또는 /admin 주소로 직접 접근 시 학생 관리 페이지로 리다이렉트
app.get('/admin', isTeacher, (req, res) => {
    res.redirect('/admin_students.html');
});

// 로그인 페이지 라우트
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// 로그아웃 API
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('로그아웃 중 오류가 발생했습니다.');
        }
        res.redirect('/login.html'); // 로그아웃 성공 시 로그인 페이지로 리다이렉트
    });
});

// 현재 사용자 로그인 상태를 반환하는 API
app.get('/api/user-status', async (req, res) => {
    if (req.session.user) {
        try {
            // 세션에 저장된 user 객체에 roomnumber가 없을 수 있으므로 DB에서 최신 정보 조회
            const query = "SELECT userid, username, role, roomnumber FROM information WHERE userid = ?";
            const [results] = await db.query(query, [req.session.user.id]);
            if (results.length === 0) {
                throw new Error('User not found');
            }
            const user = results[0];
            res.status(200).json({ ...user, name: user.username }); // 호환성을 위해 name 속성 추가
        } catch (error) {
            req.session.destroy(); // 오류 발생 시 세션 파기
            return res.status(401).json({ error: 'User not found or DB error' });
        }
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// API 키 읽기
const API_KEY = process.env.CALENDARIFIC_API_KEY;

// 공휴일 API 프록시
app.get('/api/holidays', async (req, res) => {
    const { year } = req.query;
    if (!API_KEY) {
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }
    try {
        const response = await fetch(
            `https://calendarific.com/api/v2/holidays?api_key=${API_KEY}&country=KR&year=${year}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('API 요청 실패:', error);
        res.status(500).json({ error: 'API 요청 실패' });
    }
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
