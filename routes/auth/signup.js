const express = require('express'); //기본 프레임 워크
const bcrypt = require('bcrypt'); //비밀번호 암호화 라이브러리
const db = require('../../db'); //db 연결 객체

//router: 특정 url 경로에 대한 요청들을 그룹화, 관리
const router = express.Router(); //router: 교통정리

router.post('/', async (req, res) => {
  const { userid, password, username, roomnumber } = req.body;//->정보가 담겨있음

  //try..catch: try 실행 시, 문제가 생기면 catch실행
  try {
    //비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    //DB에 사용자 저장
    db.query(
      //새로운 사용자 쿼리문, 순서대로 배열로 들어감
      'INSERT INTO information (userid, password, username, roomnumber) VALUES (?, ?, ?, ?)',
      [userid, hashedPassword, username, roomnumber],
      //await bcrypt.hash() err
      (err) => {
        if(err) {
          console.error(err);
          return res.status(500).json({ message: "회원가입 실패" });
        }
      res.status(201).json({ message: "회원가입 성공" });
      }
    );
    //db.query() err
  } catch (error) {
  res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;