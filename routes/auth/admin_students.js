document.addEventListener('DOMContentLoaded', async () => {
    // 0. 현재 로그인된 사용자 정보 가져오기 및 권한 확인
    let currentUser = null;
    try {
        const userStatusResponse = await fetch('http://localhost:3000/api/user-status');
        if (userStatusResponse.ok) {
            currentUser = await userStatusResponse.json();
            if (currentUser.role !== 'teacher') {
                alert('접근 권한이 없습니다.');
                window.location.href = '/';
                return;
            }
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('사용자 정보 확인 중 오류:', error);
        alert('오류가 발생했습니다. 메인 페이지로 이동합니다.');
        window.location.href = '/';
        return;
    }

    // 헤더에 사용자 정보 표시
    const userInfoSpan = document.getElementById('userInfoDisplay');
    if (userInfoSpan) {
        userInfoSpan.textContent = `${currentUser.username} (선생님)`;
    }

    // 로그아웃 버튼 이벤트 리스너
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }

    // 1. 학생 목록 불러오기
    const studentTableBody = document.querySelector('#studentTable tbody');

    async function fetchStudents() {
        try {
            const response = await fetch('http://localhost:3000/admin/students');
            const students = await response.json();

            studentTableBody.innerHTML = ''; // 기존 목록 초기화
            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.userid}</td>
                    <td>${student.username}</td>
                    <td>${student.roomnumber}</td>
                    <td><button data-id="${student.userid}">삭제</button></td>
                `;
                studentTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('학생 목록 로딩 실패:', error);
            studentTableBody.innerHTML = '<tr><td colspan="4">학생 목록을 불러오는 데 실패했습니다.</td></tr>';
        }
    }

    // 학생 삭제 이벤트 리스너
    studentTableBody.addEventListener('click', async (event) => {
        if (event.target.tagName === 'BUTTON' && event.target.dataset.id) {
            const studentId = event.target.dataset.id;
            if (confirm(`'${studentId}' 학생을 정말로 삭제하시겠습니까?`)) {
                // 삭제 로직은 admin.js와 동일
            }
        }
    });

    // 초기 데이터 로드
    fetchStudents();
});