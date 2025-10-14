const express = require('express');
const router = express.Router();
const path = require('path');

// GET 요청: 로그인 페이지
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/login.html'));
});

// POST 요청: 로그인 처리
router.post('/', (req, res) => {
    const { userid, password } = req.body;
    // DB에서 사용자 확인 후 로그인 처리
    res.send('로그인 시도'); // 나중에 로그인 로직으로 변경
});

module.exports = router;
