const express = require('express');
const app = express(); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//라우터 파일 가져오기
const signupRouter = require('./routes/auth/signup');
const loginRouter = require('./routes/auth/login');

//라우터 연결하기
app.use('/register', signupRouter);
app.use('/login', loginRouter);

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