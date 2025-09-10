require('dotenv').config();

// // 하드코딩된 URL 대신,
// // process.env.DB_URI로 변경하세요.
// const mongoose = require('mongoose');
// const dbURI = process.env.DB_URI; 

// mongoose.connect(dbURI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log('MongoDB에 성공적으로 연결되었습니다.'))
// .catch(err => console.error('MongoDB 연결 오류:', err));

//mysql2 모듈 불러오기(DB와 연결할때 사용)
const mysql = require('mysql2');

//Node.js와 연결
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: "1234",
    database: 'SetakTime'
});

//db 사용하기
db.getConnection((err, conn) => {
    if(err) {
        console.err("DB 연결 실패", err);
    } else {
        console.log("DB 연결 성공");
        conn.release(); //→ 풀에서 가져온 연결을 사용 후 반환
    }
});

// 다른 파일에서 require('./db')로 불러와서 사용 가능
module.exports = db;