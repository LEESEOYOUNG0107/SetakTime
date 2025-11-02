//reserve2.js (reserve.html에서 js만 따로 뺀 거)
document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    document.getElementById("day").innerHTML = `${month}/${date}`;
    
    // 현재 로그인된 사용자 정보 가져오기
    let currentUser = null;
    try {
        const response = await fetch('/api/user-status');
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
        userInfoSpan.textContent = `${currentUser.username} (${currentUser.role})`;
    }

    // 로그아웃 버튼 이벤트 리스너
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }

    const timeSlots = ['18:00:00', '19:00:00', '20:10:00', '21:20:00'];
    const washerIds = [1, 2, 3];
    const slots = document.querySelectorAll('.slots-grid .slot');
    const mainContainer = document.querySelector('.main-container');

    // 오늘 예약된 모든 호실 번호를 저장할 Set
    let reservedRoomsToday = new Set();

    //예약 현황 업데이트 함수
    async function UpdateReservations() {
        mainContainer.classList.add('loading'); // 로딩 시작
        try {
            // 1. washerIds 배열에 있는 각 세탁기 ID별로 fetch 요청 프로미스(promise) 배열을 만듭니다.
            const promises = washerIds.map(id =>
                fetch(`/reserve/washer/${id}`) // 백엔드에 실제 있는 API 호출
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

            // 오늘 예약된 호실 목록을 새로 만들기 전에 초기화
            reservedRoomsToday.clear();

            // 모든 슬롯 초기화
            slots.forEach(slot => {
                slot.textContent = '';
                slot.classList.remove('occupied');
                slot.classList.remove('fixed');
            });

            // 슬롯 업데이트
            allReservations.forEach(reservation => {
                const washerId = reservation.washer_id;
                const reservationTime = reservation.reservation_time; // '18:00:00' 전체 시간 사용
                const roomNumber = reservation.roomnumber; // 백엔드에서 roomnumber를 반환해야 함
                const reservationId = reservation.id; // 예약 고유 ID
                const timeIndex = timeSlots.indexOf(reservationTime);
                const machineIndex = washerIds.indexOf(washerId);

                // 오늘 예약된 호실 목록에 추가
                if (roomNumber) reservedRoomsToday.add(roomNumber.toString());

                if (timeIndex !== -1 && machineIndex !== -1) {
                    const slotIndex = (timeIndex * washerIds.length) + machineIndex;
                    if (slotIndex < slots.length) {
                        slots[slotIndex].classList.add('occupied');
                        slots[slotIndex].textContent = roomNumber ? `${roomNumber}호` : '예약';
                        slots[slotIndex].dataset.ownerRoom = roomNumber;
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

            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            
            // 클릭된 슬롯의 정보 가져오기
            const reservationId = slot.dataset.reservationId;
            const ownerRoom = slot.dataset.ownerRoom;
            const timeIndex = Math.floor(index / washerIds.length);
            const requestedDateTime = new Date(`${todayStr}T${timeSlots[timeIndex]}`); // 'HH:MM:SS' 형식의 시간으로 Date 객체 생성
            //지난 시간에 예약, 삭제하려 할 때 활용하는 변수

            const machineIndex = index % washerIds.length;
            const machineId = washerIds[machineIndex];
            const timeSlotForConfirm = timeSlots[timeIndex].substring(0, 5); // confirm 창에 표시할 시간 (HH:MM)

            // 이미 예약된 칸을 클릭한 경우
            if (slot.classList.contains('occupied')) {
                // 고정 예약(예: 선생님이 설정)인지 먼저 확인
                if (slot.classList.contains('fixed')) {
                    alert(`이 시간은 고정 예약 시간입니다.`);
                    return; 
                }

                // 내 호실의 예약일 경우 (현재 유저의 호실과 예약된 호실이 같음)
                if (ownerRoom && ownerRoom.toString() === currentUser.roomnumber.toString()) {
                    if (requestedDateTime < new Date()) {
                        alert("이미 지난 시간입니다. 예약을 취소할 수 없습니다.");
                        return;
                    }

                    if (confirm("예약을 취소하시겠습니까?")) {
                        try {
                            const response = await fetch(`/reserve/cancel/${reservationId}`, {
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
                } else { // 다른 호실의 예약일 경우
                    alert('이미 예약되었습니다.');
                }

            // 비어있는 칸을 클릭하여 새로 예약하는 경우
            } else {
                const now = new Date();
                const reservationStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0); // 오늘 오전 6시

                // 1. 예약 시간 제한 확인 (오전 6시 이전)
                if (now < reservationStartTime) {
                    alert('예약은 당일 오전 6시부터 가능합니다.');
                    return;
                }

                // 2. 이미 지난 시간인지 확인
                if (requestedDateTime < now) {
                    alert("이미 지난 시간입니다. 이 시간은 예약할 수 없습니다.");
                    return;
                }

                // 3. 현재 사용자의 호실이 오늘 이미 예약했는지 확인
                if (reservedRoomsToday.has(currentUser.roomnumber.toString())) {
                    alert('이미 오늘 예약을 완료했습니다. 하루에 한 번만 예약할 수 있습니다.');
                    return;
                }

                if (confirm(`${timeSlotForConfirm}에 ${machineId}번 세탁기를 예약하시겠습니까?`)) {
                    try {
                        const response = await fetch('/reserve/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                washerId: machineId,
                                reservationDate: todayStr,
                                reservationTime: timeSlots[timeIndex] // 'HH:MM' 대신 'HH:MM:SS' 형식으로 전송
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