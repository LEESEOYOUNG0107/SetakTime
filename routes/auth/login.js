const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../../db');

// GET 요청: 로그인 페이지
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/login.html'));
});

// POST 요청: 로그인 처리
router.post('/', (req, res) => {
    const { userid, password } = req.body;

    // DB에서 사용자 확인
    const sql = 'SELECT * FROM information WHERE userid = ? AND password = ?';
    db.query(sql, [userid, password], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('DB 오류 발생');
        }

        if (result.length > 0) {
            // 로그인 성공
            res.send('success');
        } else {
            res.send('fail');
        }
    });
});


module.exports = router;
