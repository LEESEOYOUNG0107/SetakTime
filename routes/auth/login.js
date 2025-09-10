const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../db');

const router = express.Router();

router.post('/', (req, res) => {
    const { username, password } = req.body;

    //DB에서 username와 일치하는 값 찾기/검색
    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, results) => {
            if(err) return res.status(500).json({ mess: 'DB 오류'});
            //값이 없을떄,
            if (results.length === 0) return res.status(401).json({ mess: '아이디 또는 비밀번호 에러'});

            const user = results[0];

            //입력한 비밀번호와 DB 비밀번호 비교
            const match = await bcrypt.compare(password, user.password); //bcrypt.compare: 비밀번호를 안전하게 비교하는 함수
            if (!match) return res.status(401).json({ mess: '아이디 또는 비밀번호 오류'});

            //로그인 성공시, 세션에 저보 저장, 클라이언트에 성공 알림
            //session: 사용자의 로그인 상태를 유지하기 이ㅜ해 서버에 저장하는 임시 정보 보관소
            req.seesion.user = {id: user.id, username};
            res.json({ message: '로그인 성공'});
        }
    );
});

module.exports = router;
