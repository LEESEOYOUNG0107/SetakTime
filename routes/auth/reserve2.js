//reserve2.js (reserve.html에서 js만 따로 뺀 거)
document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    document.getElementById("day").innerHTML = `${month}/${date}`;
    
    // 현재 로그인된 사용자 정보 가져오기
    let currentUser = null;
    try {
        const response = await fetch('http://localhost:3000/api/user-status');
        if (response.ok) {
            currentUser = await response.json();
        } else {
            // 로그인 안된 상태면 로그인 페이지로 보냄
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('사용자 정보를 가져오는 데 실패했습니다.', error);
        alert('오류가 발생했습니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login.html';
        return;
    }

    // 헤더에 사용자 이름 표시
    const userInfoSpan = document.getElementById('userInfoDisplay');
    if (userInfoSpan) {
        userInfoSpan.textContent = `${currentUser.name} (${currentUser.role})`;
    }

    // 로그아웃 버튼 이벤트 리스너
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }

    const timeSlots = ['18:00', '19:00', '20:10', '21:20'];
    const washerIds = [1, 2, 3];
    const slots = document.querySelectorAll('.slots-grid .slot');
    const mainContainer = document.querySelector('.main-container');

    //예약 현황 업데이트 함수
    async function UpdateReservations() {
        mainContainer.classList.add('loading'); // 로딩 시작
        try {
            // 1. washerIds 배열에 있는 각 세탁기 ID별로 fetch 요청 프로미스(promise) 배열을 만듭니다.
            const promises = washerIds.map(id =>
                fetch(`http://localhost:3000/reserve/washer/${id}`) // 백엔드에 실제 있는 API 호출
            );

            // 2. 모든 API 호출이 (병렬로) 완료될 때까지 기다립니다.
            const responses = await Promise.all(promises);

            // 3. 모든 응답이 'ok'인지 확인하고, 아니면 에러를 발생시킵니다.
            const jsonPromises = responses.map(res => {
                if (!res.ok) {
                    throw new Error(`서버 응답 오류: ${res.status}`);
                }
                return res.json();
            });

            // 4. 모든 JSON 파싱이 완료될 때까지 기다립니다.
            const reservationArrays = await Promise.all(jsonPromises);

            // 5. [[1번세탁기], [2번세탁기]] 처럼 나뉜 배열을 하나의 배열로 합칩니다.
            const allReservations = reservationArrays.flat();

            // 모든 슬롯 초기화
            slots.forEach(slot => {
                slot.textContent = '';
                slot.classList.remove('occupied');
                slot.classList.remove('fixed');
            });

            // 슬롯 업데이트
            allReservations.forEach(reservation => {
                const washerId = reservation.washer_id;
                const reservationTime = reservation.reservation_time.substring(0, 5); // '18:00' 형태로 자름
                const userId = reservation.userid; // 백엔드에서 user_id를 반환해야 함
                const reservationId = reservation.id; // 예약 고유 ID
                const timeIndex = timeSlots.indexOf(reservationTime);
                const machineIndex = washerIds.indexOf(washerId);

                if (timeIndex !== -1 && machineIndex !== -1) {
                    const slotIndex = (timeIndex * washerIds.length) + machineIndex;
                    if (slotIndex < slots.length) {
                        slots[slotIndex].classList.add('occupied');
                        slots[slotIndex].textContent = userId;
                        slots[slotIndex].dataset.ownerId = userId;
                        slots[slotIndex].dataset.reservationId = reservationId; // 예약 ID를 dataset에 저장
                    }
                    if(String(reservationId).startsWith('fixed_')){
                        slots[slotIndex].classList.add('fixed');
                    }
                }
            });

        } catch (error) {
            console.error('예약 데이터를 불러오는 중 오류가 발생했습니다:', error);
        } finally {
            //성공하든 실패하든 로딩을 항상 끝냄
            mainContainer.classList.remove('loading');
        }
    }

    // 슬롯 클릭 이벤트 리스너 추가
    slots.forEach((slot, index) => {
        slot.addEventListener('click', async (event) => {
            const reservationId = slot.dataset.reservationId;
            const ownerId = slot.dataset.ownerId; // 2단계에서 저장한 예약자 ID

            const timeIndex = Math.floor(index / washerIds.length);
            const machineIndex = index % washerIds.length;
            const machineId = washerIds[machineIndex];
            const timeSlot = timeSlots[timeIndex];

            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            const requestedDateTime = new Date(`${todayStr}T${timeSlot}:00`);
            //지난 시간에 예약, 삭제하려 할 때 활용하는 변수. today, timeslot 형식이 다름. timeSlot도 Date 객체로 만들어줌

            // 이미 예약된 칸을 클릭한 경우
            if (slot.classList.contains('occupied')) {
                // 고정 예약인지 먼저 확인
                if (slot.classList.contains('fixed')) {
                    alert(`이 시간은 ${ownerId}호의 고정 예약 시간입니다.`);
                    return; 
                }

                // 내 예약일 경우 (현재 유저 ID와 예약자 ID가 같음)
                if (ownerId === currentUser.id) {
                    // if (requestedDateTime < today) {
                    //     alert("이미 지난 시간입니다. 예약을 취소할 수 없습니다.");
                    //     return;
                    // }

                    if (confirm("예약을 취소하시겠습니까?")) {
                        try {
                            const response = await fetch(`http://localhost:3000/reserve/cancel/${reservationId}`, {
                                method: 'DELETE'
                            });

                            if (response.ok) {
                                const result = await response.json();
                                alert(result.message || '예약이 취소되었습니다.');
                                UpdateReservations(); // 화면 새로고침
                            } else {
                                const errorText = await response.text();
                                alert(`취소 실패: ${errorText}`);
                            }
                        } catch (error) {
                            console.error('예약 취소 오류:', error);
                            alert('예약 취소 중 오류가 발생했습니다.');
                        }
                    }
                } else { // '다른 사람 예약'일 경우 (고정된 예약)
                    alert('이미 예약되었습니다.');
                }

                // 예약하기
            } else {
                // if (requestedDateTime < today) {
                //     alert("이미 지난 시간입니다. 이 시간은 예약할 수 없습니다.");
                //     return;
                // } else 
                if (confirm(`${timeSlot}에 ${machineId}번 세탁기를 예약하시겠습니까?`)) {
                    try {
                        const response = await fetch('http://localhost:3000/reserve/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                washerId: machineId,
                                reservationDate: todayStr,
                                reservationTime: timeSlot
                            }),
                        });

                        if (response.ok) {
                            const result = await response.json();
                            alert(result.message);
                            UpdateReservations(); // 예약 성공 후 화면 업데이트
                        } else {
                            const errorText = await response.text();
                            alert(`예약 실패: ${errorText}`);
                        }
                    } catch (error) {
                        console.error('예약 생성 오류:', error);
                        alert('예약 생성 중 오류가 발생했습니다.');
                    }
                }
            }
        });
    });

    // 페이지 로드 시 예약 현황을 가져와서 UI 업데이트
    UpdateReservations();
});