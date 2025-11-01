// // const express = require('express');
// // const router = express.Router();

// // // GET 요청: 회원가입 페이지
// // router.get('/', (req, res) => {
// //     res.send('회원가입 페이지입니다.');
// // });

// // // POST 요청: 회원가입 처리
// // router.post('/', (req, res) => {
// //     console.log(req.body);
// //     res.send('회원가입 완료');
// // });

// // module.exports = router;

// const express = require('express');
// const router = express.Router();
// const path = require('path');
// const db = require('../../db'); // db.js 연결 (DB 설정 파일)
// const bcrypt = require('bcrypt'); // 비밀번호 암호화용

// // GET 요청: 회원가입 페이지
// router.get('/', (req, res) => {
//     // 나중에 signup.html 파일이 있다면 아래처럼 파일로 응답 가능
//     // res.sendFile(path.join(__dirname, '../../views/signup.html'));
//     res.send('회원가입 페이지입니다.');
// });

// // POST 요청: 회원가입 처리
// router.post('/', async (req, res) => {
//     const { userid, password, username, roomnumber } = req.body;

//     try {
//         // 1️⃣ 비밀번호 암호화
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // 2️⃣ DB에 새 사용자 추가
//         const sql = 'INSERT INTO information (userid, password, username, roomnumber) VALUES (?, ?, ?, ?)';
//         db.query(sql, [userid, hashedPassword, username, roomnumber], (err, result) => {
//             if (err) {
//                 console.error('회원가입 오류:', err);
//                 return res.status(500).send('회원가입 실패 😢');
//             }

//             console.log('회원가입 성공:', result);
//             res.send('🎉 회원가입 성공! 로그인 페이지로 이동하세요.');
//         });
//     } catch (error) {
//         console.error('서버 오류:', error);
//         res.status(500).send('서버 오류 발생 😢');
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../../db'); // DB 연결 불러오기

// GET 요청: 회원가입 페이지
router.get('/', (req, res) => {
    res.send('회원가입 페이지입니다.');
});

// POST 요청: 회원가입 처리
// router.post('/', (req, res) => {
//     const { userid, password, username, roomnumber } = req.body;

//     // SQL 쿼리 실행
//     const sql = 'INSERT INTO information (userid, password, username, roomnumber) VALUES (?, ?, ?, ?)';
//     db.query(sql, [userid, password, username, roomnumber], (err, result) => {
//         if (err) {
//             console.error('회원가입 중 오류:', err);
//             return res.status(500).send('DB 오류 발생');
//         }
//         console.log('회원가입 성공:', result);
//         res.send('회원가입 완료!');
//     });
// });

router.post('/', (req, res) => {
    const { userid, password, username, roomnumber } = req.body;

    const sql = 'INSERT INTO information (userid, password, username, roomnumber) VALUES (?, ?, ?, ?)';
    db.query(sql, [userid, password, username, roomnumber], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).send('이미 사용 중인 아이디입니다.');
            }
            console.error('회원가입 중 오류:', err);
            return res.status(500).send('회원가입 중 알 수 없는 오류가 발생했습니다.');
        }

    });
});

module.exports = router;
