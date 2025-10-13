const signupRouter = require('./routes/signup.js');
const loginRouter = require('./routes/login.js');
const express = require('express');
const app = express();
const path = require('path');
const authRouter = require('./routes/auth.js'); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('style')); 

//라우터 연결
app.use('/auth', authRouter);

//라우터 연결하기
app.use('/register', signupRouter);
app.use('/login', loginRouter);

app.listen(3000, () => {
  console.log('서버가 포트 3000에서 실행 중입니다.');
});