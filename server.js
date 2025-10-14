// const express = require('express');
// const app = express();
// const path = require('path');

// //라우터 파일 가져오기
// const signupRouter = require('./routes/auth/signup');
// const loginRouter = require('./routes/auth/login');
// const authRouter = require('./routes/auth/auth');
// const reserveRouter = require('./routes/auth/reserve');

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(express.static('style')); 

// app.use('/reserve', (req, res, next) => {
//     // 여기에 임시 사용자 정보를 추가합니다.
//     req.user = {
//         userId: 'temp_user_id', // 임시 사용자 ID
//         username: '테스트사용자' // 임시 사용자 이름
//     };
//     console.log('임시 로그인 미들웨어 작동: 가짜 사용자 정보 추가됨');
//     next(); // 다음 미들웨어 또는 라우터로 요청을 전달
// });

// //라우터 연결
// app.use('/auth', authRouter);

// //라우터 연결하기
// app.use('/register', signupRouter);
// app.use('/login', loginRouter);
// app.use('/reserve', reserveRouter);

// app.listen(3000, () => {
//   console.log('서버가 포트 3000에서 실행 중입니다.');
// });

const express = require('express');
const app = express();
const path = require('path');
const authRouter = require('./routes/auth/auth');
const signupRouter = require('./routes/auth/signup');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('style'));
app.use('/auth', authRouter);
app.use('/register', signupRouter);


app.listen(3000, () => {
    console.log('서버 실행 중: http://localhost:3000');
});
