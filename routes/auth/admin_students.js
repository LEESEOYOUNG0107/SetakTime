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
            const response = await fetch('http://localhost:3000/admin/api/students');
            const students = await response.json();

            studentTableBody.innerHTML = ''; // 기존 목록 초기화
            students.forEach(student => {
                const row = document.createElement('tr');
                
                let suspensionStatus = '';
                if (student.is_suspended) {
                    const endDate = new Date(student.suspension_end_date);
                    const today = new Date();
                    if (endDate >= today) {
                        row.classList.add('suspended'); // 정지된 학생 스타일 적용
                        suspensionStatus = ` (정지: ${endDate.toLocaleDateString('ko-KR')}까지)`;
                    }
                }

                row.innerHTML = `
                    <td>${student.userid}</td>
                    <td>${student.username}${suspensionStatus}</td>
                    <td>${student.roomnumber}</td>
                    <td><button class="suspend-btn" data-id="${student.userid}">정지</button> <button class="delete-btn" data-id="${student.userid}">삭제</button></td>
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
        const studentId = event.target.dataset.id;
        if (!studentId) return;

        // 정지 버튼 클릭
        if (event.target.classList.contains('suspend-btn')) {
            const days = prompt(`'${studentId}' 학생을 몇 일 동안 정지시키겠습니까?`);
            if (days && !isNaN(days) && parseInt(days) > 0) {
                try {
                    const response = await fetch(`http://localhost:3000/admin/api/students/${studentId}/suspend`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days: parseInt(days) })
                    });
                    const resultText = await response.text();
                    alert(resultText);
                    if (response.ok) {
                        fetchStudents(); // 목록 새로고침
                    }
                } catch (error) {
                    console.error('학생 정지 처리 실패:', error);
                    alert('학생 정지 처리 중 오류가 발생했습니다.');
                }
            } else if (days !== null) { // 사용자가 취소 누른게 아니라면
                alert('정지일수는 1 이상의 숫자로 입력해주세요.');
            }
        }
        // 삭제 버튼 클릭
        else if (event.target.classList.contains('delete-btn')) {
            if (confirm(`'${studentId}' 학생을 정말로 삭제하시겠습니까?`)) {
                try {
                    const response = await fetch(`http://localhost:3000/admin/api/students/${studentId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        alert('학생이 삭제되었습니다.');
                        fetchStudents(); // 목록 새로고침
                    } else {
                        const errorText = await response.text();
                        alert(`삭제 실패: ${errorText}`);
                    }
                } catch (error) {
                    console.error('학생 삭제 실패:', error);
                    alert('학생 삭제 중 오류가 발생했습니다.');
                }
            }
        }
    });

    // 초기 데이터 로드
    fetchStudents();
});