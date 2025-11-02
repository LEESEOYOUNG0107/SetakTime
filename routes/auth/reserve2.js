//reserve2.js (reserve.html에서 js만 따로 뺀 거)
document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    document.getElementById("day").innerHTML = `${month}/${date}`;

    // 시간 표시에 아이콘 추가
    const timeElements = document.querySelectorAll('.date-time-col .time');
    timeElements.forEach(timeEl => {
        const originalText = timeEl.textContent;
        timeEl.innerHTML = `⏰ ${originalText}`;
    });
    
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
        userInfoSpan.innerHTML = `👤 ${currentUser.username} (${currentUser.role === 'student' ? '학생' : '선생님'})`;
    }

    const timeSlots = ['18:00:00', '19:00:00', '20:10:00', '21:20:00'];
    const washerIds = [1, 2, 3];
    const slots = document.querySelectorAll('.slots-grid .slot');

    // 오늘 예약된 모든 호실 번호를 저장할 Set
    let reservedRoomsToday = new Set();

    //예약 현황 업데이트 함수
    async function UpdateReservations() {
        // --- 예약 불가 날짜 확인 로직 추가 ---
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const disabledDatesResponse = await fetch('/reserve/disabled-dates');
            const disabledDates = await disabledDatesResponse.json();
            const slotsGrid = document.querySelector('.slots-grid');
            if (disabledDates.includes(todayStr)) {
                slotsGrid.innerHTML = `<div class="disabled-message" style="grid-column: 1 / -1; text-align: center; color: #ff6b6b; font-size: 16px;">오늘은 관리자에 의해 예약이 불가능한 날입니다.</div>`;
                return; // 예약 불가 날이므로 아래 로직 실행 중단
            }
        } catch (error) {
            console.error('예약 불가 날짜 확인 중 오류:', error);
            // 오류가 발생해도 일단 진행하도록 둘 수 있으나, 사용자에게 알리는 것이 좋을 수 있습니다.
        }
        // --- 로직 추가 끝 ---

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
                slot.className = 'slot available'; // 기본 클래스 설정
                slot.innerHTML = `<span>비어있음</span>`;
                delete slot.dataset.ownerRoom;
                delete slot.dataset.reservationId;
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
                        const targetSlot = slots[slotIndex];
                        const isMyReservation = currentUser && roomNumber && currentUser.roomnumber.toString() === roomNumber.toString();

                        // 기본적으로 '예약됨' 상태로 설정
                        targetSlot.className = 'slot reserved';
                        targetSlot.innerHTML = `<span>${roomNumber ? `${roomNumber}호` : '예약됨'}</span>`;

                        // 내 예약일 경우 특별 스타일 적용
                        if (isMyReservation) {
                            targetSlot.classList.add('my-reservation');
                        }

                        targetSlot.dataset.ownerRoom = roomNumber;
                        targetSlot.dataset.reservationId = reservationId; // 예약 ID를 dataset에 저장

                        // 고정 예약일 경우 스타일 덮어쓰기
                        if(String(reservationId).startsWith('fixed_')){
                            targetSlot.className = 'slot fixed';
                        }
                    }
                }
            });

        } catch (error) {
            console.error('예약 데이터를 불러오는 중 오류가 발생했습니다:', error);
        } finally {
        }
    }

    // 슬롯 클릭 이벤트 리스너 추가
    slots.forEach((slot, index) => {
        slot.addEventListener('click', async (event) => {

            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            
            const timeIndex = Math.floor(index / washerIds.length);
            const machineIndex = index % washerIds.length;
            const machineId = washerIds[machineIndex];
            const timeSlotForConfirm = timeSlots[timeIndex].substring(0, 5); // confirm 창에 표시할 시간 (HH:MM)

            // 이미 예약된 칸을 클릭한 경우
            if (slot.classList.contains('reserved') || slot.classList.contains('fixed') || slot.classList.contains('using')) {
                // 고정 예약(예: 선생님이 설정)인지 먼저 확인
                if (slot.classList.contains('fixed')) {
                    alert(`이 시간은 고정 예약 시간입니다.`);
                    return; 
                }

                // 클릭된 슬롯의 정보 가져오기
                const reservationId = slot.dataset.reservationId;
                const ownerRoom = slot.dataset.ownerRoom;
                const requestedTime = timeSlots[timeIndex];

                // 내 호실의 예약일 경우 (현재 유저의 호실과 예약된 호실이 같음)
                if (slot.classList.contains('my-reservation')) {
                    const requestedDateTime = new Date(`${todayStr}T${requestedTime}`);
                    if (requestedDateTime < new Date()) {
                        alert("이미 지난 시간입니다. 예약을 취소할 수 없습니다.");
                        return;
                    }

                    if (confirm("예약을 취소하시겠습니까?")) {
                        try {
                            const response = await fetch(`/reserve/cancel/${reservationId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Accept': 'application/json' // 서버로부터 JSON 응답을 기대한다고 명시
                                }
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
                const requestedTime = timeSlots[timeIndex];

                const now = new Date();
                const reservationStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0); // 오늘 오전 6시

                // 1. 예약 시간 제한 확인 (오전 6시 이전)
                if (now < reservationStartTime) {
                    alert('예약은 당일 오전 6시부터 가능합니다.');
                    return;
                }
                
                // 2. 이미 지난 시간인지 확인
                if (new Date(`${todayStr}T${requestedTime}`) < now) {
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
                                reservationTime: requestedTime // 'HH:MM' 대신 'HH:MM:SS' 형식으로 전송
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