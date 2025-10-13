const express = require('express');
const app = express(); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//라우터 파일 가져오기
const signupRouter = require('./routes/auth/signup');
const loginRouter = require('./routes/auth/login');
const reserveRouter = require('./routes/auth/reserve');

app.use('/reserve', (req, res, next) => {
    // 여기에 임시 사용자 정보를 추가합니다.
    req.user = {
        userId: 'temp_user_id', // 임시 사용자 ID
        username: '테스트사용자' // 임시 사용자 이름
    };
    console.log('임시 로그인 미들웨어 작동: 가짜 사용자 정보 추가됨');
    next(); // 다음 미들웨어 또는 라우터로 요청을 전달
});

//라우터 연결하기
app.use('/register', signupRouter);
app.use('/login', loginRouter);
app.use('/reserve', reserveRouter);

const PORT = 3000; // 원하는 포트 번호로 변경 가능
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/views/signup.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});