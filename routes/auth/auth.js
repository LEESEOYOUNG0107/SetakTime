const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/signup.html'));
});

router.post('/signup', (req, res) => {
    console.log(req.body);  // 브라우저에서 보내는 데이터 확인
    res.send('회원가입 POST 확인 완료');
});

module.exports = router;
