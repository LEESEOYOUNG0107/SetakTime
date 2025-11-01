const express = require('express');
const router = express.Router();
const db = require('../../db'); // DB 연결 불러오기
const bcrypt = require('bcrypt');

// GET 요청: 회원가입 페이지
router.get('/', (req, res) => {
    res.send('회원가입 페이지입니다.');
});

// POST 요청: 회원가입 처리
router.post('/', (req, res) => {
    const { userid, password, username, roomnumber } = req.body;    
    const saltRounds = 10; // 해싱 복잡도 설정

    // 비밀번호 해싱
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error('비밀번호 해싱 중 오류:', err);
            return res.status(500).send('서버 처리 중 오류가 발생했습니다.');
        }

        const sql = 'INSERT INTO information (userid, password, username, roomnumber) VALUES (?, ?, ?, ?)';
        db.query(sql, [userid, hashedPassword, username, roomnumber], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).send('이미 사용 중인 아이디입니다.');
                }
                console.error('회원가입 중 오류:', err);
                return res.status(500).send('회원가입 중 알 수 없는 오류가 발생했습니다.');
            }

            res.send('success'); // 회원가입 성공 시 'success' 응답 전송
        });
    });
});

module.exports = router;
