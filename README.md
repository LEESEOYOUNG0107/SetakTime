# SetakTime
기숙사 세탁기 예약 서비스
# SetakTime (세탁타임) - 기숙사 세탁기 예약 시스템

이 프로젝트는 기숙사 학생들을 위한 세탁기 예약 및 관리 웹 애플리케이션입니다.

## 주요 기능

*   **학생**: 세탁기 시간대별 예약 및 취소, 마이페이지에서 예약 현황 확인
*   **선생님**: 학생 목록 관리 (계정 정지/삭제), 예약 불가 날짜 설정

---

## 💻 프로젝트 실행 매뉴얼

이 문서는 프로젝트를 로컬 환경에서 설치하고 실행하는 방법을 안내합니다.

### 1. 사전 요구 사항

프로젝트를 실행하기 위해 아래 프로그램들이 컴퓨터에 설치되어 있어야 합니다.

*   **Node.js**: [Node.js 공식 사이트](https://nodejs.org/)에서 LTS 버전을 다운로드하여 설치합니다.
*   **MySQL**: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)를 설치합니다.

### 2. 프로젝트 설치 및 실행

1.  **프로젝트 폴더로 이동**
    터미널(명령 프롬프트 또는 Git Bash)을 열고 아래 명령어를 입력하여 프로젝트 폴더로 이동합니다.
    ```bash
    cd c:\Users\LG\Documents\SetakTime
    ```

2.  **필요한 라이브러리 설치**
    프로젝트에 필요한 모든 라이브러리(express, mysql2 등)를 자동으로 설치합니다.
    ```bash
    npm install
    ```

3.  **웹 서버 실행**
    아래 명령어를 입력하여 웹 서버를 시작합니다.
    ```bash
    node server.js
    ```
    서버가 성공적으로 실행되면 터미널에 `서버 실행 중: http://localhost:3000` 메시지가 나타납니다.

4.  **프로그램 접속**
    웹 브라우저를 열고 주소창에 `http://localhost:3000`을 입력하여 접속합니다.

### 3. 데이터베이스(DB) 설정

MySQL에 접속하여 아래 순서대로 데이터베이스와 테이블을 생성해야 합니다.

1.  **데이터베이스 생성**
    ```sql
    CREATE DATABASE Setaktime DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

2.  **생성한 데이터베이스 사용**
    ```sql
    USE Setaktime;
    ```

3.  **테이블 생성 쿼리 실행**
    아래 SQL 쿼리들을 모두 실행하여 프로젝트에 필요한 테이블들을 생성합니다.

    *   **사용자 정보 테이블 (`information`)**
        ```sql
        CREATE TABLE information (
            userid VARCHAR(50) PRIMARY KEY,
            password VARCHAR(255) NOT NULL,
            username VARCHAR(50) NOT NULL,
            roomnumber INT NOT NULL,
            role ENUM('student', 'teacher') NOT NULL DEFAULT 'student',
            is_suspended BOOLEAN DEFAULT FALSE,
            suspension_end_date DATE
        );
        ```

    *   **예약 정보 테이블 (`reservations`)**
        ```sql
        CREATE TABLE reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userid VARCHAR(50) NOT NULL,
            washer_id INT NOT NULL,
            reservation_date DATE NOT NULL,
            reservation_time TIME NOT NULL,
            FOREIGN KEY (userid) REFERENCES information(userid) ON DELETE CASCADE
        );
        ```

    *   **세탁기 정보 테이블 (`washer`)**
        ```sql
        CREATE TABLE washer (
            washer_id INT PRIMARY KEY
        );
        -- 세탁기 기본 데이터 추가
        INSERT INTO washer (washer_id) VALUES (1), (2), (3);
        ```

    *   **예약 불가 날짜 테이블 (`disabled_dates`)**
        ```sql
        CREATE TABLE disabled_dates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            disabled_date DATE NOT NULL UNIQUE
        );
        ```

### 4. 환경 변수 설정 (`.env` 파일)

프로젝트 최상위 폴더(`c:\Users\LG\Documents\SetakTime`)에 `.env` 라는 이름의 파일을 새로 만들고, 아래 내용을 자신의 환경에 맞게 수정하여 입력합니다.

```
# 데이터베이스 연결 정보
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=Setaktime

# 세션 암호화 키 (아무 영문, 숫자 조합으로 길게 작성)
SESSION_SECRET=a_very_long_and_secret_string_for_session

# Calendarific API 키 (공휴일 정보 로드용 - 선택 사항)
CALENDARIFIC_API_KEY=your_calendarific_api_key
```
> **참고**: `DB_PASSWORD`에는 자신의 MySQL 접속 비밀번호를 입력해야 합니다.

---

모든 설정이 완료되면 `node server.js` 명령어로 서버를 실행하여 프로그램을 사용할 수 있습니다.
