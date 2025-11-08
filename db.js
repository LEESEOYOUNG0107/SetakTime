// 2412_임소영

require('dotenv').config({ path: __dirname + '/.env' }); 
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

require('dotenv').config();

//mysql2 모듈 불러오기(DB와 연결할때 사용)
const mysql = require('mysql2');

//Node.js와 연결
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "Setaktime"
});

//db 사용하기
pool.getConnection((err, conn) => {
    if(err) {
        console.error("DB 연결 실패", err);
    } else {
        console.log("DB 연결 성공");
        conn.release(); //→ 풀에서 가져온 연결을 사용 후 반환
    }
});

const db = pool.promise();

// 다른 파일에서 require('./db')로 불러와서 사용 가능
module.exports = db;