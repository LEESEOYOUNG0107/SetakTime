const express = require('express');
const app = express();
const path = require('path');
const authRouter = require('./routes/auth/auth');
const signupRouter = require('./routes/auth/signup');
const loginRouter = require('./routes/auth/login');


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('style'));
app.use('/auth', authRouter);
app.use('/register', signupRouter);
app.use('/login', loginRouter);


app.listen(3000, () => {
    console.log('서버 실행 중: http://localhost:3000');
});
