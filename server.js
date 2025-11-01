const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch'); // node-fetch v2는 require를 사용해야 합니다.
const helmet = require('helmet'); // helmet 모듈 추가

// 라우터 가져오기
const authRouter = require('./routes/auth/auth');
const signupRouter = require('./routes/auth/signup');
const loginRouter = require('./routes/auth/login');
const reserveRouter = require('./routes/auth/reserve'); // 예약 라우터 추가

// .env 파일 로드
dotenv.config();

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helmet을 사용하여 보안 헤더 설정
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // 인라인 스크립트 허용
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // 인라인 스타일 및 구글 폰트 스타일시트 허용
            fontSrc: ["'self'", "https://fonts.gstatic.com"], // 구글 폰트 소스 허용
            connectSrc: ["'self'", "http://localhost:3000", "https://calendarific.com"], // API 요청 허용
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
app.use('/auth', authRouter);
app.use('/register', signupRouter);
app.use('/login', loginRouter);
app.use('/reserve', reserveRouter); // 예약 라우터 연결

// 기본 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'main.html'));
});

// 예약 페이지 라우트
app.get('/reserve', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reserve.html'));
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
